import { assertQueryOrderBy, assertQueryPageArgs } from "../model-types.js";
import type {
    NormalizedAggregateQuery,
    NormalizedAggregateSelection,
    NormalizedCountQuery,
    NormalizedFindManyQuery,
    NormalizedFindUniqueQuery,
    NormalizedGroupByQuery,
    NormalizedGroupKey,
    NormalizedInclude,
    NormalizedJsonSelection,
    NormalizedOrder,
    NormalizedSelection,
    QueryPredicate,
    ScalarOperator,
} from "./query-ast.js";
import {
    queryRelationEdges,
    queryRelationMetadata,
    type QueryRelation,
} from "./query-schema.js";

type UnknownRecord = Readonly<Record<string, unknown>>;

const scalarOperators = new Set<ScalarOperator>([
    "equals", "in", "is", "isNot", "lt", "lte", "gt", "gte", "like", "ilike", "has",
]);

const orderedOperators = new Set<ScalarOperator>(["equals", "in", "is", "isNot", "lt", "lte", "gt", "gte"]);

const stringOperators = new Set<ScalarOperator>([...orderedOperators, "like", "ilike"]);

const payloadOperators = new Set<ScalarOperator>(["equals", "lt", "lte", "gt", "gte", "like", "ilike"]);

const jsonScalarTypes = new Set(["text", "numeric", "boolean", "timestamp"]);

const buckets = new Set(["hour", "day", "week", "month"]);

export function normalizeFindMany(relation: QueryRelation, args: unknown = {}): NormalizedFindManyQuery {
    const source = object(args, "findMany args");

    assertKnown(source, ["parties", "where", "select", "include", "orderBy", "skip", "take"], relation);

    const page = normalizePage(source);

    const predicate = source.where === undefined ? undefined : normalizePredicate(relation, source.where);

    return {
        kind: "findMany",
        relation,
        parties: normalizeParties(relation, source.parties),
        predicate,
        select: source.select === undefined ? undefined : normalizeSelection(relation, source.select),
        includes: source.include === undefined ? [] : normalizeIncludes(relation, source.include),
        orderBy: normalizeOrderBy(relation, source.orderBy),
        skip: page.skip,
        take: page.take,
        activeOnly: relation === "contracts" && provesActive(predicate),
    };
}

export function normalizeFindUnique(relation: QueryRelation, args: unknown): NormalizedFindUniqueQuery {
    const source = object(args, "findUnique args");

    assertKnown(source, ["where", "select", "include"], relation);

    const where = object(source.where, "findUnique.where");

    const metadata = queryRelationMetadata[relation];

    const fields = Object.keys(where);

    if (!metadata.uniqueKeys.some((key) => key.length === fields.length && key.every((field) => fields.includes(field)))) {
        throw new Error(`findUnique.where must contain one declared unique key of ${relation}`);
    }

    const children = fields.map((field) => {
        assertUniqueEqualityValue(field, where[field]);

        return scalar(field, where[field]);
    });

    return {
        kind: "findUnique",
        relation,
        predicate: combine("and", children) ?? fail("findUnique.where must not be empty"),
        select: source.select === undefined ? undefined : normalizeSelection(relation, source.select),
        includes: source.include === undefined ? [] : normalizeIncludes(relation, source.include),
    };
}

export function normalizeCount(relation: QueryRelation, args: unknown = {}): NormalizedCountQuery {
    const source = object(args, "count args");

    assertKnown(source, ["parties", "where"], relation);

    const predicate = source.where === undefined ? undefined : normalizePredicate(relation, source.where);

    return {
        kind: "count",
        relation,
        parties: normalizeParties(relation, source.parties),
        predicate,
        activeOnly: relation === "contracts" && provesActive(predicate),
    };
}

export function normalizeAggregate(relation: QueryRelation, args: unknown): NormalizedAggregateQuery {
    const source = object(args, "aggregate args");

    assertKnown(source, ["where", "count", "min", "max", "sum"], relation);

    return {
        kind: "aggregate",
        relation,
        predicate: source.where === undefined ? undefined : normalizePredicate(relation, source.where),
        aggregates: normalizeAggregates(relation, source),
    };
}

