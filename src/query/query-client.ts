import { QuerySource } from "./query-source.js";
import {
    ContractTypeOrderBy,
    ContractTypeRow,
    ContractTypeResult,
    ContractTypeSelect,
    ContractTypeUnique,
    ContractTypeWhere,
    ContractTypeGroupByArgs,
    ContractTypeGroupRow,
    ContractCountArgs,
    ContractFindManyArgs,
    ContractFindUniqueArgs,
    ContractGroupByArgs,
    ContractGroupRow,
    ContractRow,
    ContractResult,
    EventOrderBy,
    EventRow,
    EventResult,
    EventGroupByArgs,
    EventGroupRow,
    EventSelect,
    EventUnique,
    EventWhere,
    ExerciseOrderBy,
    ExerciseRow,
    ExerciseResult,
    ExerciseSelect,
    ExerciseTypeOrderBy,
    ExerciseTypeRow,
    ExerciseTypeResult,
    ExerciseTypeSelect,
    ExerciseTypeUnique,
    ExerciseTypeWhere,
    ExerciseTypeGroupByArgs,
    ExerciseTypeGroupRow,
    ExerciseWhere,
    ExerciseGroupByArgs,
    ExerciseGroupRow,
    PackageOrderBy,
    PackageRow,
    PackageResult,
    PackageSelect,
    PackageUnique,
    PackageWhere,
    PackageGroupByArgs,
    PackageGroupRow,
    TransactionOrderBy,
    TransactionRow,
    TransactionResult,
    TransactionSelect,
    TransactionUnique,
    TransactionWhere,
    TransactionGroupByArgs,
    TransactionGroupRow,
    WatermarkOrderBy,
    WatermarkRow,
    WatermarkSelect,
    WatermarkUnique,
    WatermarkWhere,
    WatermarkGroupByArgs,
    WatermarkGroupRow,
    ContractTypeInclude,
    EventInclude,
    ExerciseInclude,
    ExerciseTypeInclude,
    PackageInclude,
    TransactionInclude,
    JsonProjectionResult,
} from "./model-types.js";

/** `take: 0` returns all matching rows (no limit), matching `skip: 0`'s "no offset" meaning. */
export interface FindManyArgs<TWhere, TSelect, TOrderBy, TInclude = never> {
    readonly where?: TWhere;
    readonly select?: TSelect;
    readonly orderBy?: TOrderBy;
    readonly skip?: number;
    readonly take?: number;
    readonly include?: TInclude;
}

export interface ContractCacheArgs {
    readonly parties?: readonly string[];
}

export type ContractCacheResult =
    | {
        readonly source: QuerySource.grpc;
        readonly cached: true;
        readonly activeAtOffset: string;
        readonly contractCount: number;
        readonly expiresAt: Date;
        /**
         * How this prewarm was satisfied: "full" downloaded the ACS, "delta" patched the previous snapshot
         * forward from the update stream, "noop" found the ledger unchanged and only re-stamped the TTL.
         */
        readonly refresh: "full" | "delta" | "noop";
        /** Ledger-end minus the previous snapshot's offset at refresh time; undefined on a cold prewarm. */
        readonly offsetGap?: string;
        /** Update count applied by a "delta" refresh. */
        readonly deltaUpdateCount?: number;
    }
    | {
        readonly source: QuerySource.pqs;
        readonly cached: false;
    };

/** Measurement of a cached ACS snapshot against the current ledger end, for deciding when to re-warm. */
export interface ContractCacheInspection {
    readonly activeAtOffset: string;
    readonly ledgerEndOffset: string;
    /** ledgerEndOffset - activeAtOffset: how far the ledger has run past the snapshot. */
    readonly offsetGap: string;
    readonly contractCount: number;
    readonly expiresAt: Date;
}

