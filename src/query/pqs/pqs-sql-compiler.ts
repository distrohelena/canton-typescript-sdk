import type { ContractOrderBy } from "../model-types.js";
import type { NormalizedFindManyQuery, NormalizedGroupByQuery, NormalizedInclude, NormalizedOrder, NormalizedSelection, QueryPredicate } from "../canonical/query-ast.js";
import { PqsSchemaProfileV1 } from "./pqs-schema-profile.js";
import { PqsRelation, pqsRelationEdges, pqsRelationMetadata } from "./pqs-schema-profile.js";

export interface CompiledPqsQuery {
    readonly text: string;
    readonly values: readonly unknown[];
}

export function compileContractFindMany(
    query: NormalizedFindManyQuery,
    profile: PqsSchemaProfileV1,
): CompiledPqsQuery {
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
        return `${expression} as "${projection.name}"`;
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
  contract_tpe_row.entity_name as template_entity_name${[...included, ...jsonProjection].length === 0 ? "" : `,\n  ${[...included, ...jsonProjection].join(",\n  ")}`}
from ${profile.relation("__contracts")} contract_row
join ${profile.relation("__contract_tpe")} contract_tpe_row on contract_tpe_row.pk = contract_row.tpe_pk
left join ${profile.relation("__transactions")} created_tx on created_tx.ix = contract_row.created_at_ix
left join ${profile.relation("__transactions")} archived_tx on archived_tx.ix = contract_row.archived_at_ix
${whereSql}
${orderBy}
${limitSql}
${offsetSql}`,
        values,
    };
}

export function compileCanonicalPhysicalIncludes(source: PqsRelation, parentAlias: string, includes: readonly NormalizedInclude[], profile: PqsSchemaProfileV1, add: (value: unknown) => string): readonly string[] {
    return includes.map((include) => {
        const edge = pqsRelationEdges[source]?.[include.edge];
        if (edge === undefined || edge.target !== pqsRelation(include.relation)) throw new Error(`Invalid canonical include ${include.edge}`);
        const alias = `"${include.edge}"`;
        const fields = compileCanonicalIncludedFields(edge.target, include.select, alias, profile);
        const json = (include.select?.json ?? []).flatMap((projection) => {
            const column = edge.target === "__contracts" ? projection.field === "payload" ? "payload" : undefined : pqsRelationMetadata[edge.target].fields[projection.field];
            if (column === undefined) throw new Error(`Invalid canonical JSON projection ${projection.field}`);
            const text = `${alias}."${column}" #>> ${add(projection.path)}::text[]`;
            const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            return [`'${projection.name}'`, expression];
        });
        const nested = compileCanonicalPhysicalIncludes(edge.target, alias, include.includes, profile, add);
        const nestedFields = nested.flatMap((selection) => {
            const match = /^(.*) as "([^"]+)"$/.exec(selection);
            return match === null ? [] : [`'${match[2]}'`, match[1]];
        });
        const object = `jsonb_build_object(${[...fields.flatMap(([field, expression]) => [`'${field}'`, expression]), ...json.flat(), ...nestedFields].join(", ")})`;
        const filter = include.predicate === undefined ? "true" : compileCanonicalPhysicalPredicate(edge.target, include.predicate, alias, profile, add);
        const condition = `${alias}."${edge.targetColumn}" = ${parentAlias}."${edge.sourceColumn}" and (${filter})`;
        const orderBy = compileCanonicalPhysicalOrderBy(edge.target, include.orderBy, alias);
        const limit = include.cardinality === "many" ? ` limit ${add(include.take)}` : "";
        const offset = include.cardinality === "many" && include.skip > 0 ? ` offset ${add(include.skip)}` : "";
        const expression = include.cardinality === "one"
            ? `(select ${object} from ${profile.relation(edge.target)} ${alias} where ${condition})`
            : `(select coalesce(jsonb_agg("${include.edge}_limited".value), '[]'::jsonb) from (select ${object} as value from ${profile.relation(edge.target)} ${alias} where ${condition}${orderBy}${limit}${offset}) "${include.edge}_limited")`;
        return `${expression} as "${include.edge}"`;
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
        const join = `${relatedAlias}."${edge.targetColumn}" = ${qualified(alias, edge.sourceColumn)}`;
        const condition = compileCanonicalPredicate(edge.target, predicate.predicate, relatedAlias, profile, add, edge.target === "__contracts");
        const base = `select 1 from ${profile.relation(edge.target)} ${relatedAlias} where ${join} and (${condition})`;
        return predicate.quantifier === "one" || predicate.quantifier === "some" ? `exists (${base})` : predicate.quantifier === "none" ? `not exists (${base})` : `not exists (select 1 from ${profile.relation(edge.target)} ${relatedAlias} where ${join} and not (${condition}))`;
    }
    if (predicate.kind !== "scalar") throw new Error("Unknown canonical predicate");
    const [field, ...path] = predicate.path;
    if (logicalContracts && field === "active") return `${alias}.archived_at_ix is ${predicate.value === true ? "null" : "not null"}`;
    if (logicalContracts && field === "witnesses") return `${add(predicate.value)} = any(${alias}.witnesses)`;
    const column = logicalContracts ? ({ contractId: "contract_id", packageId: "creation_package_id", createdEventOffset: "created_at_ix", createdAt: "effective_at", archivedEventOffset: "archived_at_ix", archivedAt: "effective_at" } as Record<string, string>)[field] : pqsRelationMetadata[relation].fields[field];
    const templateColumn = field === "templateId" ? ({ packageId: "creation_package_id", moduleName: "module_name", entityName: "entity_name" } as Record<string, string>)[path[0]] : undefined;
    const logicalExpression = field === "payload" ? `${alias}.payload #>> ${add(path)}::text[]`
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

