import type { NormalizedAggregateQuery, NormalizedFindManyQuery, NormalizedFindUniqueQuery, NormalizedGroupByQuery, NormalizedGroupKey, NormalizedInclude, NormalizedSelection, QueryPredicate } from "./query-ast.js";
import type { QueryDataset, QueryRow } from "./query-dataset.js";
import { queryRelationEdges, type QueryRelation } from "./query-schema.js";

type Result = Record<string, unknown>;

/** Reference evaluator for normalized canonical plans; it intentionally has no transport concerns. */
export class InMemoryQueryEvaluator {
    public execute(dataset: QueryDataset, query: NormalizedFindManyQuery | NormalizedFindUniqueQuery | NormalizedAggregateQuery | NormalizedGroupByQuery | { readonly kind: "count"; readonly relation: QueryRelation; readonly parties?: readonly string[]; readonly predicate?: QueryPredicate; readonly activeOnly: boolean }): unknown {
        switch (query.kind) {
            case "findMany": return freeze(this.findMany(dataset, query));
            case "findUnique": return freeze(this.findMany(dataset, { kind: "findMany", relation: query.relation, predicate: query.predicate, select: query.select, includes: query.includes, orderBy: [], skip: 0, take: 1, activeOnly: false })[0]);
            case "count": return this.filtered(dataset, query.relation, query.predicate, query.parties, query.activeOnly).length;
            case "aggregate": return freeze(this.aggregate(this.filtered(dataset, query.relation, query.predicate), query));
            case "groupBy": return freeze(this.groupBy(dataset, query));
        }
    }

    private findMany(dataset: QueryDataset, query: NormalizedFindManyQuery): Result[] {
        const rows = this.order(this.filtered(dataset, query.relation, query.predicate, query.parties, query.activeOnly), query.orderBy)
            .slice(query.skip, query.take === undefined ? undefined : query.skip + query.take);

        return rows.map((row) => this.shape(dataset, query.relation, row, query.select, query.includes));
    }

    private filtered(dataset: QueryDataset, relation: QueryRelation, predicate?: QueryPredicate, parties?: readonly string[], activeOnly = false): QueryRow[] {
        return dataset.rows[relation].filter((row) =>
            (!activeOnly || row.active === true)
            && (parties === undefined || (Array.isArray(row.witnesses) && row.witnesses.some((party) => parties.includes(String(party)))))
            && (predicate === undefined || this.matches(dataset, relation, row, predicate)));
    }

    private matches(dataset: QueryDataset, relation: QueryRelation, row: QueryRow, predicate: QueryPredicate): boolean {
        switch (predicate.kind) {
            case "and": return predicate.children.every((child) => this.matches(dataset, relation, row, child));
            case "or": return predicate.children.some((child) => this.matches(dataset, relation, row, child));
            case "not": return !this.matches(dataset, relation, row, predicate.child);
            case "relation": {
                const edge = queryRelationEdges[relation]?.[predicate.edge];

                if (edge === undefined) {
                    throw new Error(`Unknown ${relation}.${predicate.edge} edge`);
                }

                const related = this.related(dataset, relation, row, predicate.edge);

                const result = related.map((target) => this.matches(dataset, edge.target, target, predicate.predicate));

                return predicate.quantifier === "one" ? result[0] === true : predicate.quantifier === "some" ? result.some(Boolean) : predicate.quantifier === "none" ? !result.some(Boolean) : result.every(Boolean);
            }
            case "scalar": {
                const actual = at(row, predicate.path);

                const expected = predicate.value;

                switch (predicate.operator) {
                    case "equals": return equal(actual, expected);
                    case "in": return Array.isArray(expected) && expected.some((candidate) => equal(actual, candidate));
                    case "is": return actual === null || actual === undefined;
                    case "isNot": return actual !== null && actual !== undefined;
                    case "lt": return compare(actual, expected) < 0;
                    case "lte": return compare(actual, expected) <= 0;
                    case "gt": return compare(actual, expected) > 0;
                    case "gte": return compare(actual, expected) >= 0;
                    case "like": return typeof actual === "string" && typeof expected === "string" && sqlLike(actual, expected, false);
                    case "ilike": return typeof actual === "string" && typeof expected === "string" && sqlLike(actual, expected, true);
                    case "has": return Array.isArray(actual) && actual.some((entry) => equal(entry, expected));
                }

                return false;
            }
        }
    }

    private related(dataset: QueryDataset, relation: QueryRelation, row: QueryRow, edge: string): QueryRow[] {
        const definition = queryRelationEdges[relation]?.[edge];

        const lookup = dataset.edges[relation]?.[edge];

        if (definition === undefined || lookup === undefined || lookup.from.length !== lookup.to.length) {
            throw new Error(`Missing deterministic lookup for ${relation}.${edge}`);
        }

        const source = lookup.from.map((path) => at(row, path.split(".")));

        if (source.some((value) => value === null || value === undefined)) {
            return [];
        }

        return dataset.rows[definition.target].filter((candidate) => lookup.to.every((path, index) => equal(at(candidate, path.split(".")), source[index])));
    }

