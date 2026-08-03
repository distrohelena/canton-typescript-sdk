import { queryRelationEdges, queryRelationMetadata, type QueryRelation } from "./query-schema.js";

/** Canonical rows are deliberately source-neutral: all source-local ids are ordinary values. */
export type QueryRow = Readonly<Record<string, unknown>>;
export type QueryRowSets = Readonly<Record<QueryRelation, readonly QueryRow[]>>;

/** A directional join from the owning row to a target relation row. */
export interface QueryEdgeLookup {
    readonly from: readonly string[];
    readonly to: readonly string[];
}

export type QueryEdgeLookups = Readonly<Partial<Record<QueryRelation, Readonly<Record<string, QueryEdgeLookup>>>>>;

/**
 * A deterministic, in-memory canonical data source.  `sourceLocalKeys` documents
 * source-local identity only; the evaluator never gives those fields special semantics.
 */
export interface QueryDataset {
    readonly rows: QueryRowSets;
    readonly edges: QueryEdgeLookups;
    readonly sourceLocalKeys: Readonly<Record<QueryRelation, readonly (readonly string[])[]>>;
}

type EdgeIndexes = ReadonlyMap<QueryRelation, ReadonlyMap<string, ReadonlyMap<string, readonly QueryRow[]>>>;

const datasetIndexes = new WeakMap<QueryDataset, EdgeIndexes>();

const compiledSnapshots = new WeakMap<QueryDataset, QueryDataset>();

const datasetPaths = Object.fromEntries((Object.keys(queryRelationMetadata) as QueryRelation[]).map((relation) => [relation, [
    ...queryRelationMetadata[relation].fields,
    ...(relation === "contracts" ? ["templateId.packageId", "templateId.moduleName", "templateId.entityName"] : []),
]])) as unknown as Readonly<Record<QueryRelation, readonly string[]>>;

/** Validates and freezes source-neutral rows, then builds deterministic edge indexes once. */
export function createQueryDataset(input: QueryDataset): QueryDataset {
    if (datasetIndexes.has(input)) {
        return input;
    }

    const cached = compiledSnapshots.get(input);

    if (cached !== undefined) {
        return cached;
    }

    const dataset = immutableQueryValue(input);

    const relations = Object.keys(queryRelationMetadata) as QueryRelation[];

    const indexes = new Map<QueryRelation, ReadonlyMap<string, ReadonlyMap<string, readonly QueryRow[]>>>();

    for (const relation of relations) {
        const rows = dataset.rows[relation];

        if (!Array.isArray(rows)) {
            throw new Error(`Dataset is missing ${relation} rows`);
        }

        const localKeys = dataset.sourceLocalKeys[relation];

        if (!Array.isArray(localKeys)) {
            throw new Error(`Dataset is missing ${relation} source-local keys`);
        }

        for (const key of localKeys) {
            validateUniquePaths(relation, rows, key, `${relation} source-local key`);
        }
    }

    for (const relation of relations) {
        const rows = dataset.rows[relation];

        if (!Array.isArray(rows)) {
            throw new Error(`Dataset is missing ${relation} rows`);
        }

        const edgeDefinitions = queryRelationEdges[relation] ?? {};

        const lookups = dataset.edges[relation];

        if (lookups === undefined) {
            throw new Error(`Dataset is missing ${relation} edges`);
        }

        const relationIndexes = new Map<string, ReadonlyMap<string, readonly QueryRow[]>>();

        for (const [edge, definition] of Object.entries(edgeDefinitions)) {
            const lookup = lookups[edge];

            if (lookup === undefined) {
                throw new Error(`Dataset is missing ${relation}.${edge} edge`);
            } else if (lookup.from.length !== lookup.to.length) {
                throw new Error(`Dataset ${relation}.${edge} lookup arity differs`);
            }

            validatePaths(relation, rows, lookup.from, `${relation}.${edge} source`);

            const targetRows = dataset.rows[definition.target];

            validatePaths(definition.target, targetRows, lookup.to, `${relation}.${edge} target`);

            const buckets = new Map<string, QueryRow[]>();

            for (const target of targetRows) {
                const key = compositeKey(lookup.to.map((path) => atPath(target, path)));

                buckets.set(key, [...(buckets.get(key) ?? []), target]);
            }

            if (definition.cardinality === "one" && [...buckets.values()].some((targets) => targets.length > 1)) {
                throw new Error(`Dataset ${relation}.${edge} has multiple to-one targets`);
            }

            relationIndexes.set(edge, buckets);
        }

        if (Object.keys(lookups).some((edge) => edgeDefinitions[edge] === undefined)) {
            throw new Error(`Dataset ${relation} declares an unknown edge`);
        }

        indexes.set(relation, relationIndexes);
    }

    datasetIndexes.set(dataset, indexes);
    compiledSnapshots.set(input, dataset);

    return dataset;
}

/** Uses the factory index, compiling a legacy dataset on first use for compatibility. */
export function relatedQueryRows(dataset: QueryDataset, relation: QueryRelation, row: QueryRow, edge: string): readonly QueryRow[] {
    const compiled = createQueryDataset(dataset);

    const lookup = compiled.edges[relation]?.[edge];

    const index = datasetIndexes.get(compiled)?.get(relation)?.get(edge);

    if (lookup === undefined || index === undefined) {
        throw new Error(`Missing deterministic lookup for ${relation}.${edge}`);
    }

    const values = lookup.from.map((path) => atPath(row, path));

    return values.some((value) => value === null || value === undefined) ? [] : index.get(compositeKey(values)) ?? [];
}