export function normalizeGroupBy(relation: QueryRelation, args: unknown): NormalizedGroupByQuery {
    const source = object(args, "groupBy args");

    assertKnown(source, ["where", "by", "aggregate"], relation);

    if (!Array.isArray(source.by) || source.by.length === 0) {
        throw new Error("groupBy.by must be a non-empty list");
    }

    return {
        kind: "groupBy",
        relation,
        predicate: source.where === undefined ? undefined : normalizePredicate(relation, source.where),
        by: source.by.map((key) => normalizeGroupKey(relation, key)),
        aggregates: normalizeAggregates(relation, object(source.aggregate, "groupBy.aggregate"), true),
    };
}

function normalizePredicate(relation: QueryRelation, value: unknown): QueryPredicate | undefined {
    const expression = object(value, `${relation}.where`);

    const children: QueryPredicate[] = [];

    for (const [field, operand] of Object.entries(expression)) {
        if (field === "and" || field === "or") {
            if (!Array.isArray(operand)) {
                throw new Error(`${field} must be an array`);
            }

            const logical = operand.map((child) => normalizePredicate(relation, child)).filter((child): child is QueryPredicate => child !== undefined);

            children.push({ kind: field, children: logical });

            continue;
        } else if (field === "not") {
            const child = normalizePredicate(relation, operand);

            if (child === undefined) {
                throw new Error("not must contain a predicate");
            }

            children.push({ kind: "not", child });

            continue;
        } else if (relation === "contracts" && field === "templateId") {
            children.push(...normalizeTemplateId(operand));

            continue;
        } else if (relation === "contracts" && field === "payload") {
            children.push(...normalizePayloadMatch(operand));

            continue;
        }

        const edge = queryRelationEdges[relation]?.[field];

        if (edge !== undefined) {
            children.push(normalizeRelationPredicate(field, edge.target, edge.cardinality, operand));

            continue;
        } else if (!queryRelationMetadata[relation].fields.includes(field)) {
            throw new Error(`${field} is not a field of ${relation}`);
        }

        children.push(...normalizeScalarFilter(relation, field, operand));
    }

    return combine("and", children);
}

function normalizeTemplateId(value: unknown): readonly QueryPredicate[] {
    const fields = object(value, "templateId filter");

    assertKnown(fields, ["packageId", "moduleName", "entityName"], "templateId");

    return Object.entries(fields).flatMap(([field, filter]) => normalizeTemplateScalarFilter(field, filter));
}

function normalizePayloadMatch(value: unknown, prefix: readonly string[] = ["payload"]): readonly QueryPredicate[] {
    const match = object(value, "payload filter");

    if (Object.keys(match).length !== 1 || !("match" in match)) {
        throw new Error("payload filter must contain match");
    }

    const walk = (node: unknown, path: readonly string[]): readonly QueryPredicate[] => {
        const record = object(node, "payload.match");

        return Object.entries(record).flatMap(([name, child]) => {
            if (isScalarFilter(child)) {
                return normalizePayloadScalarFilter([...path, name], child);
            }

            return walk(child, [...path, name]);
        });
    };

    return walk(match.match, prefix);
}

function normalizeRelationPredicate(edge: string, target: QueryRelation, cardinality: "one" | "many", value: unknown): QueryPredicate {
    const filter = object(value, `${edge} relation filter`);

    if (cardinality === "one") {
        if (["one", "some", "none", "every"].some((key) => key in filter)) {
            throw new Error(`${edge} is a to-one relation and does not support relation quantifiers`);
        }

        const predicate = normalizePredicate(target, filter);

        if (predicate === undefined) {
            throw new Error(`${edge} relation predicate must not be empty`);
        }

        return { kind: "relation", edge, quantifier: "one", predicate };
    }

    const entries = Object.entries(filter);

    if (entries.length !== 1 || !["some", "none", "every"].includes(entries[0][0])) {
        throw new Error(`${edge} requires exactly one of some, none, or every`);
    }

    const predicate = normalizePredicate(target, entries[0][1]);

    if (predicate === undefined) {
        throw new Error(`${edge}.${entries[0][0]} must contain a predicate`);
    }

    return { kind: "relation", edge, quantifier: entries[0][0] as "some" | "none" | "every", predicate };
}

