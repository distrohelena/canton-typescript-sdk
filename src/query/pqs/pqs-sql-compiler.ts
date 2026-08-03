import type { ContractOrderBy } from "../model-types.js";
import type { NormalizedAggregateQuery, NormalizedCountQuery, NormalizedFindManyQuery, NormalizedGroupByQuery, NormalizedInclude, NormalizedOrder, NormalizedSelection, QueryPredicate } from "../canonical/query-ast.js";
import { PqsSchemaProfileV1 } from "./pqs-schema-profile.js";
import { PqsRelation, pqsRelationEdges, pqsRelationMetadata } from "./pqs-schema-profile.js";
import { quotePqsIdentifier, quotePqsString } from "./pqs-sql-syntax.js";
import { compilePqsResultShape, type PqsRelationResultShape } from "./pqs-result-shape.js";

export interface CompiledPqsQuery {
    readonly text: string;
    readonly values: readonly unknown[];
}

export interface CompiledPqsInclude {
    readonly key: string;
    readonly expression: string;
    readonly selection: string;
}

export interface CompiledContractFindManyQuery extends CompiledPqsQuery {
    readonly resultShape: PqsRelationResultShape;
}
export function compileContractFindMany(
    query: NormalizedFindManyQuery,
    profile: PqsSchemaProfileV1,
): CompiledContractFindManyQuery {
    if (query.relation !== "contracts") throw new Error("compileContractFindMany requires a contracts query");
    const values: unknown[] = [];

    const addValue = (value: unknown): string => {
        values.push(value);

        return `$${values.length}`;
    };

    const conditions: string[] = [];
    const where = query.predicate === undefined ? undefined : compileCanonicalContractPredicate(query.predicate, addValue, profile, "contract_row");
    if (where !== undefined) conditions.push(where);

    if (query.parties !== undefined) {
        conditions.push(`contract_row.witnesses && ${addValue(query.parties)}::text[]`);
    }

    const orderBy = compileCanonicalContractOrderBy(query.orderBy);

    const whereSql = conditions.length === 0 ? "" : `where ${conditions.join(" and ")}`;

    const limitSql = query.take === undefined ? "" : `limit ${addValue(query.take)}`;

    const offsetSql = query.skip === 0 ? "" : `offset ${addValue(query.skip)}`;

    const included = compileCanonicalPhysicalIncludes("__contracts", "contract_row", query.includes, profile, addValue);
    const jsonProjection = (query.select?.json ?? []).map((projection) => {
        const text = `contract_row.payload #>> ${addValue(projection.path)}::text[]`;
        const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
        return `${expression} as ${quotePqsIdentifier(projection.name)}`;
    });

    return {
        text: `select
  contract_row.contract_id as contract_id,
  contract_row.creation_package_id as package_id,
  contract_row.payload,
  contract_row.witnesses,
  contract_row.created_at_ix::text as created_event_offset,
  created_tx.effective_at as created_at,
  contract_row.archived_at_ix::text as archived_event_offset,
  archived_tx.effective_at as archived_at,
  contract_row.archived_at_ix is null as active,
  contract_row.creation_package_id as template_package_id,
  contract_tpe_row.module_name as template_module_name,
  contract_tpe_row.entity_name as template_entity_name${[...included.map((include) => include.selection), ...jsonProjection].length === 0 ? "" : `,\n  ${[...included.map((include) => include.selection), ...jsonProjection].join(",\n  ")}`}
from ${profile.relation("__contracts")} contract_row
join ${profile.relation("__contract_tpe")} contract_tpe_row on contract_tpe_row.pk = contract_row.tpe_pk
left join ${profile.relation("__transactions")} created_tx on created_tx.ix = contract_row.created_at_ix
left join ${profile.relation("__transactions")} archived_tx on archived_tx.ix = contract_row.archived_at_ix
${whereSql}
${orderBy}
${limitSql}
${offsetSql}`,
        values,
        resultShape: compilePqsResultShape("__contracts", "many", query.select, query.includes),
    };
}