function compileProfileIncludes(source: PqsRelation, parentAlias: string, include: Readonly<Record<string, unknown>> | undefined, profile: PqsSchemaProfileV1, addValue: (value: unknown) => string): readonly string[] {
    const selected: string[] = [];
    for (const [name, option] of Object.entries(include ?? {})) {
        const edge = pqsRelationEdges[source]?.[name];
        if (edge === undefined) throw new Error(`${name} is not a relation of ${source}`);
        const settings = option === true ? {} : option;
        if (settings === null || typeof settings !== "object" || Array.isArray(settings)) throw new Error(`${name} must be an include option`);
        const options = settings as Readonly<Record<string, unknown>>;
        if (edge.cardinality === "many" && (typeof options.take !== "number" || !Number.isInteger(options.take) || options.take < 0)) throw new Error(`${name} is a to-many relation and requires a non-negative take`);
        const alias = `"${name}"`;
        const nested = compileProfileIncludes(edge.target, alias, options.include as Readonly<Record<string, unknown>> | undefined, profile, addValue);
        const metadata = pqsRelationMetadata[edge.target];
        const requested = compileIncludedFields(edge.target, options.select as Readonly<Record<string, unknown>> | undefined, alias, profile);
        const json = (options.select as { readonly json?: Readonly<Record<string, {
            readonly field: string;
            readonly path: readonly string[];
            readonly as: "text" | "numeric" | "boolean" | "timestamp";
        }>> } | undefined)?.json ?? {};
        const jsonSelections = Object.entries(json).map(([projectionName, projection]) => {
            if (!PqsSchemaProfileV1.jsonField(edge.target, projection.field)) throw new Error(`${projection.field} is not a JSON field of ${edge.target}`);
            if (projection.path.length === 0 || projection.path.some((segment) => segment.length === 0)) throw new Error(`${projectionName}.path must be a non-empty JSON path`);
            const column = edge.target === "__contracts"
                ? projection.field === "payload" ? "payload" : undefined
                : metadata.fields[projection.field];
            if (column === undefined) throw new Error(`${projection.field} is not a field of ${edge.target}`);
            const text = `${alias}."${column}" #>> ${addValue(projection.path)}::text[]`;
            const expression = projection.as === "text" ? text : projection.as === "numeric" ? `(${text})::numeric::text` : projection.as === "boolean" ? `(${text})::boolean` : `(${text})::timestamptz`;
            return [`'${projectionName}'`, expression] as const;
        });
        if (requested.length === 0 && jsonSelections.length === 0) throw new Error(`Nested ${name}.select must include at least one field`);
        const fields = requested.flatMap(([field, expression]) => [`'${field}'`, expression]);
        const nestedFields = nested.flatMap((selection) => {
            const match = /^(.*) as "([^"]+)"$/.exec(selection);
            return match === null ? [] : [`'${match[2]}'`, match[1]];
        });
        const object = `jsonb_build_object(${[...fields, ...jsonSelections.flat(), ...nestedFields].join(", ")})`;
        const relationFilter = options.where === undefined ? "true" : compilePhysicalWhere(edge.target, options.where as Record<string, unknown>, alias, profile, addValue);
        const condition = `${alias}."${edge.targetColumn}" = ${parentAlias}."${edge.sourceColumn}" and (${relationFilter})`;
        const orderBy = compilePhysicalOrderBy(edge.target, options.orderBy, alias);
        const expression = edge.cardinality === "one"
            ? `(select ${object} from ${profile.relation(edge.target)} ${alias} where ${condition})`
            : `(select coalesce(jsonb_agg("${name}_limited".value), '[]'::jsonb) from (select ${object} as value from ${profile.relation(edge.target)} ${alias} where ${condition}${orderBy} limit ${addValue(options.take)}) "${name}_limited")`;
        selected.push(`${expression} as "${name}"`);
    }
    return selected;
}

