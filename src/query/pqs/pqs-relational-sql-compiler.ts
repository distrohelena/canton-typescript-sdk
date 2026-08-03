import { PqsRelation, PqsRelationMetadata, PqsSchemaProfileV1, pqsRelationMetadata } from "./pqs-schema-profile.js";
import { pqsRelationEdges } from "./pqs-schema-profile.js";
import type { NormalizedAggregateQuery, NormalizedCountQuery, NormalizedFindManyQuery, NormalizedGroupByQuery, NormalizedInclude, NormalizedSelection } from "../canonical/query-ast.js";
import { compileCanonicalPhysicalIncludes, compileCanonicalPhysicalPredicate } from "./pqs-sql-compiler.js";

export interface CompiledPqsRelationQuery {
    readonly text: string;
    readonly values: readonly unknown[];
}

export interface CompiledPqsRelationFindManyQuery extends CompiledPqsRelationQuery {
    readonly resultShape: PqsRelationResultShape;
}

export interface PqsSelectedScalarField {
    readonly name: string;
}

export interface PqsJsonResultProjection {
    readonly name: string;
    readonly field: string;
    readonly path: readonly string[];
    readonly as: "text" | "numeric" | "boolean" | "timestamp";
}

export interface PqsIncludedResultShape {
    readonly edge: string;
    readonly target: PqsRelation;
    readonly cardinality: "one" | "many";
    readonly shape: PqsRelationResultShape;
}

export interface PqsRelationResultShape {
    readonly relation: PqsRelation;
    readonly cardinality: "one" | "many";
    readonly fields: readonly PqsSelectedScalarField[];
    readonly json: readonly PqsJsonResultProjection[];
    readonly includes: readonly PqsIncludedResultShape[];
}