export function compileContractCount(query: NormalizedCountQuery, profile: PqsSchemaProfileV1): CompiledPqsQuery {
    if (query.relation !== "contracts") throw new Error("compileContractCount requires a contracts query");
    const values: unknown[] = [];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const where = compileContractWhere(query.predicate, query.parties, profile, add);
    return { text: `select count(*)::text as count ${contractFrom(profile)}${where}`, values };
}

export function compileContractAggregate(query: NormalizedAggregateQuery, profile: PqsSchemaProfileV1): CompiledPqsQuery {
    if (query.relation !== "contracts") throw new Error("compileContractAggregate requires a contracts query");
    const values: unknown[] = [];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const selected: string[] = [];
    if (query.aggregates.count) selected.push("count(*)::text as count");
    const fields: Readonly<Record<string, string>> = { createdEventOffset: "contract_row.created_at_ix", archivedEventOffset: "contract_row.archived_at_ix" };
    for (const [operation, requested] of [["min", query.aggregates.min], ["max", query.aggregates.max], ["sum", query.aggregates.sum]] as const) {
        for (const field of requested) {
            const expression = fields[field];
            if (expression === undefined) throw new Error(`${field} is not a numeric aggregate field of contracts`);
            selected.push(`${operation}(${expression})::text as ${quotePqsIdentifier(`${operation}_${field}`)}`);
        }
    }
    if (selected.length === 0) throw new Error("aggregate must request at least one result");
    return { text: `select ${selected.join(", ")} ${contractFrom(profile)}${compileContractWhere(query.predicate, undefined, profile, add)}`, values };
}

function contractFrom(profile: PqsSchemaProfileV1): string {
    return `from ${profile.relation("__contracts")} contract_row join ${profile.relation("__contract_tpe")} contract_tpe_row on contract_tpe_row.pk = contract_row.tpe_pk left join ${profile.relation("__transactions")} created_tx on created_tx.ix = contract_row.created_at_ix left join ${profile.relation("__transactions")} archived_tx on archived_tx.ix = contract_row.archived_at_ix`;
}

function compileContractWhere(predicate: QueryPredicate | undefined, parties: readonly string[] | undefined, profile: PqsSchemaProfileV1, add: (value: unknown) => string): string {
    const conditions = [
        ...(predicate === undefined ? [] : [compileCanonicalContractPredicate(predicate, add, profile, "contract_row")]),
        ...(parties === undefined ? [] : [`contract_row.witnesses && ${add(parties)}::text[]`]),
    ];
    return conditions.length === 0 ? "" : ` where ${conditions.join(" and ")}`;
}

export function compileCanonicalPhysicalIncludes(source: PqsRelation, parentAlias: string, includes: readonly NormalizedInclude[], profile: PqsSchemaProfileV1, add: (value: unknown) => string): readonly CompiledPqsInclude[] {
    return includes.map((include) => {
        const edge = pqsRelationEdges[source]?.[include.edge];
        if (edge === undefined || edge.target !== pqsRelation(include.relation)) throw new Error(`Invalid canonical include ${include.edge}`);
        const alias = quotePqsIdentifier(include.edge);
        const fields = compileCanonicalIncludedFields(edge.target, include.select, alias, profile);
        const json = (include.select?.json ?? []).flatMap((projection) => {
            const column = edge.target === "__contracts" ? projection.field === "payload" ? "payload" : undefined : pqsRelationMetadata[edge.target].fields[projection.field];
            if (column === undefined) throw new Error(`Invalid canonical JSON projection ${projection.field}`);
            const text = `${alias}."${column}" #>> ${add(projection.path)}::text[]`;
            const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            return [quotePqsString(projection.name), expression];
        });
        const nested = compileCanonicalPhysicalIncludes(edge.target, alias, include.includes, profile, add);
        const nestedFields = nested.flatMap((selection) => [quotePqsString(selection.key), selection.expression]);
        const object = `jsonb_build_object(${[...fields.flatMap(([field, expression]) => [`'${field}'`, expression]), ...json.flat(), ...nestedFields].join(", ")})`;
        const filter = include.predicate === undefined ? "true" : compileCanonicalPhysicalPredicate(edge.target, include.predicate, alias, profile, add);
        const condition = `${alias}."${edge.targetColumn}" = ${parentAlias}."${edge.sourceColumn}" and (${filter})`;
        const orderBy = compileCanonicalPhysicalOrderBy(edge.target, include.orderBy, alias);
        const limit = include.cardinality === "many" ? ` limit ${add(include.take)}` : "";
        const offset = include.cardinality === "many" && include.skip > 0 ? ` offset ${add(include.skip)}` : "";
        const expression = include.cardinality === "one"
            ? `(select ${object} from ${profile.relation(edge.target)} ${alias} where ${condition})`
            : `(select coalesce(jsonb_agg("${include.edge}_limited".value), '[]'::jsonb) from (select ${object} as value from ${profile.relation(edge.target)} ${alias} where ${condition}${orderBy}${limit}${offset}) "${include.edge}_limited")`;
        return { key: include.edge, expression, selection: `${expression} as ${quotePqsIdentifier(include.edge)}` };
    });
}