function compileIncludedFields(
    target: PqsRelation,
    select: Readonly<Record<string, unknown>> | undefined,
    alias: string,
    profile: PqsSchemaProfileV1,
): readonly (readonly [string, string])[] {
    if (target !== "__contracts") {
        const metadata = pqsRelationMetadata[target];
        const selected = select === undefined
            ? Object.entries(metadata.fields)
            : Object.entries(select).filter(([field, enabled]) => field !== "json" && enabled === true).map(([field]) => [field, metadata.fields[field]] as const);
        if (selected.some(([, column]) => column === undefined)) throw new Error("Nested relation.select references an unknown field");
        return selected.map(([field, column]) => [field, `${alias}."${column}"`] as const);
    }

    const selected = select === undefined
        ? ["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"]
        : Object.entries(select).filter(([field, enabled]) => field !== "json" && enabled === true).map(([field]) => field);
    const expressions: Readonly<Record<string, string>> = {
        contractId: `${alias}."contract_id"`,
        templateId: `jsonb_build_object('packageId', ${alias}."creation_package_id", 'moduleName', (select contract_type."module_name" from ${profile.relation("__contract_tpe")} contract_type where contract_type."pk" = ${alias}."tpe_pk"), 'entityName', (select contract_type."entity_name" from ${profile.relation("__contract_tpe")} contract_type where contract_type."pk" = ${alias}."tpe_pk"))`,
        packageId: `${alias}."creation_package_id"`,
        payload: `${alias}."payload"`,
        witnesses: `${alias}."witnesses"`,
        createdEventOffset: `${alias}."created_at_ix"::text`,
        createdAt: `(select created_transaction."effective_at" from ${profile.relation("__transactions")} created_transaction where created_transaction."ix" = ${alias}."created_at_ix")`,
        archivedEventOffset: `${alias}."archived_at_ix"::text`,
        archivedAt: `(select archived_transaction."effective_at" from ${profile.relation("__transactions")} archived_transaction where archived_transaction."ix" = ${alias}."archived_at_ix")`,
        active: `${alias}."archived_at_ix" is null`,
    };
    const requested = selected.map((field) => [field, expressions[field]] as const);
    if (requested.some(([, expression]) => expression === undefined)) throw new Error("Nested contract.select references an unknown field");
    return requested as readonly (readonly [string, string])[];
}

