import { queryRelationEdges, queryRelationMetadata, type QueryRelation } from "./query-schema.js";

/** Canonical rows are deliberately source-neutral; public ids are semantic values. */
export type QueryRow = Readonly<Record<string, unknown>>;
export type QueryRowSets = Readonly<Record<QueryRelation, readonly QueryRow[]>>;

/** A directional join from the owning row to a target relation row. */
export interface QueryEdgeLookup {
    /** Whether the snapshot contains every target needed to traverse this edge. Defaults to true. */
    readonly complete?: boolean;
    /** Public row paths, retained for legacy datasets. */
    readonly from?: readonly string[];
    readonly to?: readonly string[];
    /**
     * Snapshot-local join values aligned by source/target row position. They are
     * deliberately stored beside the rows rather than attached to them so query
     * results expose only schema fields.
     */
    readonly privateKeys?: Readonly<{
        readonly source: readonly (readonly unknown[])[];
        readonly target: readonly (readonly unknown[])[];
    }>;
}

export type QueryEdgeLookups = Readonly<Partial<Record<QueryRelation, Readonly<Record<string, QueryEdgeLookup>>>>>;

/**
 * A deterministic, in-memory canonical data source. `uniqueKeys` documents
 * public row uniqueness only; the evaluator never gives those fields special semantics.
 */
export interface QueryDataset {
    readonly rows: QueryRowSets;
    readonly edges: QueryEdgeLookups;
    readonly uniqueKeys: Readonly<Record<QueryRelation, readonly (readonly string[])[]>>;
}

/** An edge is declared by the schema but its targets were unavailable in this snapshot. */
export class IncompleteQueryEdgeError extends Error {
    public constructor(public readonly relation: QueryRelation, public readonly edge: string) {
        super(`Dataset edge ${relation}.${edge} is incomplete`);
        this.name = "IncompleteQueryEdgeError";
        Object.freeze(this);
    }
}

interface EdgeIndex {
    readonly targets: ReadonlyMap<string, readonly QueryRow[]>;
    readonly sourcePrivateKeys?: ReadonlyMap<QueryRow, readonly unknown[]>;
}

type EdgeIndexes = ReadonlyMap<QueryRelation, ReadonlyMap<string, EdgeIndex>>;

const datasetIndexes = new WeakMap<QueryDataset, EdgeIndexes>();

const compiledSnapshots = new WeakMap<QueryDataset, QueryDataset>();

const rawRowSnapshots = new WeakMap<QueryDataset, ReadonlyMap<QueryRelation, WeakMap<object, QueryRow>>>();

const compiledRowMembership = new WeakMap<QueryDataset, ReadonlyMap<QueryRelation, WeakSet<object>>>();