function compileCanonicalIncludedFields(target: PqsRelation, select: NormalizedSelection | undefined, alias: string, profile: PqsSchemaProfileV1): readonly (readonly [string, string])[] {
    if (target !== "__contracts") {
        const metadata = pqsRelationMetadata[target];
        const fields = select === undefined ? Object.keys(metadata.fields) : select.fields;
        return fields.map((field) => [field, `${alias}."${metadata.fields[field]}"`] as const);
    }
    const fields = select === undefined ? ["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"] : select.fields;
    const expressions: Readonly<Record<string, string>> = {
        contractId: `${alias}."contract_id"`, templateId: `jsonb_build_object('packageId', ${alias}."creation_package_id", 'moduleName', (select contract_type."module_name" from ${profile.relation("__contract_tpe")} contract_type where contract_type."pk" = ${alias}."tpe_pk"), 'entityName', (select contract_type."entity_name" from ${profile.relation("__contract_tpe")} contract_type where contract_type."pk" = ${alias}."tpe_pk"))`, packageId: `${alias}."creation_package_id"`, payload: `${alias}."payload"`, witnesses: `${alias}."witnesses"`, createdEventOffset: `${alias}."created_at_ix"::text`, createdAt: `(select created_transaction."effective_at" from ${profile.relation("__transactions")} created_transaction where created_transaction."ix" = ${alias}."created_at_ix")`, archivedEventOffset: `${alias}."archived_at_ix"::text`, archivedAt: `(select archived_transaction."effective_at" from ${profile.relation("__transactions")} archived_transaction where archived_transaction."ix" = ${alias}."archived_at_ix")`, active: `${alias}."archived_at_ix" is null`,
    };
    return fields.map((field) => [field, expressions[field]] as const);
}

function compileCanonicalContractPredicate(predicate: QueryPredicate, add: (value: unknown) => string, profile: PqsSchemaProfileV1, alias: string): string {
    return compileCanonicalPredicate("__contracts", predicate, alias, profile, add, true);
}

export function compileCanonicalPhysicalPredicate(relation: PqsRelation, predicate: QueryPredicate, alias: string, profile: PqsSchemaProfileV1, add: (value: unknown) => string): string {
    return compileCanonicalPredicate(relation, predicate, alias, profile, add, relation === "__contracts");
}