function compilePhysicalOrderBy(relation: PqsRelation, orderBy: unknown, alias: string): string {
    if (orderBy === undefined) return "";
    if (!Array.isArray(orderBy) || orderBy.length === 0) throw new Error("Nested orderBy must be a non-empty list");
    if (relation === "__contracts") {
        const fields: Readonly<Record<string, string>> = {
            contractId: "contract_id", createdEventOffset: "created_at_ix", createdAt: "created_at_ix",
            archivedEventOffset: "archived_at_ix", archivedAt: "archived_at_ix",
        };
        const entries = orderBy.flatMap((entry) => entry !== null && typeof entry === "object" ? Object.entries(entry as Record<string, unknown>) : []);
        if (entries.length !== orderBy.length || entries.some(([field, direction]) => fields[field] === undefined || (direction !== "asc" && direction !== "desc"))) throw new Error("Nested orderBy entries must have one valid direction");
        return ` order by ${entries.map(([field, direction]) => `${alias}."${fields[field]}" ${direction}`).join(", ")}`;
    }
    const metadata = pqsRelationMetadata[relation];
    const entries = orderBy.flatMap((entry) => entry !== null && typeof entry === "object" ? Object.entries(entry as Record<string, unknown>) : []);
    if (entries.length !== orderBy.length || entries.some(([, direction]) => direction !== "asc" && direction !== "desc")) throw new Error("Nested orderBy entries must have one valid direction");
    return ` order by ${entries.map(([field, direction]) => {
        const column = metadata.fields[field];
        if (column === undefined) throw new Error(`${field} is not a field of ${relation}`);
        return `${alias}."${column}" ${direction}`;
    }).join(", ")}`;
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
            select.push(`${cast} as "${key.name}"`);
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

function compileWhere(where: Record<string, unknown>, addValue: (value: unknown) => string, profile: PqsSchemaProfileV1): string {
    const columns: Record<string, string> = { contractId: "contract_row.contract_id", packageId: "contract_row.creation_package_id", createdEventOffset: "contract_row.created_at_ix", createdAt: "created_tx.effective_at", archivedEventOffset: "contract_row.archived_at_ix", archivedAt: "archived_tx.effective_at" };
    const parts: string[] = [];
    for (const [key, value] of Object.entries(where)) {
        if (key === "and" || key === "or") { if (!Array.isArray(value)) throw new Error(`${key} must be an array`); parts.push(value.length === 0 ? key === "and" ? "true" : "false" : `(${value.map((child) => compileWhere(child as Record<string, unknown>, addValue, profile)).join(` ${key} `)})`); continue; }
        if (key === "not") { parts.push(`not (${compileWhere(value as Record<string, unknown>, addValue, profile)})`); continue; }
        if (key === "active") { const active = typeof value === "boolean" ? value : (value as { equals?: boolean }).equals; if (typeof active !== "boolean") throw new Error("active supports only equals"); parts.push(active ? "contract_row.archived_at_ix is null" : "contract_row.archived_at_ix is not null"); continue; }
        if (key === "witnesses") { const has = (value as { has?: string }).has; if (has === undefined) throw new Error("witnesses supports only has"); parts.push(`${addValue(has)} = any(contract_row.witnesses)`); continue; }
        if (key === "payload") { const payload = value as Record<string, unknown>; const compilePayload = (path: string[], filter: Record<string, unknown>) => { const ops = ["equals", "lt", "lte", "gt", "gte", "like", "ilike"].filter((op) => filter[op] !== undefined); if (ops.length === 1) { const op = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string,string>)[ops[0]]; parts.push(`contract_row.payload #>> ${addValue(path)}::text[] ${op} ${addValue(filter[ops[0]])}`); return; } for (const [name, child] of Object.entries(filter)) compilePayload([...path, name], child as Record<string, unknown>); }; if (payload.match === undefined) throw new Error("payload requires match"); compilePayload([], payload.match as Record<string, unknown>); continue; }
        if (key === "templateId") { const fields: Record<string, string> = { packageId: "contract_row.creation_package_id", moduleName: "contract_tpe_row.module_name", entityName: "contract_tpe_row.entity_name" }; for (const [name, filter] of Object.entries(value as Record<string, Record<string, unknown>>)) for (const [op, operand] of Object.entries(filter)) { const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string, string>)[op]; if (fields[name] === undefined || sql === undefined) throw new Error("invalid templateId filter"); parts.push(`${fields[name]} ${sql} ${addValue(operand)}`); } continue; }
        const edge = pqsRelationEdges.__contracts?.[key];
        if (edge !== undefined) { parts.push(compilePhysicalRelationPredicate(edge.target, key, edge.targetColumn, edge.sourceColumn, edge.cardinality, value, "contract_row", profile, addValue)); continue; }
        const column = columns[key]; if (column === undefined || value === null || typeof value !== "object") throw new Error(`${key} is not a supported contract filter`);
        for (const [op, operand] of Object.entries(value as Record<string, unknown>)) { const sql = ({ equals: "=", lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string,string>)[op]; if (sql !== undefined) parts.push(`${column} ${sql} ${addValue(operand)}`); else if (op === "is" && operand === null) parts.push(`${column} is null`); else if (op === "isNot" && operand === null) parts.push(`${column} is not null`); else if (op === "in" && Array.isArray(operand)) parts.push(operand.length ? `${column} = any(${addValue(operand)})` : "false"); else throw new Error(`${op} is not supported for ${key}`); }
    }
    return parts.length === 0 ? "true" : parts.join(" and ");
}