function normalizeScalarFilter(relation: QueryRelation, field: string, value: unknown): readonly QueryPredicate[] {
    if (relation === "contracts" && field === "witnesses") {
        return normalizeContractWitnesses(value);
    } else if (!isFilter(value)) {
        return [scalar(field, value)];
    }

    const metadata = queryRelationMetadata[relation];

    const base = field.split(".")[0];

    const path = field.split(".");

    if (metadata.jsonFields.includes(base)) {
        return normalizeJsonFilter(base, value);
    }

    const entries = Object.entries(value);

    if (entries.length === 0) {
        throw new Error(`${field} filter must not be empty`);
    }

    return entries.map(([operator, operand]) => {
        if (!scalarOperators.has(operator as ScalarOperator)) {
            throw new Error(`${operator} is not supported for ${field}`);
        }

        const allowed = metadata.arrayFields.includes(base)
            ? new Set<ScalarOperator>(["equals", "in", "is", "isNot", "has"])
            : metadata.stringFields.includes(base) ? stringOperators : metadata.numericFields.includes(base) || metadata.dateFields.includes(base) ? orderedOperators : new Set<ScalarOperator>(["equals", "in", "is", "isNot"]);

        if (!allowed.has(operator as ScalarOperator)) {
            throw new Error(`${operator} is not supported for ${field}`);
        }

        validateOperatorValue(operator as ScalarOperator, operand, field);

        return { kind: "scalar", path, operator: operator as ScalarOperator, value: operand };
    });
}

function normalizeJsonFilter(field: string, value: UnknownRecord): readonly QueryPredicate[] {
    const path = jsonPath(value.path, `${field}.path`);

    const entries = Object.entries(value).filter(([operator]) => operator !== "path");

    if (entries.length === 0) {
        throw new Error(`${field} JSON filter must contain an operator`);
    }

    return entries.map(([operator, operand]) => {
        if (!scalarOperators.has(operator as ScalarOperator) || operator === "has") {
            throw new Error(`${operator} is not supported for ${field}`);
        }

        validateOperatorValue(operator as ScalarOperator, operand, field);

        return { kind: "scalar", path: [field, ...path], operator: operator as ScalarOperator, value: operand };
    });
}

function normalizePayloadScalarFilter(path: readonly string[], value: UnknownRecord): readonly QueryPredicate[] {
    const entries = Object.entries(value);

    if (entries.length === 0) {
        throw new Error("payload filter must not be empty");
    }

    return entries.map(([operator, operand]) => {
        if (!payloadOperators.has(operator as ScalarOperator)) {
            throw new Error(`${operator} is not supported for payload`);
        }

        validateOperatorValue(operator as ScalarOperator, operand, "payload");

        return { kind: "scalar", path, operator: operator as ScalarOperator, value: operand };
    });
}

function normalizeTemplateScalarFilter(field: string, value: unknown): readonly QueryPredicate[] {
    if (!isFilter(value)) {
        return [scalar(`templateId.${field}`, value)];
    }

    const entries = Object.entries(value);

    if (entries.length === 0) {
        throw new Error(`templateId.${field} filter must not be empty`);
    }

    return entries.map(([operator, operand]) => {
        if (!stringOperators.has(operator as ScalarOperator)) {
            throw new Error(`${operator} is not supported for templateId.${field}`);
        }

        validateOperatorValue(operator as ScalarOperator, operand, `templateId.${field}`);

        return { kind: "scalar", path: ["templateId", field], operator: operator as ScalarOperator, value: operand };
    });
}

