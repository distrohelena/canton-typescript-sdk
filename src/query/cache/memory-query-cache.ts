import { QueryCacheStore } from "./query-cache-store.js";

interface CacheEntry {
    readonly expiresAt: number;
    readonly value: unknown;
}

export class MemoryQueryCache implements QueryCacheStore {
    private readonly entries = new Map<string, CacheEntry>();

    public constructor(private readonly now: () => number = Date.now) {}

    public async getAsync<T>(key: string): Promise<T | undefined> {
        const entry = this.entries.get(key);

        if (entry === undefined) {
            return undefined;
        }

        if (entry.expiresAt <= this.now()) {
            this.entries.delete(key);
            return undefined;
        }

        return entry.value as T;
    }

    public async setAsync<T>(
        key: string,
        value: T,
        ttlMs: number,
    ): Promise<void> {
        this.entries.set(key, { expiresAt: this.now() + ttlMs, value });
    }

    public async deleteAsync(key: string): Promise<void> {
        this.entries.delete(key);
    }
}