function compileCanonicalPredicate(relation: PqsRelation, predicate: QueryPredicate, alias: string, profile: PqsSchemaProfileV1, add: (value: unknown) => string, logicalContracts: boolean): string {
    if (predicate.kind === "and" || predicate.kind === "or") return predicate.children.length === 0 ? predicate.kind === "and" ? "true" : "false" : `(${predicate.children.map((child) => compileCanonicalPredicate(relation, child, alias, profile, add, logicalContracts)).join(` ${predicate.kind} `)})`;
    if (predicate.kind === "not") return `not (${compileCanonicalPredicate(relation, predicate.child, alias, profile, add, logicalContracts)})`;
    if (predicate.kind === "relation") {
        const edge = pqsRelationEdges[relation]?.[predicate.edge];
        if (edge === undefined) throw new Error(`Invalid canonical edge ${predicate.edge}`);
        const relatedAlias = `"${predicate.edge}"`;
        const parent = alias.length === 0 ? `${profile.relation(relation)}."${edge.sourceColumn}"` : qualified(alias, edge.sourceColumn);
        const join = `${relatedAlias}."${edge.targetColumn}" = ${parent}`;
        const condition = compileCanonicalPredicate(edge.target, predicate.predicate, relatedAlias, profile, add, edge.target === "__contracts");
        const base = `select 1 from ${profile.relation(edge.target)} ${relatedAlias} where ${join} and (${condition})`;
        return predicate.quantifier === "one" || predicate.quantifier === "some" ? `exists (${base})` : predicate.quantifier === "none" ? `not exists (${base})` : `not exists (select 1 from ${profile.relation(edge.target)} ${relatedAlias} where ${join} and not (${condition}))`;
    }
    if (predicate.kind !== "scalar") throw new Error("Unknown canonical predicate");
    const [field, ...path] = predicate.path;
    if (logicalContracts && field === "active") return `${logicalQualified(alias, "archived_at_ix")} is ${predicate.value === true ? "null" : "not null"}`;
    if (logicalContracts && field === "witnesses") return `${add(predicate.value)} = any(${logicalQualified(alias, "witnesses")})`;
    const column = logicalContracts ? ({ contractId: "contract_id", packageId: "creation_package_id", createdEventOffset: "created_at_ix", createdAt: "effective_at", archivedEventOffset: "archived_at_ix", archivedAt: "effective_at" } as Record<string, string>)[field] : pqsRelationMetadata[relation].fields[field];
    const templateColumn = field === "templateId" ? ({ packageId: "creation_package_id", moduleName: "module_name", entityName: "entity_name" } as Record<string, string>)[path[0]] : undefined;
    const logicalExpression = field === "payload" ? `${logicalQualified(alias, "payload")} #>> ${add(path)}::text[]`
        : field === "createdAt" ? "created_tx.effective_at" : field === "archivedAt" ? "archived_tx.effective_at"
            : `${alias}.${column}`;
    const expression = templateColumn === undefined ? logicalContracts ? logicalExpression : path.length > 0 ? `${qualified(alias, column)} #>> ${add(path)}::text[]` : qualified(alias, column) : path[0] === "packageId" ? qualified(alias, templateColumn) : `contract_tpe_row."${templateColumn}"`;
    const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as const)[predicate.operator as "equals" | "lt" | "lte" | "gt" | "gte" | "like" | "ilike"];
    if (predicate.operator === "is") return `${expression} is null`;
    if (predicate.operator === "isNot") return `${expression} is not null`;
    if (predicate.operator === "in") return (predicate.value as readonly unknown[]).length === 0 ? "false" : `${expression} = any(${add(predicate.value)})`;
    if (predicate.operator === "has") return `${add(predicate.value)} = any(${qualified(alias, column)})`;
    if (sql === undefined) throw new Error(`Unsupported canonical operator ${predicate.operator}`);
    return `${expression} ${sql} ${add(predicate.value)}`;
}

function qualified(alias: string, column: string): string {
    return alias.length === 0 ? `"${column}"` : `${alias}."${column}"`;
}

function logicalQualified(alias: string, column: string): string {
    return alias === "contract_row" ? `${alias}.${column}` : qualified(alias, column);
}

