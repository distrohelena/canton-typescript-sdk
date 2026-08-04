import { PqsRelation, PqsRelationMetadata, PqsSchemaProfileV1, pqsRelationMetadata } from "./pqs-schema-profile.js";
import { pqsRelationEdges } from "./pqs-schema-profile.js";
import type { NormalizedAggregateQuery, NormalizedCountQuery, NormalizedFindManyQuery, NormalizedGroupByQuery, NormalizedInclude, NormalizedSelection } from "../canonical/query-ast.js";
import { compileCanonicalPhysicalField, compileCanonicalPhysicalIncludes, compileCanonicalPhysicalPredicate } from "./pqs-sql-compiler.js";
import { quotePqsIdentifier } from "./pqs-sql-syntax.js";
import { compilePqsResultShape, type PqsIncludedResultShape, type PqsJsonResultProjection, type PqsRelationResultShape, type PqsSelectedScalarField } from "./pqs-result-shape.js";

export type { PqsIncludedResultShape, PqsJsonResultProjection, PqsRelationResultShape, PqsSelectedScalarField } from "./pqs-result-shape.js";

export interface CompiledPqsRelationQuery {
    readonly text: string;
    readonly values: readonly unknown[];
}

export interface CompiledPqsRelationFindManyQuery extends CompiledPqsRelationQuery {
    readonly resultShape: PqsRelationResultShape;
}

export function compilePqsRelationFindMany(
    relation: PqsRelation,
    query: NormalizedFindManyQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationFindManyQuery {
    assertCanonicalPhysicalFindMany(relation, query);
    const metadata = pqsRelationMetadata[relation];
    const source = logicalTypeRootSource(relation, profile);
    const values: unknown[] = [];
    const add = (value: unknown) => {
        values.push(value);
        return `$${values.length}`;
    };
    const fields = selectedCanonicalFields(relation, metadata, query.select?.fields, (query.select?.json.length ?? 0) > 0);
    const predicate = query.predicate === undefined ? "" : compileCanonicalPhysicalPredicate(relation, query.predicate, "", profile, add);
    const where = predicate.length === 0 ? "" : ` where ${predicate}`;
    const orderBy = compileCanonicalOrderBy(relation, metadata, query.orderBy, profile);
    const limit = query.take === undefined ? "" : ` limit ${add(query.take)}`;
    const offset = query.skip === 0 ? "" : ` offset ${add(query.skip)}`;
    const included = compileCanonicalPhysicalIncludes(relation, source.reference, query.includes, profile, add);
    const json = compileCanonicalJsonSelections(relation, query.select, profile, add);
    const shape = compilePqsResultShape(relation, "many", query.select, query.includes);

    return {
        text: `${source.withClause}select ${[...fields.map(([field]) => `${compileCanonicalPhysicalField(relation, field, "", profile)} as "${field}"`), ...json, ...included.map((include) => include.selection)].join(", ")} from ${source.relation}${where}${orderBy}${limit}${offset}`,
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
    const source = logicalTypeRootSource(relation, profile);
    const values: unknown[] = [];
    const add = (value: unknown) => {
        values.push(value);
        return `$${values.length}`;
    };
    const predicate = query.predicate === undefined ? "" : ` where ${compileCanonicalPhysicalPredicate(relation, query.predicate, "", profile, add)}`;

    return { text: `${source.withClause}select count(*)::text as count from ${source.relation}${predicate}`, values };
}

export function compilePqsRelationAggregate(
    relation: PqsRelation,
    query: NormalizedAggregateQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationQuery {
    assertCanonicalPhysicalQuery(relation, query, "aggregate");
    const metadata = pqsRelationMetadata[relation];
    const source = logicalTypeRootSource(relation, profile);
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
            selected.push(`${operation}(${compileCanonicalPhysicalField(relation, name, "", profile)})::text as "${operation}_${name}"`);
        }
    }
    if (selected.length === 0) throw new Error("aggregate must request at least one result");
    const predicate = query.predicate === undefined ? "" : ` where ${compileCanonicalPhysicalPredicate(relation, query.predicate, "", profile, add)}`;

    return { text: `${source.withClause}select ${selected.join(", ")} from ${source.relation}${predicate}`, values };
}

export function compilePqsRelationGroupBy(
    relation: PqsRelation,
    query: NormalizedGroupByQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsRelationQuery {
    assertCanonicalPhysicalQuery(relation, query, "groupBy");
    if (query.by.length === 0 || (!query.aggregates.count && query.aggregates.min.length === 0 && query.aggregates.max.length === 0 && query.aggregates.sum.length === 0)) throw new Error("groupBy requires a key and aggregate");
    const metadata = pqsRelationMetadata[relation];
    const source = logicalTypeRootSource(relation, profile);
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
                : compileCanonicalPhysicalField(relation, fieldName, `"${root}"`, profile);
            if (metadata.arrayFields.includes(fieldName)) joins.push(`cross join lateral unnest("${root}"."${column}") as "${fieldName}"(value)`);
            expressions.push(expression);
            selected.push(`${expression} as "${fieldName}"`);
            continue;
        }
        if (key.kind === "json") {
            field(relation, metadata, key.field);
            const text = `${compileCanonicalPhysicalField(relation, key.field, `"${root}"`, profile)} #>> ${add(key.path)}::text[]`;
            const expression = key.as === "text" ? text : key.as === "numeric" ? `(${text})::numeric` : key.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            expressions.push(expression);
            selected.push(`${expression} as ${quotePqsIdentifier(key.name)}`);
            continue;
        }
        if (key.kind === "bucket" && key.path.length === 1) {
            field(relation, metadata, key.path[0]);
            const expression = `date_trunc('${key.bucket}', ${compileCanonicalPhysicalField(relation, key.path[0], `"${root}"`, profile)})`;
            expressions.push(expression);
            selected.push(`${expression} as "${key.path[0]}_${key.bucket}"`);
            continue;
        }
        const edgeName = key.path[0];
        const fieldName = key.path[1];
        const edge = pqsRelationEdges[relation]?.[edgeName];
        if (edge === undefined || edge.cardinality !== "one") throw new Error("group key must follow a profiled to-one edge");
        field(edge.target, pqsRelationMetadata[edge.target], fieldName);
        joins.push(`join ${profile.relation(edge.target)} "${edgeName}" on "${edgeName}"."${edge.targetColumn}" = "${root}"."${edge.sourceColumn}"`);
        const expression = `date_trunc('${key.bucket}', ${compileCanonicalPhysicalField(edge.target, fieldName, `"${edgeName}"`, profile)})`;
        expressions.push(expression);
        selected.push(`${expression} as "${edgeName}_${fieldName}_${key.bucket}"`);
    }
    if (query.aggregates.count) selected.push("count(*)::text as count");
    for (const [operation, fields] of [["min", query.aggregates.min], ["max", query.aggregates.max], ["sum", query.aggregates.sum]] as const) for (const name of fields) {
        if (!metadata.numericFields.includes(name)) throw new Error(`${name} is not a numeric aggregate field of ${relation}`);
        field(relation, metadata, name);
        selected.push(`${operation}(${compileCanonicalPhysicalField(relation, name, `"${root}"`, profile)})::text as "${operation}_${name}"`);
    }
    return { text: `${source.withClause}select ${selected.join(", ")} from ${source.relation} "${root}"${joins.length === 0 ? "" : ` ${joins.join(" ")}`}${predicate} group by ${expressions.join(", ")}`, values };
}

