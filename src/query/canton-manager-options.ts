import { CantonClientOptions } from "../client/canton-client-options.js";
import { CantonLogger } from "../core/types/canton-logger.js";
import { QueryCacheStore } from "./cache/query-cache-store.js";
import { QuerySource } from "./query-source.js";

export interface PqsQueryOptions {
    readonly connectionString: string;
    readonly schema?: string;
}

export interface QueryCacheOptions {
    readonly store: QueryCacheStore;
    readonly ttlMs: number;
    /** Per-request ACS page size for cache prewarms; omitted means the participant's default. */
    readonly maxPageSize?: number;
    /**
     * BETA: opt into delta refresh. Re-warms with a warm (or expired) snapshot then try to patch it forward
     * from the update stream instead of re-downloading the ACS. Any unprovable window — reassignments or
     * topology changes, pruning past the snapshot, exceeded budgets — falls back to the full download
     * automatically. Off by default: every re-warm performs the full ACS download.
     */
    readonly betaDeltaRefresh?: boolean;
    /** Delta refresh only: skip the delta attempt when the ledger has run further than this past the snapshot. */
    readonly maxDeltaOffsetGap?: number;
    /** Delta refresh only: abandon the delta (fall back to full download) after this many applied updates. */
    readonly maxDeltaUpdates?: number;
}

export interface CantonManagerOptions {
    readonly grpc: CantonClientOptions;
    readonly querySource: QuerySource;
    readonly pqs?: PqsQueryOptions;
    readonly cache?: QueryCacheOptions;
    /**
     * Opt-in for gRPC typed queries: keep the replayed history window in memory and fetch only new offsets
     * on later history queries. Costs RAM for the manager's lifetime — see GrpcQueryClientOptions.
     */
    readonly incrementalHistory?: boolean;
    /**
     * Opt-in for gRPC typed queries: permit queries that replay ledger history. Off by default — such
     * queries throw HistoryWalkRequiredError so the replay cost is never paid implicitly.
     */
    readonly walkHistory?: boolean;
    /** Receives SDK diagnostics (e.g. the once-per-relation full-replay warning); defaults to console. */
    readonly logger?: CantonLogger;
}