    private shape(dataset: QueryDataset, relation: QueryRelation, row: QueryRow, selection: NormalizedSelection | undefined, includes: readonly NormalizedInclude[]): Result {
        const fields = selection?.fields ?? Object.keys(row);

        const result: Result = Object.fromEntries(fields.filter((field) => Object.hasOwn(row, field)).map((field) => [field, clone(row[field])]));

        for (const projection of selection?.json ?? []) {
            result[projection.name] = project(at(row, [projection.field, ...projection.path]), projection.as);
        }

        for (const include of includes) {
            const targets = this.related(dataset, relation, row, include.edge).filter((target) => include.predicate === undefined || this.matches(dataset, include.relation, target, include.predicate));

            const bounded = this.order(targets, include.orderBy).slice(include.skip, include.take === undefined ? undefined : include.skip + include.take)
                .map((target) => this.shape(dataset, include.relation, target, include.select, include.includes));

            result[include.edge] = include.cardinality === "many" ? bounded : (bounded[0] ?? null);
        }

        return result;
    }

    private order(rows: readonly QueryRow[], orderBy: readonly { readonly path: readonly string[]; readonly direction: "asc" | "desc" }[]): QueryRow[] {
        return rows.map((row, index) => ({ row, index })).sort((left, right) => {
            for (const order of orderBy) {
                const compared = postgresCompare(at(left.row, order.path), at(right.row, order.path), order.direction);

                if (compared !== 0) {
                    return compared;
                }
            }

            return left.index - right.index;
        }).map(({ row }) => row);
    }

    private aggregate(rows: readonly QueryRow[], query: NormalizedAggregateQuery | NormalizedGroupByQuery): Result {
        const result: Result = {};

        if (query.aggregates.count) {
            result.count = rows.length;
        }

        for (const operation of ["min", "max", "sum"] as const) {
            if (query.aggregates[operation].length > 0) {
            result[operation] = Object.fromEntries(query.aggregates[operation].map((field) => [field, aggregate(rows.map((row) => at(row, [field])), operation)]));
        }
        }

        return result;
    }

    private groupBy(dataset: QueryDataset, query: NormalizedGroupByQuery): Result[] {
        const groups = new Map<string, { keys: unknown[]; rows: QueryRow[] }>();

        for (const row of this.filtered(dataset, query.relation, query.predicate)) {
            const keyVariants = query.by.map((key) => this.groupValues(dataset, query.relation, row, key));

            for (const keys of cartesian(keyVariants)) {
                const identity = JSON.stringify(keys.map(keyIdentity));

                const group = groups.get(identity) ?? { keys, rows: [] };

                group.rows.push(row); groups.set(identity, group);
            }
        }

        return [...groups.values()].map(({ keys, rows }) => {
            const result: Result = Object.fromEntries(query.by.map((key, index) => [groupName(key), clone(keys[index])]));

            if (query.aggregates.count) {
                result.count = rows.length;
            }

            for (const operation of ["min", "max", "sum"] as const) {
                for (const field of query.aggregates[operation]) {
                    result[`${operation}_${field}`] = aggregate(rows.map((row) => at(row, [field])), operation);
                }
            }

            return result;
        });
    }

    private groupValues(dataset: QueryDataset, relation: QueryRelation, row: QueryRow, key: NormalizedGroupKey): unknown[] {
        if (key.kind === "field") {
            const value = at(row, key.path);

            return Array.isArray(value) ? value : [value];
        } else if (key.kind === "json") {
            return [project(at(row, [key.field, ...key.path]), key.as)];
        } else if (key.kind !== "bucket") {
            return [];
        }

        const value = key.path.length === 1 ? at(row, key.path) : this.related(dataset, relation, row, key.path[0])[0] && at(this.related(dataset, relation, row, key.path[0])[0]!, [key.path[1]!]);

        return [bucket(value, key.bucket)];
    }
}

