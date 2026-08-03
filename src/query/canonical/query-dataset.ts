import type { QueryRelation } from "./query-schema.js";

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
