import { CantonClientOptions } from "../client/canton-client-options.js";
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
}
