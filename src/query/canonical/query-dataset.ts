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