function validateUniquePaths(relation: QueryRelation, rows: readonly QueryRow[], paths: readonly string[], label: string): void {
    if (paths.length === 0) {
        throw new Error(`Dataset ${label} is empty`);
    }

    validatePaths(relation, rows, paths, label);

    const seen = new Set<string>();

    for (const row of rows) {
        const key = compositeKey(paths.map((path) => atPath(row, path)));

        if (seen.has(key)) {
            throw new Error(`Dataset ${label} is not unique`);
        }

        seen.add(key);
    }
}
function validatePaths(relation: QueryRelation, rows: readonly QueryRow[], paths: readonly string[], label: string): void {
    for (const path of paths) {
        if (!datasetPaths[relation].includes(path)) {
            throw new Error(`Dataset ${label} path ${path} is invalid`);
        }
    }

    for (const row of rows) {
        for (const path of paths) {
            if (!hasPath(row, path)) {
                throw new Error(`Dataset ${label} path ${path} is invalid`);
            }
        }
    }
}
function hasPath(value: unknown, path: string): boolean {
    let current = value;

    for (const segment of path.split(".")) {
        if (current === null || typeof current !== "object" || !Object.hasOwn(current, segment)) {
            return false;
        }

        current = (current as Record<string, unknown>)[segment];
    }

    return true;
}
function atPath(value: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, segment) => current !== null && typeof current === "object" ? (current as Record<string, unknown>)[segment] : undefined, value);
}
function compositeKey(values: readonly unknown[]): string {
    return JSON.stringify(values.map((value) => value instanceof Date ? value.toISOString() : value instanceof Uint8Array ? Array.from(value) : value));
}

/** A Date which preserves Date's public read API but rejects mutation. */
export class ImmutableQueryDate extends Date {
    /** Legacy Date API, absent from newer TypeScript lib declarations. */
    public setYear(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setTime(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setMilliseconds(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setSeconds(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setMinutes(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setHours(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setDate(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setMonth(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setFullYear(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCMilliseconds(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCSeconds(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCMinutes(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCHours(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCDate(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCMonth(): never {
        throw new TypeError("Query dates are immutable");
    }
    public override setUTCFullYear(): never {
        throw new TypeError("Query dates are immutable");
    }
}

/** Recursively clones and freezes query values without retaining mutable input references. */
export function immutableQueryValue<T>(value: T): T {
    if (value instanceof Date) {
        return immutableQueryDate(value) as T;
    } else if (value instanceof Uint8Array) {
        return immutableQueryBytes(value) as T;
    } else if (Array.isArray(value)) {
        return Object.freeze(value.map((entry) => immutableQueryValue(entry))) as T;
    } else if (value !== null && typeof value === "object") {
        return Object.freeze(Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, immutableQueryValue(entry)]))) as T;
    }

    return value;
}

/** A proxy has no [[DateValue]], so Date.prototype mutators cannot bypass this wrapper. */
function immutableQueryDate(value: Date): Date {
    const target = new Date(value.getTime());

    const mutation = () => {
        throw new TypeError("Query dates are immutable");
    };

    const setters = new Set([
        "setDate", "setFullYear", "setHours", "setMilliseconds", "setMinutes", "setMonth", "setSeconds", "setTime", "setUTCDate",
        "setUTCFullYear", "setUTCHours", "setUTCMilliseconds", "setUTCMinutes", "setUTCMonth", "setUTCSeconds", "setYear",
    ]);

    return Object.freeze(new Proxy(target, {
        set: mutation,
        defineProperty: mutation,
        deleteProperty: mutation,
        setPrototypeOf: mutation,
        get(inner, property) {
            if (setters.has(String(property))) {
                return mutation;
            } else if (property === Symbol.toStringTag) {
                return "Date";
            }

            const member = Reflect.get(inner, property, inner);

            return typeof member === "function" ? member.bind(inner) : member;
        },
    }));
}

/** Typed arrays cannot be frozen by JavaScript engines, so guard every write path. */
function immutableQueryBytes(value: Uint8Array): Uint8Array {
    const bytes = new Uint8Array(value);

    const mutation = () => {
        throw new TypeError("Query bytes are immutable");
    };

    let proxy: Uint8Array;

    proxy = new Proxy(bytes, {
        set: mutation,
        defineProperty: mutation,
        deleteProperty: mutation,
        setPrototypeOf: mutation,
        get(target, property) {
            if (["copyWithin", "fill", "reverse", "set", "sort"].includes(String(property))) {
                return mutation;
            } else if (property === "buffer") {
                return target.buffer.slice(0);
            } else if (property === "subarray") {
                return (...args: Parameters<Uint8Array["subarray"]>) => immutableQueryBytes(target.subarray(...args));
            } else if (property === "slice") {
                return (...args: Parameters<Uint8Array["slice"]>) => immutableQueryBytes(target.slice(...args));
            } else if (property === "valueOf") {
                return () => proxy;
            }

            const member = Reflect.get(target, property, target);

            return typeof member === "function" ? member.bind(target) : member;
        },
    });

    return proxy;
}