function normalizeSelection(relation: QueryRelation, value: unknown): NormalizedSelection {
    const selection = object(value, "select");

    const fields: string[] = [];

    const json: NormalizedJsonSelection[] = [];

    for (const [field, enabled] of Object.entries(selection)) {
        if (field === "json") {
            const projections = object(enabled, "select.json");

            for (const [name, projection] of Object.entries(projections)) {
                json.push(normalizeJsonSelection(relation, name, projection));
            }

            continue;
        } else if (!queryRelationMetadata[relation].fields.includes(field)) {
            throw new Error(`${field} is not a field of ${relation}`);
        }

        if (enabled !== true && enabled !== false) {
            throw new Error(`select.${field} must be a boolean`);
        } else if (enabled) {
            fields.push(field);
        }
    }

    if (fields.length === 0 && json.length === 0) {
        throw new Error("select must include at least one field");
    }

    return { fields, json };
}

function normalizeJsonSelection(relation: QueryRelation, name: string, value: unknown): NormalizedJsonSelection {
    const projection = object(value, `select.json.${name}`);

    assertKnown(projection, ["field", "path", "as"], `select.json.${name}`);

    if (typeof projection.field !== "string" || !queryRelationMetadata[relation].jsonFields.includes(projection.field)) {
        throw new Error(`${String(projection.field)} is not a JSON field of ${relation}`);
    } else if (typeof projection.as !== "string" || !jsonScalarTypes.has(projection.as)) {
        throw new Error(`select.json.${name}.as is invalid`);
    }

    return { name, field: projection.field, path: jsonPath(projection.path, `select.json.${name}.path`), as: projection.as as NormalizedJsonSelection["as"] };
}

function normalizeIncludes(relation: QueryRelation, value: unknown): readonly NormalizedInclude[] {
    const include = object(value, "include");

    return Object.entries(include).map(([edgeName, option]) => {
        const edge = queryRelationEdges[relation]?.[edgeName];

        if (edge === undefined) {
            throw new Error(`${edgeName} is not a relation of ${relation}`);
        } else if (edge.cardinality === "many" && option === true) {
            throw new Error(`${edgeName} is a to-many relation and requires a non-negative take`);
        }

        const settings = option === true ? {} : object(option, `${edgeName} include option`);

        assertKnown(
            settings,
            edge.cardinality === "many"
                ? ["where", "select", "include", "orderBy", "skip", "take"]
                : ["where", "select", "include", "orderBy"],
            `${edgeName} include option`,
        );

        const page = edge.cardinality === "many" ? normalizePage(settings) : { skip: 0, take: undefined };

        if (edge.cardinality === "many" && page.take === undefined) {
            throw new Error(`${edgeName} is a to-many relation and requires a non-negative take`);
        }

        return {
            edge: edgeName,
            relation: edge.target,
            cardinality: edge.cardinality,
            predicate: settings.where === undefined ? undefined : normalizePredicate(edge.target, settings.where),
            select: settings.select === undefined ? undefined : normalizeSelection(edge.target, settings.select),
            includes: settings.include === undefined ? [] : normalizeIncludes(edge.target, settings.include),
            orderBy: normalizeOrderBy(edge.target, settings.orderBy),
            skip: page.skip,
            take: page.take,
        };
    });
}

function normalizeOrderBy(relation: QueryRelation, value: unknown): readonly NormalizedOrder[] {
    const metadata = queryRelationMetadata[relation];

    const requested: NormalizedOrder[] = [];

    if (value !== undefined) {
        if (!Array.isArray(value)) {
            throw new Error("orderBy must be a non-empty list of one-field entries");
        }

        assertQueryOrderBy(value as readonly Readonly<Record<string, "asc" | "desc">>[]);
        for (const entry of value) {
            const [field, direction] = Object.entries(object(entry, "orderBy entry"))[0] ?? [];

            if (!metadata.orderFields.includes(field)) {
                throw new Error(`${field} is not orderable on ${relation}`);
            } else if (direction !== "asc" && direction !== "desc") {
                throw new Error(`Invalid order direction for ${field}`);
            }

            requested.push({ path: [field], direction });
        }
    }

    for (const field of metadata.stableOrder) {
        if (!requested.some((order) => order.path.length === 1 && order.path[0] === field)) {
            requested.push({ path: [field], direction: "asc" });
        }
    }

    return requested;
}

