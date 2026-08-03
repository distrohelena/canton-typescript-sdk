import type { QueryRelation } from "./query-schema.js";

export type ScalarOperator = "equals" | "in" | "is" | "isNot" | "lt" | "lte" | "gt" | "gte" | "like" | "ilike" | "has";
export type QueryOrderDirection = "asc" | "desc";

export type QueryPredicate =
    | { readonly kind: "and" | "or"; readonly children: readonly QueryPredicate[] }
    | { readonly kind: "not"; readonly child: QueryPredicate }
    | { readonly kind: "scalar"; readonly path: readonly string[]; readonly operator: ScalarOperator; readonly value: unknown }
    | { readonly kind: "relation"; readonly edge: string; readonly quantifier: "one" | "some" | "none" | "every"; readonly predicate: QueryPredicate };

export interface NormalizedOrder {
    readonly path: readonly string[];
    readonly direction: QueryOrderDirection;
}

export interface NormalizedJsonSelection {
    readonly name: string;
    readonly field: string;
    readonly path: readonly string[];
    readonly as: "text" | "numeric" | "boolean" | "timestamp";
}

export interface NormalizedSelection {
    readonly fields: readonly string[];
    readonly json: readonly NormalizedJsonSelection[];
}

export interface NormalizedInclude {
    readonly edge: string;
    readonly relation: QueryRelation;
    readonly cardinality: "one" | "many";
    readonly predicate?: QueryPredicate;
    readonly select?: NormalizedSelection;
    readonly includes: readonly NormalizedInclude[];
    readonly orderBy: readonly NormalizedOrder[];
    readonly skip: number;
    readonly take?: number;
}

export interface NormalizedFindManyQuery {
    readonly kind: "findMany";
    readonly relation: QueryRelation;
    readonly parties?: readonly string[];
    readonly predicate?: QueryPredicate;
    readonly select?: NormalizedSelection;
    readonly includes: readonly NormalizedInclude[];
    readonly orderBy: readonly NormalizedOrder[];
    readonly skip: number;
    readonly take?: number;
    readonly activeOnly: boolean;
}

export interface NormalizedFindUniqueQuery {
    readonly kind: "findUnique";
    readonly relation: QueryRelation;
    readonly predicate: QueryPredicate;
    readonly select?: NormalizedSelection;
    readonly includes: readonly NormalizedInclude[];
}

export interface NormalizedCountQuery {
    readonly kind: "count";
    readonly relation: QueryRelation;
    readonly parties?: readonly string[];
    readonly predicate?: QueryPredicate;
    readonly activeOnly: boolean;
}

export interface NormalizedAggregateSelection {
    readonly count: boolean;
    readonly min: readonly string[];
    readonly max: readonly string[];
    readonly sum: readonly string[];
}

export interface NormalizedAggregateQuery {
    readonly kind: "aggregate";
    readonly relation: QueryRelation;
    readonly predicate?: QueryPredicate;
    readonly aggregates: NormalizedAggregateSelection;
}

export type NormalizedGroupKey =
    | { readonly kind: "field"; readonly path: readonly string[] }
    | { readonly kind: "json"; readonly field: string; readonly name: string; readonly path: readonly string[]; readonly as: "text" | "numeric" | "boolean" | "timestamp" }
    | { readonly kind: "bucket"; readonly path: readonly string[]; readonly bucket: "hour" | "day" | "week" | "month" };

export interface NormalizedGroupByQuery {
    readonly kind: "groupBy";
    readonly relation: QueryRelation;
    readonly predicate?: QueryPredicate;
    readonly by: readonly NormalizedGroupKey[];
    readonly aggregates: NormalizedAggregateSelection;
}