export interface QueryDelegate<TRow, TWhere, TSelect, TOrderBy, TUnique, TInclude = never, TGroupBy = never, TGroupRow = never> {
    findMany<TArgs extends FindManyArgs<TWhere, TSelect, TOrderBy, TInclude>>(args?: TArgs): Promise<readonly (TRow & JsonProjectionResult<TArgs>)[]>;
    findUnique<TArgs extends { readonly where: TUnique; readonly select?: TSelect; readonly include?: TInclude }>(args: TArgs): Promise<(TRow & JsonProjectionResult<TArgs>) | undefined>;
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
    groupBy(args: TGroupBy): Promise<readonly TGroupRow[]>;
}

export type QueryCollectionDelegate<TRow, TWhere, TSelect, TOrderBy, TInclude = never, TGroupBy = never, TGroupRow = never> = Omit<
    QueryDelegate<TRow, TWhere, TSelect, TOrderBy, never, TInclude, TGroupBy, TGroupRow>,
    "findUnique"
>;

export interface QueryClient {
    readonly source: QuerySource;
    $queryRaw<TRow>(sql: string, values?: readonly unknown[]): Promise<readonly TRow[]>;
    cacheContracts(args?: ContractCacheArgs): Promise<ContractCacheResult>;
    invalidateContractsCache(args?: ContractCacheArgs): Promise<void>;
    /** Measures a warmed snapshot against the current ledger end (undefined when cold or not cache-backed). */
    inspectContractsCache(args?: ContractCacheArgs): Promise<ContractCacheInspection | undefined>;
    readonly contracts: {
        findMany<TArgs extends ContractFindManyArgs>(args?: TArgs): Promise<readonly (ContractResult & JsonProjectionResult<TArgs>)[]>;
        findUnique<TArgs extends ContractFindUniqueArgs>(args: TArgs): Promise<(ContractResult & JsonProjectionResult<TArgs>) | undefined>;
        count(args?: ContractCountArgs): Promise<number>;
        aggregate(args: {
            readonly where?: ContractCountArgs["where"];
            readonly count?: true;
            readonly min?: readonly ContractNumericField[];
            readonly max?: readonly ContractNumericField[];
            readonly sum?: readonly ContractNumericField[];
        }): Promise<{
            readonly count?: number;
            readonly min?: Readonly<Partial<Record<ContractNumericField, string | null>>>;
            readonly max?: Readonly<Partial<Record<ContractNumericField, string | null>>>;
            readonly sum?: Readonly<Partial<Record<ContractNumericField, string | null>>>;
        }>;
        groupBy(args: ContractGroupByArgs): Promise<readonly ContractGroupRow[]>;
    };
    readonly contractTypes: QueryDelegate<ContractTypeResult, ContractTypeWhere, ContractTypeSelect, ContractTypeOrderBy, ContractTypeUnique, ContractTypeInclude, ContractTypeGroupByArgs, ContractTypeGroupRow>;
    readonly events: QueryDelegate<EventResult, EventWhere, EventSelect, EventOrderBy, EventUnique, EventInclude, EventGroupByArgs, EventGroupRow>;
    readonly exercises: QueryCollectionDelegate<ExerciseResult, ExerciseWhere, ExerciseSelect, ExerciseOrderBy, ExerciseInclude, ExerciseGroupByArgs, ExerciseGroupRow>;
    readonly exerciseTypes: QueryDelegate<ExerciseTypeResult, ExerciseTypeWhere, ExerciseTypeSelect, ExerciseTypeOrderBy, ExerciseTypeUnique, ExerciseTypeInclude, ExerciseTypeGroupByArgs, ExerciseTypeGroupRow>;
    readonly packages: QueryDelegate<PackageResult, PackageWhere, PackageSelect, PackageOrderBy, PackageUnique, PackageInclude, PackageGroupByArgs, PackageGroupRow>;
    readonly transactions: QueryDelegate<TransactionResult, TransactionWhere, TransactionSelect, TransactionOrderBy, TransactionUnique, TransactionInclude, TransactionGroupByArgs, TransactionGroupRow>;
    readonly watermark: QueryDelegate<WatermarkRow, WatermarkWhere, WatermarkSelect, WatermarkOrderBy, WatermarkUnique, never, WatermarkGroupByArgs, WatermarkGroupRow>;
}

export type ContractNumericField = "createdEventOffset" | "archivedEventOffset";