function normalizePage(value: UnknownRecord): { readonly skip: number; readonly take?: number } {
    const skip = value.skip === undefined ? 0 : value.skip;

    const take = value.take;

    if (typeof skip !== "number" || (take !== undefined && typeof take !== "number")) {
        throw new Error("skip and take must be numbers");
    }

    assertQueryPageArgs({ skip, take });

    return { skip, take };
}

function normalizeParties(relation: QueryRelation, value: unknown): readonly string[] | undefined {
    if (value === undefined) {
        return undefined;
    } else if (relation !== "contracts") {
        throw new Error(`parties is only supported for contracts`);
    } else if (!Array.isArray(value) || value.some((party) => typeof party !== "string")) {
        throw new Error("parties must be an array of strings");
    }

    return [...new Set(value)].sort();
}

function normalizeAggregates(relation: QueryRelation, value: UnknownRecord, numericOnly = false): NormalizedAggregateSelection {
    const fields = numericOnly ? queryRelationMetadata[relation].numericFields : queryRelationMetadata[relation].fields;

    assertKnown(value, ["count", "min", "max", "sum"], "aggregate");

    const normalize = (name: "min" | "max" | "sum"): readonly string[] => {
        const selected = value[name];

        if (selected === undefined) {
            return [];
        } else if (!Array.isArray(selected) || selected.some((field) => typeof field !== "string" || !fields.includes(field))) {
            throw new Error(`${name} must contain fields of ${relation}`);
        }

        return [...new Set(selected)];
    };

    if (value.count !== undefined && value.count !== true) {
        throw new Error("aggregate.count must be true");
    }

    const aggregates = { count: value.count === true, min: normalize("min"), max: normalize("max"), sum: normalize("sum") };

    if (!aggregates.count && aggregates.min.length === 0 && aggregates.max.length === 0 && aggregates.sum.length === 0) {
        throw new Error("aggregate requires at least one selection");
    }

    return aggregates;
}

function normalizeGroupKey(relation: QueryRelation, value: unknown): NormalizedGroupKey {
    const metadata = queryRelationMetadata[relation];

    if (typeof value === "string") {
        if (!metadata.groupFields.includes(value)) {
            throw new Error(`${value} is not a group key of ${relation}`);
        }

        return { kind: "field", path: [value] };
    }

    const key = object(value, "group key");

    const entries = Object.entries(key);

    if (entries.length !== 1) {
        throw new Error("group key must contain exactly one field");
    }

    const [field, nested] = entries[0];

    if (metadata.jsonFields.includes(field)) {
        const projection = normalizeJsonGroup(field, nested);

        return { kind: "json", field, name: projection.name, path: projection.path, as: projection.as };
    } else if (metadata.bucketFields.includes(field)) {
        return { kind: "bucket", path: [field], bucket: bucket(nested) };
    }

    const edge = queryRelationEdges[relation]?.[field];

    if (edge?.cardinality !== "one") {
        throw new Error("group key must be a field, JSON projection, or a to-one time bucket");
    }

    const target = object(nested, "related group key");

    const targetEntries = Object.entries(target);

    if (targetEntries.length !== 1 || !queryRelationMetadata[edge.target].bucketFields.includes(targetEntries[0][0])) {
        throw new Error("group key must use a profiled time bucket");
    }

    return { kind: "bucket", path: [field, targetEntries[0][0]], bucket: bucket(targetEntries[0][1]) };
}