const emptyRows: readonly QueryRow[] = Object.freeze([]);

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

    const rowSnapshots = new Map<QueryRelation, WeakMap<object, QueryRow>>();

    const rowMembership = new Map<QueryRelation, WeakSet<object>>();

    for (const relation of Object.keys(queryRelationMetadata) as QueryRelation[]) {
        if (!Array.isArray(input.rows[relation])) {
            throw new Error(`Dataset is missing ${relation} rows`);
        }

        const snapshots = new WeakMap<object, QueryRow>();

        for (const [index, row] of input.rows[relation].entries()) {
            snapshots.set(row as object, dataset.rows[relation][index]!);
        }

        rowSnapshots.set(relation, snapshots);
        rowMembership.set(relation, new WeakSet(dataset.rows[relation].map((row) => row as object)));
    }

    const relations = Object.keys(queryRelationMetadata) as QueryRelation[];

    const indexes = new Map<QueryRelation, ReadonlyMap<string, EdgeIndex>>();

    for (const relation of relations) {
        const rows = dataset.rows[relation];

        if (!Array.isArray(rows)) {
            throw new Error(`Dataset is missing ${relation} rows`);
        }

        const localKeys = dataset.uniqueKeys[relation];

        if (!Array.isArray(localKeys)) {
            throw new Error(`Dataset is missing ${relation} unique keys`);
        }

        for (const key of localKeys) {
            validateUniquePaths(relation, rows, key, `${relation} unique key`);
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

        const relationIndexes = new Map<string, EdgeIndex>();

        for (const [edge, definition] of Object.entries(edgeDefinitions)) {
            const lookup = lookups[edge];

            if (lookup === undefined) {
                throw new Error(`Dataset is missing ${relation}.${edge} edge`);
            } else if (lookup.complete !== undefined && typeof lookup.complete !== "boolean") {
                throw new Error(`Dataset ${relation}.${edge} completeness marker is invalid`);
            }

            const targetRows = dataset.rows[definition.target];

            const buckets = new Map<string, QueryRow[]>();

            let sourcePrivateKeys: ReadonlyMap<QueryRow, readonly unknown[]> | undefined;

            if (lookup.privateKeys !== undefined) {
                if (lookup.from !== undefined || lookup.to !== undefined) {
                    throw new Error(`Dataset ${relation}.${edge} cannot mix public and private lookup keys`);
                }

                validatePrivateKeys(relation, edge, lookup.privateKeys, rows, targetRows);
                sourcePrivateKeys = new Map(rows.map((row, index) => [row, lookup.privateKeys!.source[index]!]));

                for (const [index, target] of targetRows.entries()) {
                    const key = compositeKey(lookup.privateKeys.target[index]!);

                    buckets.set(key, [...(buckets.get(key) ?? []), target]);
                }
            } else {
                if (lookup.from === undefined || lookup.to === undefined) {
                    throw new Error(`Dataset ${relation}.${edge} lookup is missing public paths`);
                } else if (lookup.from.length !== lookup.to.length) {
                    throw new Error(`Dataset ${relation}.${edge} lookup arity differs`);
                }

                validatePaths(relation, rows, lookup.from, `${relation}.${edge} source`);
                validatePaths(definition.target, targetRows, lookup.to, `${relation}.${edge} target`);

                for (const target of targetRows) {
                    const key = compositeKey(lookup.to.map((path) => atPath(target, path)));

                    buckets.set(key, [...(buckets.get(key) ?? []), target]);
                }
            }

            if (definition.cardinality === "one" && [...buckets.values()].some((targets) => targets.length > 1)) {
                throw new Error(`Dataset ${relation}.${edge} has multiple to-one targets`);
            } else if (definition.cardinality === "one" && !definition.nullable && lookup.complete !== false) {
                for (const [index, source] of rows.entries()) {
                    const values = lookup.privateKeys === undefined
                        ? lookup.from!.map((path) => atPath(source, path))
                        : lookup.privateKeys.source[index]!;

                    if (values.some((value) => value === null || value === undefined) || !buckets.has(compositeKey(values))) {
                        throw new Error(`Dataset ${relation}.${edge} has no target`);
                    }
                }
            }

            relationIndexes.set(edge, { targets: new Map([...buckets.entries()].map(([key, targets]) => [key, Object.freeze(targets)])), ...(sourcePrivateKeys === undefined ? {} : { sourcePrivateKeys }) });
        }

        if (Object.keys(lookups).some((edge) => edgeDefinitions[edge] === undefined)) {
            throw new Error(`Dataset ${relation} declares an unknown edge`);
        }

        indexes.set(relation, relationIndexes);
    }

    datasetIndexes.set(dataset, indexes);
    compiledSnapshots.set(input, dataset);
    rawRowSnapshots.set(input, rowSnapshots);
    compiledRowMembership.set(dataset, rowMembership);

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

    const snapshotRow = dataset === compiled
        ? compiledRowMembership.get(compiled)?.get(relation)?.has(row as object) ? row : undefined
        : rawRowSnapshots.get(dataset)?.get(relation)?.get(row as object);

    if (snapshotRow === undefined) {
        throw new Error(`Query row does not belong to ${relation} dataset`);
    } else if (lookup.complete === false) {
        throw new IncompleteQueryEdgeError(relation, edge);
    }

    const values = lookup.privateKeys === undefined
        ? lookup.from!.map((path) => atPath(snapshotRow, path))
        : index.sourcePrivateKeys?.get(snapshotRow);

    return values === undefined || values.some((value) => value === null || value === undefined) ? emptyRows : index.targets.get(compositeKey(values)) ?? emptyRows;
}

function validatePrivateKeys(relation: QueryRelation, edge: string, keys: NonNullable<QueryEdgeLookup["privateKeys"]>, sourceRows: readonly QueryRow[], targetRows: readonly QueryRow[]): void {
    if (!Array.isArray(keys.source) || keys.source.length !== sourceRows.length) {
        throw new Error(`Dataset ${relation}.${edge} private source length differs`);
    } else if (!Array.isArray(keys.target) || keys.target.length !== targetRows.length) {
        throw new Error(`Dataset ${relation}.${edge} private target length differs`);
    }

    if (keys.source.length === 0 && keys.target.length === 0) {
        return;
    }

    const arity = keys.source[0]?.length ?? keys.target[0]?.length;

    if (arity === undefined || arity === 0 || !keys.source.every((key) => Array.isArray(key) && key.length === arity) || !keys.target.every((key) => Array.isArray(key) && key.length === arity)) {
        throw new Error(`Dataset ${relation}.${edge} private lookup arity differs`);
    }
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