function compilePhysicalRelationPredicate(target: PqsRelation, edgeName: string, targetColumn: string, sourceColumn: string, cardinality: "one" | "many", value: unknown, parentAlias: string, profile: PqsSchemaProfileV1, addValue: (value: unknown) => string): string {
    if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${edgeName} must be a relation filter`);
    const relation = value as Record<string, unknown>;
    const alias = `"${edgeName}"`;
    const join = `${alias}."${targetColumn}" = ${parentAlias}."${sourceColumn}"`;
    if (cardinality === "one") {
        const predicate = compilePhysicalWhere(target, relation, alias, profile, addValue);
        return `exists (select 1 from ${profile.relation(target)} ${alias} where ${join} and (${predicate}))`;
    }
    const operators = ["some", "none", "every"].filter((name) => relation[name] !== undefined);
    if (operators.length !== 1) throw new Error(`${edgeName} requires exactly one of some, none, or every`);
    const predicate = compilePhysicalWhere(target, relation[operators[0]] as Record<string, unknown>, alias, profile, addValue);
    const base = `select 1 from ${profile.relation(target)} ${alias} where ${join} and (${predicate})`;
    return operators[0] === "some" ? `exists (${base})` : operators[0] === "none" ? `not exists (${base})` : `not exists (select 1 from ${profile.relation(target)} ${alias} where ${join} and not (${predicate}))`;
}

function compilePhysicalWhere(relation: PqsRelation, expression: Record<string, unknown>, alias: string, profile: PqsSchemaProfileV1, addValue: (value: unknown) => string): string {
    if (expression === null || typeof expression !== "object" || Array.isArray(expression)) throw new Error(`${relation} relation predicate must be an expression`);
    const metadata = pqsRelationMetadata[relation];
    const conditions: string[] = [];
    for (const [field, value] of Object.entries(expression)) {
        if (field === "and" || field === "or") {
            if (!Array.isArray(value)) throw new Error(`${field} must be an array`);
            conditions.push(value.length === 0 ? field === "and" ? "true" : "false" : `(${value.map((child) => compilePhysicalWhere(relation, child as Record<string, unknown>, alias, profile, addValue)).join(` ${field} `)})`);
            continue;
        }
        if (field === "not") {
            conditions.push(`not (${compilePhysicalWhere(relation, value as Record<string, unknown>, alias, profile, addValue)})`);
            continue;
        }
        const edge = pqsRelationEdges[relation]?.[field];
        if (edge !== undefined) {
            conditions.push(compilePhysicalRelationPredicate(edge.target, field, edge.targetColumn, edge.sourceColumn, edge.cardinality, value, alias, profile, addValue));
            continue;
        }
        const column = metadata.fields[field];
        if (column === undefined || value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${field} is not a field of ${relation}`);
        const filter = value as Record<string, unknown>;
        const text = PqsSchemaProfileV1.jsonField(relation, field) && Array.isArray(filter.path) ? `${alias}."${column}" #>> ${addValue(filter.path)}::text[]` : `${alias}."${column}"`;
        if (Array.isArray(filter.path) && (filter.path.length === 0 || filter.path.some((segment) => typeof segment !== "string" || segment.length === 0))) throw new Error(`${field}.path must be a non-empty JSON path`);
        if (filter.is === null) conditions.push(`${text} is null`);
        if (filter.isNot === null) conditions.push(`${text} is not null`);
        if (filter.equals !== undefined) conditions.push(`${text} = ${addValue(filter.equals)}`);
        if (filter.in !== undefined) {
            if (!Array.isArray(filter.in)) throw new Error(`${field}.in must be an array`);
            conditions.push(filter.in.length === 0 ? "false" : `${text} = any(${addValue(filter.in)})`);
        }
        if (filter.has !== undefined) {
            if (!metadata.arrayFields.includes(field)) throw new Error(`${field} is not an array field of ${relation}`);
            conditions.push(`${addValue(filter.has)} = any(${alias}."${column}")`);
        }
        for (const [operator, operand] of Object.entries(filter)) {
            const sql = ({ lt: "<", lte: "<=", gt: ">", gte: ">=", like: "like", ilike: "ilike" } as Record<string, string>)[operator];
            if (sql !== undefined) conditions.push(`${text} ${sql} ${addValue(operand)}`);
        }
    }
    return conditions.length === 0 ? "true" : conditions.join(" and ");
}