export function compilePqsRelationFindMany(
    relation: PqsRelation,
    query: NormalizedFindManyQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationFindManyQuery {
    assertCanonicalPhysicalFindMany(relation, query);
    const metadata = pqsRelationMetadata[relation];
    const values: unknown[] = [];
    const add = (value: unknown) => {
        values.push(value);
        return `$${values.length}`;
    };
    const fields = selectedCanonicalFields(relation, metadata, query.select?.fields, (query.select?.json.length ?? 0) > 0);
    const predicate = query.predicate === undefined ? "" : compileCanonicalPhysicalPredicate(relation, query.predicate, "", profile, add);
    const where = predicate.length === 0 ? "" : ` where ${predicate}`;
    const orderBy = compileCanonicalOrderBy(relation, metadata, query.orderBy);
    const limit = query.take === undefined ? "" : ` limit ${add(query.take)}`;
    const offset = query.skip === 0 ? "" : ` offset ${add(query.skip)}`;
    const included = compileCanonicalPhysicalIncludes(relation, profile.relation(relation), query.includes, profile, add);
    const json = compileCanonicalJsonSelections(relation, query.select, add);
    const shape = compileResultShape(relation, "many", query.select, query.includes);

    return {
        text: `select ${[...fields.map(([field, column]) => `"${column}" as "${field}"`), ...json, ...included].join(", ")} from ${profile.relation(relation)}${where}${orderBy}${limit}${offset}`,
        values,
        resultShape: shape,
    };
}

export function compilePqsRelationCount(
    relation: PqsRelation,
    query: NormalizedCountQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationQuery {
    assertCanonicalPhysicalQuery(relation, query, "count");
    const values: unknown[] = [];
    const add = (value: unknown) => {
        values.push(value);
        return `$${values.length}`;
    };
    const predicate = query.predicate === undefined ? "" : ` where ${compileCanonicalPhysicalPredicate(relation, query.predicate, "", profile, add)}`;

    return { text: `select count(*)::text as count from ${profile.relation(relation)}${predicate}`, values };
}

export function compilePqsRelationAggregate(
    relation: PqsRelation,
    query: NormalizedAggregateQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationQuery {
    assertCanonicalPhysicalQuery(relation, query, "aggregate");
    const metadata = pqsRelationMetadata[relation];
    const values: unknown[] = [];
    const add = (value: unknown) => {
        values.push(value);
        return `$${values.length}`;
    };
    const selected: string[] = [];
    if (query.aggregates.count) selected.push("count(*)::text as count");
    for (const [operation, fields] of [["min", query.aggregates.min], ["max", query.aggregates.max], ["sum", query.aggregates.sum]] as const) {
        for (const name of fields) {
            if (!metadata.numericFields.includes(name)) throw new Error(`${name} is not a numeric aggregate field of ${relation}`);
            selected.push(`${operation}("${field(relation, metadata, name)}")::text as "${operation}_${name}"`);
        }
    }
    if (selected.length === 0) throw new Error("aggregate must request at least one result");
    const predicate = query.predicate === undefined ? "" : ` where ${compileCanonicalPhysicalPredicate(relation, query.predicate, "", profile, add)}`;

    return { text: `select ${selected.join(", ")} from ${profile.relation(relation)}${predicate}`, values };
}

export function compilePqsRelationGroupBy(
    relation: PqsRelation,
    query: NormalizedGroupByQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationQuery {
    assertCanonicalPhysicalQuery(relation, query, "groupBy");
    if (query.by.length === 0 || (!query.aggregates.count && query.aggregates.min.length === 0 && query.aggregates.max.length === 0 && query.aggregates.sum.length === 0)) throw new Error("groupBy requires a key and aggregate");
    const metadata = pqsRelationMetadata[relation];
    const root = relation === "__events" ? "event" : "root";
    const joins: string[] = [];
    const expressions: string[] = [];
    const selected: string[] = [];
    const values: unknown[] = [];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const predicate = query.predicate === undefined ? "" : ` where ${compileCanonicalPhysicalPredicate(relation, query.predicate, `"${root}"`, profile, add)}`;
    for (const key of query.by) {
        if (key.kind === "field") {
            const fieldName = key.path[0];
            const column = field(relation, metadata, fieldName);
            const expression = metadata.arrayFields.includes(fieldName)
                ? `"${fieldName}".value`
                : `"${root}"."${column}"`;
            if (metadata.arrayFields.includes(fieldName)) joins.push(`cross join lateral unnest("${root}"."${column}") as "${fieldName}"(value)`);
            expressions.push(expression);
            selected.push(`${expression} as "${fieldName}"`);
            continue;
        }
        if (key.kind === "json") {
            const column = field(relation, metadata, key.field);
            const text = `"${root}"."${column}" #>> ${add(key.path)}::text[]`;
            const expression = key.as === "text" ? text : key.as === "numeric" ? `(${text})::numeric` : key.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            expressions.push(expression);
            selected.push(`${expression} as "${key.name}"`);
            continue;
        }
        if (key.kind === "bucket" && key.path.length === 1) {
            const column = field(relation, metadata, key.path[0]);
            const expression = `date_trunc('${key.bucket}', "${root}"."${column}")`;
            expressions.push(expression);
            selected.push(`${expression} as "${key.path[0]}_${key.bucket}"`);
            continue;
        }
        const edgeName = key.path[0];
        const fieldName = key.path[1];
        const edge = pqsRelationEdges[relation]?.[edgeName];
        if (edge === undefined || edge.cardinality !== "one") throw new Error("group key must follow a profiled to-one edge");
        const targetColumn = field(edge.target, pqsRelationMetadata[edge.target], fieldName);
        joins.push(`join ${profile.relation(edge.target)} "${edgeName}" on "${edgeName}"."${edge.targetColumn}" = "${root}"."${edge.sourceColumn}"`);
        const expression = `date_trunc('${key.bucket}', "${edgeName}"."${targetColumn}")`;
        expressions.push(expression);
        selected.push(`${expression} as "${edgeName}_${fieldName}_${key.bucket}"`);
    }
    if (query.aggregates.count) selected.push("count(*)::text as count");
    for (const [operation, fields] of [["min", query.aggregates.min], ["max", query.aggregates.max], ["sum", query.aggregates.sum]] as const) for (const name of fields) {
        if (!metadata.numericFields.includes(name)) throw new Error(`${name} is not a numeric aggregate field of ${relation}`);
        selected.push(`${operation}("${root}"."${field(relation, metadata, name)}")::text as "${operation}_${name}"`);
    }
    return { text: `select ${selected.join(", ")} from ${profile.relation(relation)} "${root}"${joins.length === 0 ? "" : ` ${joins.join(" ")}`}${predicate} group by ${expressions.join(", ")}`, values };
}

function selectedCanonicalFields(relation: PqsRelation, metadata: PqsRelationMetadata, selected: readonly string[] | undefined, allowEmpty = false): readonly (readonly [string, string])[] {
    const fields = selected === undefined ? Object.entries(metadata.fields) : selected.map((name) => [name, field(relation, metadata, name)] as const);
    if (fields.length === 0 && !allowEmpty) throw new Error("select must include at least one field");
    return fields;
}

function compileCanonicalJsonSelections(relation: PqsRelation, selection: NormalizedSelection | undefined, add: (value: unknown) => string): readonly string[] {
    return (selection?.json ?? []).map((projection) => {
        if (!PqsSchemaProfileV1.jsonField(relation, projection.field)) throw new Error(`${projection.field} is not a JSON field of ${relation}`);
        const column = field(relation, pqsRelationMetadata[relation], projection.field);
        const text = `"${column}" #>> ${add(projection.path)}::text[]`;
        const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
        return `${expression} as "${projection.name}"`;
    });
}

function compileResultShape(relation: PqsRelation, cardinality: "one" | "many", selection: NormalizedSelection | undefined, includes: readonly NormalizedInclude[]): PqsRelationResultShape {
    const fields = relation === "__contracts"
        ? selection?.fields ?? ["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"]
        : selection?.fields ?? Object.keys(pqsRelationMetadata[relation].fields);
    const shape: PqsRelationResultShape = {
        relation,
        cardinality,
        fields: fields.map((name) => Object.freeze({ name })),
        json: (selection?.json ?? []).map((projection) => Object.freeze({ ...projection, path: Object.freeze([...projection.path]) })),
        includes: includes.map((include) => {
            const edge = pqsRelationEdges[relation]?.[include.edge];
            if (edge === undefined || edge.target !== relationForCanonical(include.relation) || edge.cardinality !== include.cardinality) throw new Error(`Invalid canonical include ${include.edge}`);
            return Object.freeze({ edge: include.edge, target: edge.target, cardinality: include.cardinality, shape: compileResultShape(edge.target, include.cardinality, include.select, include.includes) });
        }),
    };
    return freezeResultShape(shape);
}

function freezeResultShape(shape: PqsRelationResultShape): PqsRelationResultShape {
    Object.freeze(shape.fields);
    Object.freeze(shape.json);
    Object.freeze(shape.includes);
    return Object.freeze(shape);
}

function compileCanonicalOrderBy(relation: PqsRelation, metadata: PqsRelationMetadata, orderBy: NormalizedFindManyQuery["orderBy"]): string {
    if (orderBy.length === 0) return "";
    return ` order by ${orderBy.map((order) => `"${field(relation, metadata, order.path[0])}" ${order.direction}`).join(", ")}`;
}

function field(relation: PqsRelation, metadata: PqsRelationMetadata, name: string): string {
    const column = metadata.fields[name];
    if (column === undefined) throw new Error(`${name} is not a field of ${relation}`);
    return column;
}

function assertCanonicalPhysicalFindMany(relation: PqsRelation, query: NormalizedFindManyQuery): void {
    if (query === null || typeof query !== "object" || query.kind !== "findMany" || !Array.isArray(query.includes) || !Array.isArray(query.orderBy)) {
        throw new Error("compilePqsRelationFindMany requires a canonical findMany query");
    }
    if (relationForCanonical(query.relation) !== relation) throw new Error(`Canonical relation ${query.relation} does not match ${relation}`);
}

function assertCanonicalPhysicalQuery(
    relation: PqsRelation,
    query: { readonly kind: string; readonly relation: string },
    kind: "count" | "aggregate" | "groupBy",
): void {
    if (query === null || typeof query !== "object" || query.kind !== kind) {
        throw new Error(`compilePqsRelation${kind[0].toUpperCase()}${kind.slice(1)} requires a canonical ${kind} query`);
    }
    if (relationForCanonical(query.relation) !== relation) throw new Error(`Canonical relation ${query.relation} does not match ${relation}`);
}

function relationForCanonical(relation: string): PqsRelation | undefined {
    return ({ contracts: "__contracts", contractTypes: "__contract_tpe", events: "__events", exercises: "__exercises", exerciseTypes: "__exercise_tpe", packages: "__packages", transactions: "__transactions", watermark: "__watermark" } as const)[relation as "contracts" | "contractTypes" | "events" | "exercises" | "exerciseTypes" | "packages" | "transactions" | "watermark"];
}
