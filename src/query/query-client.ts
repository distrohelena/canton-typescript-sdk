import { QuerySource } from "./query-source.js";
import {
    ContractTypeOrderBy,
    ContractTypeRow,
    ContractTypeSelect,
    ContractTypeUnique,
    ContractTypeWhere,
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractRow,
    EventOrderBy,
    EventRow,
    EventSelect,
    EventUnique,
    EventWhere,
    ExerciseOrderBy,
    ExerciseRow,
    ExerciseSelect,
    ExerciseTypeOrderBy,
    ExerciseTypeRow,
    ExerciseTypeSelect,
    ExerciseTypeUnique,
    ExerciseTypeWhere,
    ExerciseWhere,
    PackageOrderBy,
    PackageRow,
    PackageSelect,
    PackageUnique,
    PackageWhere,
    TransactionOrderBy,
    TransactionRow,
    TransactionSelect,
    TransactionUnique,
    TransactionWhere,
    WatermarkOrderBy,
    WatermarkRow,
    WatermarkSelect,
    WatermarkUnique,
    WatermarkWhere,
} from "./model-types.js";

export interface FindManyArgs<TWhere, TSelect, TOrderBy> {
    readonly where?: TWhere;
    readonly select?: TSelect;
    readonly orderBy?: TOrderBy;
    readonly skip?: number;
    readonly take?: number;
}

export interface QueryDelegate<TRow, TWhere, TSelect, TOrderBy, TUnique> {
    findMany(args?: FindManyArgs<TWhere, TSelect, TOrderBy>): Promise<readonly TRow[]>;
    findUnique(args: { readonly where: TUnique; readonly select?: TSelect }): Promise<TRow | undefined>;
    count(args?: { readonly where?: TWhere }): Promise<number>;
    aggregate(args: {
        readonly where?: TWhere;
        readonly count?: true;
        readonly min?: readonly (keyof TRow)[];
        readonly max?: readonly (keyof TRow)[];
        readonly sum?: readonly (keyof TRow)[];
    }): Promise<{
        readonly count?: number;
        readonly min?: Readonly<Record<string, string | null>>;
        readonly max?: Readonly<Record<string, string | null>>;
        readonly sum?: Readonly<Record<string, string | null>>;
    }>;
}

export type QueryCollectionDelegate<TRow, TWhere, TSelect, TOrderBy> = Omit<
    QueryDelegate<TRow, TWhere, TSelect, TOrderBy, never>,
    "findUnique"
>;

export interface QueryClient {
    readonly source: QuerySource;
    $queryRaw<TRow>(sql: string, values?: readonly unknown[]): Promise<readonly TRow[]>;
    readonly contracts: {
        findMany(args?: ContractFindManyArgs): Promise<readonly ContractRow[]>;
        findUnique(args: ContractFindUniqueArgs): Promise<ContractRow | undefined>;
        count(args?: ContractCountArgs): Promise<number>;
        aggregate(args: { readonly where?: ContractCountArgs["where"]; readonly count?: true }): Promise<{ readonly count?: number }>;
    };
    readonly contractTypes: QueryDelegate<ContractTypeRow, ContractTypeWhere, ContractTypeSelect, ContractTypeOrderBy, ContractTypeUnique>;
    readonly events: QueryDelegate<EventRow, EventWhere, EventSelect, EventOrderBy, EventUnique>;
    readonly exercises: QueryCollectionDelegate<ExerciseRow, ExerciseWhere, ExerciseSelect, ExerciseOrderBy>;
    readonly exerciseTypes: QueryDelegate<ExerciseTypeRow, ExerciseTypeWhere, ExerciseTypeSelect, ExerciseTypeOrderBy, ExerciseTypeUnique>;
    readonly packages: QueryDelegate<PackageRow, PackageWhere, PackageSelect, PackageOrderBy, PackageUnique>;
    readonly transactions: QueryDelegate<TransactionRow, TransactionWhere, TransactionSelect, TransactionOrderBy, TransactionUnique>;
    readonly watermark: QueryDelegate<WatermarkRow, WatermarkWhere, WatermarkSelect, WatermarkOrderBy, WatermarkUnique>;
}