function compileOrderBy(
    orderBy: ContractOrderBy | undefined,
): string {
    if (orderBy === undefined) {
        return "order by contract_row.contract_id asc";
    }

    const fields: Readonly<Record<string, string>> = {
        contractId: "contract_row.contract_id",
        createdEventOffset: "contract_row.created_at_ix",
        createdAt: "created_tx.effective_at",
        archivedEventOffset: "contract_row.archived_at_ix",
        archivedAt: "archived_tx.effective_at",
    };

    const entries = orderBy.flatMap((entry) => Object.entries(entry));

    if (entries.some(([field, direction]) => fields[field] === undefined || (direction !== "asc" && direction !== "desc"))) {
        throw new Error("orderBy must contain valid one-field entries");
    }

    return `order by ${entries.map(([field, direction]) => `${fields[field]} ${direction}`).join(", ")}`;
}

/** Converts the immutable canonical plan into the legacy shape used by the SQL emitters.
 * This is deliberately internal to PQS: public query objects are normalized before it runs. */
export function canonicalFindManyArgs(query: NormalizedFindManyQuery): Readonly<Record<string, unknown>> {
    return {
        ...(query.predicate === undefined ? {} : { where: canonicalPredicateArgs(query.predicate) }),
        ...(query.parties === undefined ? {} : { parties: query.parties }),
        ...(query.select === undefined ? {} : { select: canonicalSelectionArgs(query.select) }),
        ...(query.includes.length === 0 ? {} : { include: canonicalIncludesArgs(query.includes) }),
        ...(query.orderBy.length === 0 ? {} : { orderBy: canonicalOrderArgs(query.orderBy) }),
        ...(query.take === undefined ? {} : { take: query.take }),
        ...(query.skip === 0 ? {} : { skip: query.skip }),
    };
}