function logicalTypeRootSource(relation: PqsRelation, profile: PqsSchemaProfileV1): { readonly withClause: string; readonly relation: string; readonly reference: string } {
    if (relation !== "__contract_tpe" && relation !== "__exercise_tpe") {
        const physical = profile.relation(relation);
        return { withClause: "", relation: physical, reference: physical };
    }

    const publicKey = compileCanonicalPhysicalField(relation, "pk", '"physical_type"', profile);
    const logicalRelation = '"logical_type_root"';
    return {
        withClause: `with ${logicalRelation} as (select distinct on (${publicKey}) "physical_type".* from ${profile.relation(relation)} "physical_type" order by ${publicKey}, "physical_type"."pk" asc) `,
        relation: logicalRelation,
        reference: logicalRelation,
    };
}

function selectedCanonicalFields(relation: PqsRelation, metadata: PqsRelationMetadata, selected: readonly string[] | undefined, allowEmpty = false): readonly (readonly [string, string])[] {
    const fields = selected === undefined ? Object.entries(metadata.fields) : selected.map((name) => [name, field(relation, metadata, name)] as const);
    if (fields.length === 0 && !allowEmpty) throw new Error("select must include at least one field");
    return fields;
}

function compileCanonicalJsonSelections(relation: PqsRelation, selection: NormalizedSelection | undefined, profile: PqsSchemaProfileV1, add: (value: unknown) => string): readonly string[] {
    return (selection?.json ?? []).map((projection) => {
        if (!PqsSchemaProfileV1.jsonField(relation, projection.field)) throw new Error(`${projection.field} is not a JSON field of ${relation}`);
        field(relation, pqsRelationMetadata[relation], projection.field);
        const text = `${compileCanonicalPhysicalField(relation, projection.field, "", profile)} #>> ${add(projection.path)}::text[]`;
        const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
        return `${expression} as ${quotePqsIdentifier(projection.name)}`;
    });
}
function compileCanonicalOrderBy(relation: PqsRelation, metadata: PqsRelationMetadata, orderBy: NormalizedFindManyQuery["orderBy"], profile: PqsSchemaProfileV1): string {
    if (orderBy.length === 0) return "";
    return ` order by ${orderBy.map((order) => {
        field(relation, metadata, order.path[0]);
        return `${compileCanonicalPhysicalField(relation, order.path[0], "", profile)} ${order.direction}`;
    }).join(", ")}`;
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
