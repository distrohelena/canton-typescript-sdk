export interface QueryCacheStore {
    getAsync<T>(key: string): Promise<T | undefined>;
    setAsync<T>(key: string, value: T, ttlMs: number): Promise<void>;
    deleteAsync(key: string): Promise<void>;
}