export function canonicalGroupByArgs(query: NormalizedGroupByQuery): Readonly<Record<string, unknown>> {
    return {
        ...(query.predicate === undefined ? {} : { where: canonicalPredicateArgs(query.predicate) }),
        by: query.by.map((key) => key.kind === "field" ? key.path[0] : key.kind === "json"
            ? { [key.field]: { name: key.name, path: key.path, as: key.as } }
            : key.path.length === 1 ? { [key.path[0]]: { bucket: key.bucket } }
                : { [key.path[0]]: { [key.path[1]]: { bucket: key.bucket } } }),
        aggregate: {
            ...(query.aggregates.count ? { count: true } : {}),
            ...(query.aggregates.min.length === 0 ? {} : { min: query.aggregates.min }),
            ...(query.aggregates.max.length === 0 ? {} : { max: query.aggregates.max }),
            ...(query.aggregates.sum.length === 0 ? {} : { sum: query.aggregates.sum }),
        },
    };
}

function canonicalSelectionArgs(selection: NormalizedSelection): Readonly<Record<string, unknown>> {
    return {
        ...Object.fromEntries(selection.fields.map((field) => [field, true])),
        ...(selection.json.length === 0 ? {} : { json: Object.fromEntries(selection.json.map((item) => [item.name, { field: item.field, path: item.path, as: item.as }])) }),
    };
}

function canonicalIncludesArgs(includes: readonly NormalizedInclude[]): Readonly<Record<string, unknown>> {
    return Object.fromEntries(includes.map((include) => [include.edge, {
        ...(include.predicate === undefined ? {} : { where: canonicalPredicateArgs(include.predicate) }),
        ...(include.select === undefined ? {} : { select: canonicalSelectionArgs(include.select) }),
        ...(include.includes.length === 0 ? {} : { include: canonicalIncludesArgs(include.includes) }),
        ...(include.orderBy.length === 0 ? {} : { orderBy: canonicalOrderArgs(include.orderBy) }),
        ...(include.take === undefined ? {} : { take: include.take }),
        ...(include.skip === 0 ? {} : { skip: include.skip }),
    }]));
}

function canonicalOrderArgs(orderBy: readonly NormalizedOrder[]): readonly Readonly<Record<string, "asc" | "desc">>[] {
    return orderBy.map((order) => ({ [order.path[0]]: order.direction }));
}

export function canonicalPredicateArgs(predicate: QueryPredicate): Readonly<Record<string, unknown>> {
    if (predicate.kind === "and" || predicate.kind === "or") return { [predicate.kind]: predicate.children.map(canonicalPredicateArgs) };
    if (predicate.kind === "not") return { not: canonicalPredicateArgs(predicate.child) };
    if (predicate.kind === "relation") return { [predicate.edge]: predicate.quantifier === "one" ? canonicalPredicateArgs(predicate.predicate) : { [predicate.quantifier]: canonicalPredicateArgs(predicate.predicate) } };
    if (predicate.kind !== "scalar") throw new Error("Unknown canonical predicate");
    const [field, ...path] = predicate.path;
    if (field === "templateId") return { templateId: { [path[0]]: { [predicate.operator]: predicate.value } } };
    if (field === "payload" && path.length > 0) return { payload: { match: nestedPath(path, { [predicate.operator]: predicate.value }) } };
    if (path.length > 0) return { [field]: { path, [predicate.operator]: predicate.value } };
    if (field === "active" && predicate.operator === "equals") return { active: predicate.value };
    return { [field]: { [predicate.operator]: predicate.value } };
}

function nestedPath(path: readonly string[], leaf: unknown): Readonly<Record<string, unknown>> {
    return path.reduceRight<Readonly<Record<string, unknown>>>((value, segment) => ({ [segment]: value }), leaf as Readonly<Record<string, unknown>>);
}
