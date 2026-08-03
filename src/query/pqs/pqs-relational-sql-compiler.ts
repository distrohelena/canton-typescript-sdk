import { PqsRelation, PqsRelationMetadata, PqsSchemaProfileV1, pqsRelationMetadata } from "./pqs-schema-profile.js";
import { pqsRelationEdges } from "./pqs-schema-profile.js";
import type { NormalizedFindManyQuery, NormalizedGroupByQuery } from "../canonical/query-ast.js";
import { canonicalFindManyArgs, canonicalGroupByArgs } from "./pqs-sql-compiler.js";

export interface CompiledPqsRelationQuery {
    readonly text: string;
    readonly values: readonly unknown[];
}

interface RelationFindManyArgs {
    readonly where?: Readonly<Record<string, unknown>>;
    readonly select?: Readonly<Record<string, boolean>>;
    readonly orderBy?: readonly Readonly<Record<string, "asc" | "desc">>[];
    readonly take?: number;
    readonly skip?: number;
}

export function compilePqsRelationFindMany(
    relation: PqsRelation,
    query: NormalizedFindManyQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationQuery {
    const args = canonicalFindManyArgs(query) as RelationFindManyArgs;
    assertPage(args);
    const metadata = pqsRelationMetadata[relation];
    const values: unknown[] = [];
    const add = (value: unknown) => {
        values.push(value);
        return `$${values.length}`;
    };
    const fields = selectedFields(relation, metadata, args.select);
    const where = compileWhere(relation, metadata, args.where, add);
    const orderBy = compileOrderBy(relation, metadata, args.orderBy);
    const limit = args.take === undefined ? "" : ` limit ${add(args.take)}`;
    const offset = args.skip === undefined ? "" : ` offset ${add(args.skip)}`;

    return {
        text: `select ${fields.map(([field, column]) => `"${column}" as "${field}"`).join(", ")} from ${profile.relation(relation)}${where}${orderBy}${limit}${offset}`,
        values,
    };
}

export function compilePqsRelationGroupBy(
    relation: PqsRelation,
    query: NormalizedGroupByQuery,
    profile: PqsSchemaProfileV1,
    parameterOffset = 0,
): CompiledPqsRelationQuery {
    const args = canonicalGroupByArgs(query) as { readonly by: readonly unknown[]; readonly aggregate: { readonly count?: true; readonly min?: readonly string[]; readonly max?: readonly string[]; readonly sum?: readonly string[] } };
    if (args.by.length === 0 || (!args.aggregate.count && !args.aggregate.min && !args.aggregate.max && !args.aggregate.sum)) throw new Error("groupBy requires a key and aggregate");
    const metadata = pqsRelationMetadata[relation];
    const root = relation === "__events" ? "event" : "root";
    const joins: string[] = [];
    const expressions: string[] = [];
    const selected: string[] = [];
    const values: unknown[] = [];
    const add = (value: unknown) => { values.push(value); return `$${parameterOffset + values.length}`; };
    for (const key of args.by) {
        if (typeof key === "string") {
            const column = field(relation, metadata, key);
            const expression = metadata.arrayFields.includes(key)
                ? `"${key}".value`
                : `"${root}"."${column}"`;
            if (metadata.arrayFields.includes(key)) joins.push(`cross join lateral unnest("${root}"."${column}") as "${key}"(value)`);
            expressions.push(expression);
            selected.push(`${expression} as "${key}"`);
            continue;
        }
        if (key === null || typeof key !== "object") throw new Error("invalid group key");
        const [edgeName, nested] = Object.entries(key as Record<string, unknown>)[0] ?? [];
        if (nested !== null && typeof nested === "object" && "name" in nested && "path" in nested && "as" in nested) {
            const projection = nested as { readonly name: unknown; readonly path: unknown; readonly as: unknown };
            if (typeof projection.name !== "string" || !Array.isArray(projection.path) || !projection.path.every((segment) => typeof segment === "string" && segment.length > 0) || !["text", "numeric", "boolean", "timestamp"].includes(String(projection.as)) || !PqsSchemaProfileV1.jsonField(relation, edgeName)) throw new Error("invalid profiled JSON group key");
            const column = field(relation, metadata, edgeName);
            const text = `"${root}"."${column}" #>> ${add(projection.path)}::text[]`;
            const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            expressions.push(expression);
            selected.push(`${expression} as "${projection.name}"`);
            continue;
        }
        if (nested !== null && typeof nested === "object" && "bucket" in nested && PqsSchemaProfileV1.bucketField(relation, edgeName)) {
            const bucket = (nested as { bucket?: unknown }).bucket;
            if (typeof bucket !== "string" || !["hour", "day", "week", "month"].includes(bucket)) throw new Error("invalid profiled time bucket");
            const column = field(relation, metadata, edgeName);
            const expression = `date_trunc('${bucket}', "${root}"."${column}")`;
            expressions.push(expression);
            selected.push(`${expression} as "${edgeName}_${bucket}"`);
            continue;
        }
        const edge = pqsRelationEdges[relation]?.[edgeName];
        if (edge === undefined || edge.cardinality !== "one" || nested === null || typeof nested !== "object") throw new Error("group key must follow a profiled to-one edge");
        const [fieldName, bucketValue] = Object.entries(nested as Record<string, unknown>)[0] ?? [];
        const bucket = bucketValue !== null && typeof bucketValue === "object" ? (bucketValue as { bucket?: unknown }).bucket : undefined;
        if (typeof bucket !== "string" || !["hour", "day", "week", "month"].includes(bucket) || !PqsSchemaProfileV1.bucketField(edge.target, fieldName)) throw new Error("invalid profiled time bucket");
        const targetColumn = field(edge.target, pqsRelationMetadata[edge.target], fieldName);
        joins.push(`join ${profile.relation(edge.target)} "${edgeName}" on "${edgeName}"."${edge.targetColumn}" = "${root}"."${edge.sourceColumn}"`);
        const expression = `date_trunc('${bucket}', "${edgeName}"."${targetColumn}")`;
        expressions.push(expression);
        selected.push(`${expression} as "${edgeName}_${fieldName}_${bucket}"`);
    }
    if (args.aggregate.count) selected.push("count(*)::text as count");
    for (const [operation, fields] of [["min", args.aggregate.min], ["max", args.aggregate.max], ["sum", args.aggregate.sum]] as const) for (const name of fields ?? []) {
        if (!metadata.numericFields.includes(name)) throw new Error(`${name} is not a numeric aggregate field of ${relation}`);
        selected.push(`${operation}("${root}"."${field(relation, metadata, name)}")::text as "${operation}_${name}"`);
    }
    return { text: `select ${selected.join(", ")} from ${profile.relation(relation)} "${root}" ${joins.join(" ")} group by ${expressions.join(", ")}`, values };
}

function selectedFields(relation: PqsRelation, metadata: PqsRelationMetadata, select: RelationFindManyArgs["select"]): readonly (readonly [string, string])[] {
    const fields = select === undefined
        ? Object.entries(metadata.fields)
        : Object.entries(select).filter(([, enabled]) => enabled).map(([name]) => [name, field(relation, metadata, name)] as const);
    if (fields.length === 0) throw new Error("select must include at least one field");
    return fields;
}

function compileWhere(relation: PqsRelation, metadata: PqsRelationMetadata, where: RelationFindManyArgs["where"], add: (value: unknown) => string): string {
    const conditions: string[] = [];
    for (const [name, value] of Object.entries(where ?? {})) {
        const column = field(relation, metadata, name);
        if (value === null || Array.isArray(value) || typeof value !== "object") throw new Error(`${name} must be a filter`);
        const filter = value as Readonly<Record<string, unknown>>;
        for (const [operator, operand] of Object.entries(filter)) {
            if (operator === "equals") conditions.push(`"${column}" = ${add(operand)}`);
            else if (operator === "in" && Array.isArray(operand)) conditions.push(operand.length === 0 ? "false" : `"${column}" = any(${add(operand)})`);
            else if (operator === "is" && operand === null) conditions.push(`"${column}" is null`);
            else if (operator === "isNot" && operand === null) conditions.push(`"${column}" is not null`);
            else if (["lt", "lte", "gt", "gte", "like", "ilike"].includes(operator)) {
                const sql = ({ lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as const)[operator as "lt" | "lte" | "gt" | "gte" | "like" | "ilike"];
                conditions.push(`"${column}" ${sql} ${add(operand)}`);
            } else throw new Error(`${operator} is not supported for ${name}`);
        }
    }
    return conditions.length === 0 ? "" : ` where ${conditions.join(" and ")}`;
}

function compileOrderBy(relation: PqsRelation, metadata: PqsRelationMetadata, orderBy: RelationFindManyArgs["orderBy"]): string {
    if (orderBy === undefined) return "";
    const requested = orderBy.flatMap((entry) => Object.entries(entry));
    if (requested.length === 0 || requested.some(([, direction]) => direction !== "asc" && direction !== "desc")) throw new Error("orderBy must be a non-empty list of one-field entries");
    const ordered = requested.map(([name, direction]) => [field(relation, metadata, name), direction] as const);
    const stableKey = metadata.uniqueKeys[0]?.[0];
    if (stableKey !== undefined && !ordered.some(([column]) => column === metadata.fields[stableKey])) ordered.push([metadata.fields[stableKey], "asc"]);
    return ` order by ${ordered.map(([column, direction]) => `"${column}" ${direction}`).join(", ")}`;
}

function field(relation: PqsRelation, metadata: PqsRelationMetadata, name: string): string {
    const column = metadata.fields[name];
    if (column === undefined) throw new Error(`${name} is not a field of ${relation}`);
    return column;
}

function assertPage(args: RelationFindManyArgs): void {
    for (const [name, value] of [["take", args.take], ["skip", args.skip]] as const) if (value !== undefined && (!Number.isInteger(value) || value < 0)) throw new Error(`${name} must be a non-negative integer`);
}