function normalizeJsonGroup(field: string, value: unknown): { readonly name: string; readonly path: readonly string[]; readonly as: NormalizedJsonSelection["as"] } {
    const projection = object(value, `${field} group key`);

    assertKnown(projection, ["name", "path", "as"], `${field} group key`);

    if (typeof projection.name !== "string" || projection.name.length === 0) {
        throw new Error(`${field} group name must be non-empty`);
    } else if (typeof projection.as !== "string" || !jsonScalarTypes.has(projection.as)) {
        throw new Error(`${field} group type is invalid`);
    }

    return { name: projection.name, path: jsonPath(projection.path, `${field} group path`), as: projection.as as NormalizedJsonSelection["as"] };
}

function scalar(field: string, value: unknown): QueryPredicate {
    return { kind: "scalar", path: field.split("."), operator: "equals", value };
}

function combine(kind: "and" | "or", children: readonly QueryPredicate[]): QueryPredicate | undefined {
    if (children.length === 0) {
        return undefined;
    }

    return children.length === 1 ? children[0] : { kind, children };
}

function provesActive(predicate: QueryPredicate | undefined): boolean {
    if (predicate === undefined) {
        return false;
    } else if (predicate.kind === "scalar") {
        return predicate.path.length === 1 && predicate.path[0] === "active" && predicate.operator === "equals" && predicate.value === true;
    } else if (predicate.kind === "and") {
        return predicate.children.some(provesActive);
    } else if (predicate.kind === "or") {
        return predicate.children.length > 0 && predicate.children.every(provesActive);
    }

    return false;
}

function validateOperatorValue(operator: ScalarOperator, value: unknown, field: string): void {
    if ((operator === "is" || operator === "isNot") && value !== null) {
        throw new Error(`${operator} for ${field} must be null`);
    } else if (operator === "in" && !Array.isArray(value)) {
        throw new Error(`in for ${field} must be an array`);
    } else if (operator === "has" && typeof value !== "string") {
        throw new Error(`has for ${field} must be a string`);
    }
}

function assertUniqueEqualityValue(field: string, value: unknown): void {
    if (value !== null && typeof value === "object" && !(value instanceof Date) && !(value instanceof Uint8Array)) {
        throw new Error(`findUnique.where.${field} must be a scalar equality value`);
    }
}

function normalizeContractWitnesses(value: unknown): readonly QueryPredicate[] {
    const filter = object(value, "witnesses filter");

    if (Object.keys(filter).length !== 1 || typeof filter.has !== "string") {
        throw new Error("witnesses must use { has: string }");
    }

    return [{ kind: "scalar", path: ["witnesses"], operator: "has", value: filter.has }];
}

function jsonPath(value: unknown, label: string): readonly string[] {
    if (!Array.isArray(value) || value.length === 0 || value.some((segment) => typeof segment !== "string" || segment.length === 0)) {
        throw new Error(`${label} must be a non-empty JSON path`);
    }

    return value;
}

function object(value: unknown, label: string): UnknownRecord {
    if (value === null || typeof value !== "object" || Array.isArray(value) || value instanceof Date || value instanceof Uint8Array) {
        throw new Error(`${label} must be an object`);
    }

    return value as UnknownRecord;
}

function isFilter(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Uint8Array);
}

function isScalarFilter(value: unknown): value is UnknownRecord {
    return isFilter(value) && Object.keys(value).some((key) => scalarOperators.has(key as ScalarOperator));
}

function assertKnown(value: UnknownRecord, allowed: readonly string[], label: string): void {
    for (const key of Object.keys(value)) {
        if (!allowed.includes(key)) {
            throw new Error(`${key} is not supported by ${label}`);
        }
    }
}

function bucket(value: unknown): "hour" | "day" | "week" | "month" {
    const source = object(value, "time bucket");

    assertKnown(source, ["bucket"], "time bucket");

    if (typeof source.bucket !== "string" || !buckets.has(source.bucket)) {
        throw new Error("invalid time bucket");
    }

    return source.bucket as "hour" | "day" | "week" | "month";
}

function fail(message: string): never {
    throw new Error(message);
}