function compileCanonicalContractOrderBy(orderBy: readonly NormalizedOrder[]): string {
    return compileCanonicalOrderBy(orderBy, { contractId: "contract_row.contract_id", createdEventOffset: "contract_row.created_at_ix", createdAt: "created_tx.effective_at", archivedEventOffset: "contract_row.archived_at_ix", archivedAt: "archived_tx.effective_at" });
}

function compileCanonicalPhysicalOrderBy(relation: PqsRelation, orderBy: readonly NormalizedOrder[], alias: string): string {
    const fields = relation === "__contracts" ? { contractId: "contract_id", createdEventOffset: "created_at_ix", createdAt: "created_at_ix", archivedEventOffset: "archived_at_ix", archivedAt: "archived_at_ix" } : pqsRelationMetadata[relation].fields;
    return compileCanonicalOrderBy(orderBy, Object.fromEntries(Object.entries(fields).map(([field, column]) => [field, `${alias}."${column}"`])));
}

function compileCanonicalOrderBy(orderBy: readonly NormalizedOrder[], fields: Readonly<Record<string, string>>): string {
    return orderBy.length === 0 ? "" : ` order by ${orderBy.map((order) => `${fields[order.path[0]]} ${order.direction}`).join(", ")}`;
}

function pqsRelation(relation: string): PqsRelation {
    return ({ contracts: "__contracts", contractTypes: "__contract_tpe", events: "__events", exercises: "__exercises", exerciseTypes: "__exercise_tpe", packages: "__packages", transactions: "__transactions", watermark: "__watermark" } as Record<string, PqsRelation>)[relation];
}

export function compileContractGroupBy(
    query: NormalizedGroupByQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsQuery {
    if (query.relation !== "contracts") throw new Error("compileContractGroupBy requires a contracts query");
    if (query.by.length === 0 || (!query.aggregates.count && query.aggregates.min.length === 0 && query.aggregates.max.length === 0 && query.aggregates.sum.length === 0)) throw new Error("groupBy requires keys and an aggregate");
    const values: unknown[] = [];
    const add = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const where = query.predicate === undefined ? undefined : compileCanonicalContractPredicate(query.predicate, add, profile, "contract_row");
    const fields: Readonly<Record<string, string>> = {
        contractId: "contract_row.contract_id",
        createdEventOffset: "contract_row.created_at_ix",
        archivedEventOffset: "contract_row.archived_at_ix",
    };
    const expressions: string[] = [];
    const select: string[] = [];
    let unnestWitnesses = false;
    for (const key of query.by) {
        if (key.kind === "field" && key.path[0] === "witnesses") {
            unnestWitnesses = true;
            expressions.push("witness.value");
            select.push("witness.value as \"witnesses\"");
        } else if (key.kind === "field") {
            const expression = fields[key.path[0]];
            if (expression === undefined) throw new Error(`${key.path[0]} is not a contract group key`);
            expressions.push(expression);
            select.push(`${expression} as "${key.path[0]}"`);
        } else {
            if (key.kind !== "json" || key.field !== "payload") throw new Error("invalid contract group key");
            const base = `contract_row.payload #>> ${add(key.path)}::text[]`;
            const cast = key.as === "text" ? base : `(${base})::${key.as === "numeric" ? "numeric" : key.as === "boolean" ? "boolean" : "timestamptz"}`;
            expressions.push(cast);
            select.push(`${cast} as ${quotePqsIdentifier(key.name)}`);
        }
    }
    if (query.aggregates.count) select.push("count(*)::text as count");
    for (const [operation, requested] of [["min", query.aggregates.min], ["max", query.aggregates.max], ["sum", query.aggregates.sum]] as const) {
        for (const name of requested) {
            const expression = fields[name];
            select.push(`${operation}(${expression})::text as "${operation}_${name}"`);
        }
    }
    return {
        text: `select ${select.join(", ")} from ${profile.relation("__contracts")} contract_row${unnestWitnesses ? " cross join lateral unnest(contract_row.witnesses) as witness(value)" : ""}${where === undefined ? "" : ` where ${where}`} group by ${expressions.join(", ")}`,
        values,
    };
}