function at(value: unknown, path: readonly string[]): unknown {
    let current: unknown = value;

    for (const key of path) {
        if (current === null || current === undefined || typeof current !== "object") {
            return undefined;
        }

        current = (current as Record<string, unknown>)[key];
    }

    return current;
}
function clone(value: unknown): unknown {
    if (value instanceof Date) {
        return new Date(value.getTime());
    } else if (value instanceof Uint8Array) {
        return new Uint8Array(value);
    } else if (Array.isArray(value)) {
        return value.map(clone);
    } else if (value !== null && typeof value === "object") {
        return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, child]) => [key, clone(child)]));
    }

    return value;
}
function freeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || value instanceof Date) {
        return value;
    } else if (Object.isFrozen(value)) {
        return value;
    }

    for (const child of Object.values(value as Record<string, unknown>)) {
        freeze(child);
    }

    return Object.freeze(value);
}
function equal(left: unknown, right: unknown): boolean {
    if (left instanceof Date) {
        return left.toISOString() === (right instanceof Date ? right.toISOString() : String(right));
    } else if (right instanceof Date) {
        return String(left) === right.toISOString();
    } else if (left instanceof Uint8Array || right instanceof Uint8Array) {
        return JSON.stringify(Array.from(left as Uint8Array)) === JSON.stringify(Array.from(right as Uint8Array));
    }

    return JSON.stringify(left) === JSON.stringify(right);
}
function compare(left: unknown, right: unknown): number {
    if (left === null || left === undefined || right === null || right === undefined) {
        return Number.NaN;
    } else if (left instanceof Date || right instanceof Date) {
        const leftTime = left instanceof Date ? left.getTime() : new Date(String(left)).getTime();

        const rightTime = right instanceof Date ? right.getTime() : new Date(String(right)).getTime();

        return !Number.isFinite(leftTime) || !Number.isFinite(rightTime) ? Number.NaN : leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
    }

    const leftValue = numeric(left) ?? String(left);

    const rightValue = numeric(right) ?? String(right);

    return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}
function numeric(value: unknown): bigint | undefined {
    return typeof value === "string" && /^-?\d+$/.test(value) ? BigInt(value) : typeof value === "number" && Number.isFinite(value) ? BigInt(value) : undefined;
}
function postgresCompare(left: unknown, right: unknown, direction: "asc" | "desc"): number {
    const leftNull = left === null || left === undefined;

    const rightNull = right === null || right === undefined;

    if (leftNull || rightNull) {
        if (leftNull && rightNull) {
            return 0;
        }

        return leftNull ? (direction === "asc" ? 1 : -1) : (direction === "asc" ? -1 : 1);
    }

    const result = compare(left, right);

    return direction === "asc" ? result : -result;
}
function sqlLike(value: string, pattern: string, insensitive: boolean): boolean {
    let expression = "^";

    for (let index = 0; index < pattern.length; index += 1) {
        const character = pattern[index]!;

        if (character === "\\" && index + 1 < pattern.length) {
            expression += escapeRegex(pattern[++index]!);
        } else if (character === "%") {
            expression += ".*";
        } else if (character === "_") {
            expression += ".";
        } else {
            expression += escapeRegex(character);
        }
    }

    return new RegExp(`${expression}$`, insensitive ? "i" : "").test(value);
}
function escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function project(value: unknown, as: "text" | "numeric" | "boolean" | "timestamp"): unknown {
    if (value === null || value === undefined) {
        return null;
    } else if (as === "boolean") {
        return value === true || value === "true";
    } else if (as === "timestamp") {
        return value instanceof Date ? new Date(value.getTime()) : new Date(String(value));
    }

    return String(value);
}
function aggregate(values: readonly unknown[], operation: "min" | "max" | "sum"): string | null {
    const present = values.filter((value) => value !== null && value !== undefined);

    if (present.length === 0) {
        return null;
    }

    const numbers = present.map((value) => BigInt(String(value)));

    if (operation === "sum") {
        return numbers.reduce((total, value) => total + value, 0n).toString();
    }

    return numbers.reduce((winner, value) => operation === "min" ? value < winner ? value : winner : value > winner ? value : winner).toString();
}
function cartesian(parts: readonly unknown[][]): unknown[][] {
    return parts.reduce<unknown[][]>((all, part) => all.flatMap((prefix) => part.map((value) => [...prefix, value])), [[]]);
}
function keyIdentity(value: unknown): unknown {
    return value instanceof Date ? value.toISOString() : value;
}
function groupName(key: NormalizedGroupKey): string {
    return key.kind === "field" ? key.path.join("_") : key.kind === "json" ? key.name : key.path.join("_") + "_" + key.bucket;
}
function bucket(value: unknown, unit: "hour" | "day" | "week" | "month"): Date | null {
    if (value === null || value === undefined) {
        return null;
    }

    const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value));

    if (Number.isNaN(date.getTime())) {
        return null;
    } else if (unit === "hour") {
        date.setUTCMinutes(0, 0, 0);
    } else if (unit === "day") {
        date.setUTCHours(0, 0, 0, 0);
    } else if (unit === "month") {
        date.setUTCDate(1); date.setUTCHours(0, 0, 0, 0);
    } else {
        const day = date.getUTCDay() || 7;

        date.setUTCDate(date.getUTCDate() - day + 1); date.setUTCHours(0, 0, 0, 0);
    }

    return date;
}
