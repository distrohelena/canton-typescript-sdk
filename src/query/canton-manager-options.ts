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
}

export interface CantonManagerOptions {
    readonly grpc: CantonClientOptions;
    readonly querySource: QuerySource;
    readonly pqs?: PqsQueryOptions;
    readonly cache?: QueryCacheOptions;
}
