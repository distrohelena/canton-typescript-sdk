import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { GrpcContractCache } from "../../../src/query/grpc/grpc-contract-cache.js";
import { QueryCacheStore } from "../../../src/query/cache/query-cache-store.js";

function activeContract(contractId: string) {
    return {
        contractEntry: {
            oneofKind: "activeContract",
            activeContract: {
                contractId,
                templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
            },
        },
    };
}

function store(): QueryCacheStore & { readonly values: Map<string, unknown>; readonly setAsync: ReturnType<typeof vi.fn>; readonly deleteAsync: ReturnType<typeof vi.fn> } {
    const values = new Map<string, unknown>();

    const setAsync = vi.fn(async <T>(key: string, value: T) => {
        values.set(key, value);
    });

    const deleteAsync = vi.fn(async (key: string) => {
        values.delete(key);
    });

    return { values, getAsync: async <T>(key: string) => values.get(key) as T | undefined, setAsync, deleteAsync };
}

describe("gRPC contract cache", () => {
    it("prewarms every ACS page at one stable offset and writes one completed snapshot", async () => {
        const getActiveContractsPageAsync = vi.fn()
            .mockResolvedValueOnce({ activeContracts: [activeContract("C2")], activeAtOffset: "42", nextPageToken: new Uint8Array([1]) })
            .mockResolvedValueOnce({ activeContracts: [activeContract("C1")], activeAtOffset: "42" });

        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toEqual({
            source: "grpc", cached: true, activeAtOffset: "42", contractCount: 2, expiresAt: new Date(1_100),
        });

        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);
        expect(getActiveContractsPageAsync.mock.calls[1]?.[0]).toMatchObject({ activeAtOffset: "42", pageToken: new Uint8Array([1]) });
        expect(cacheStore.setAsync).toHaveBeenCalledOnce();

        const [, payload, ttlMs] = cacheStore.setAsync.mock.calls[0]!;

        expect(ttlMs).toBe(100);
        expect(payload).toMatchObject({ version: 1, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_100 });
        expect((payload as { contracts: readonly unknown[] }).contracts).toHaveLength(2);
    });

    it("does not write when an ACS traversal fails or is incomplete", async () => {
        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn()
            .mockResolvedValueOnce({ activeContracts: [activeContract("C1")], activeAtOffset: "42", nextPageToken: new Uint8Array([1]) })
            .mockResolvedValueOnce({ activeContracts: [activeContract("C2")], activeAtOffset: "43" });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow("activeAtOffset");
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent prewarms for the same normalized party scope", async () => {
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({ activeContracts: [activeContract("C1")], activeAtOffset: "42" });

        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        const parties = ["Bob", "Alice", "Bob"];

        await Promise.all([cache.cacheContracts({ parties }), cache.cacheContracts({ parties: ["Alice", "Bob"] })]);
        parties[0] = "Mallory";

        expect(getActiveContractsPageAsync).toHaveBeenCalledOnce();
        expect(cacheStore.setAsync).toHaveBeenCalledOnce();
        expect(getActiveContractsPageAsync.mock.calls[0]?.[0]).toMatchObject({ eventFormat: { filtersByParty: { Alice: expect.anything(), Bob: expect.anything() } } });
        expect(cacheStore.setAsync.mock.calls[0]?.[1]).toMatchObject({ parties: ["Alice", "Bob"] });
    });

    it("keeps wildcard, party, and endpoint scopes isolated and invalidates only the exact scope", async () => {
        const cacheStore = store();

        const reader = { getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeContracts: [activeContract("C1")], activeAtOffset: "42" }) };

        const first = new GrpcContractCache(reader as never, cacheStore, 100, "one", () => 1_000);

        const second = new GrpcContractCache(reader as never, cacheStore, 100, "two", () => 1_000);

        await first.cacheContracts();
        await first.cacheContracts({ parties: ["Alice"] });
        await second.cacheContracts();
        await first.invalidateContractsCache({ parties: ["Alice"] });

        await expect(first.readContractsAsync()).resolves.toHaveLength(1);
        await expect(first.readContractsAsync({ parties: ["Alice"] })).resolves.toBeUndefined();
        await expect(second.readContractsAsync()).resolves.toHaveLength(1);
        expect(cacheStore.deleteAsync).toHaveBeenCalledOnce();
    });

    it("does not let an in-flight prewarm undo invalidation", async () => {
        let started!: () => void;

        let release!: () => void;

        const startedAsync = new Promise<void>((resolve) => {
            started = resolve;
        });

        const responseAsync = new Promise<unknown>((resolve) => {
            release = () => resolve({ activeContracts: [activeContract("C1")], activeAtOffset: "42" });
        });

        const cacheStore = store();

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn(async () => {
                started();

                return responseAsync;
            }),
        } as never, cacheStore, 100, "participant", () => 1_000);

        const prewarm = cache.cacheContracts();

        await startedAsync;

        const invalidation = cache.invalidateContractsCache();

        release();

        await Promise.all([prewarm, invalidation]);
        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("rejects expired, malformed, and mismatched custom-store entries without renewing them", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        await cacheStore.setAsync("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_000, contracts: [],
        }, 100);

        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
        expect(cacheStore.setAsync).toHaveBeenCalledOnce();
    });

    it("treats hostile custom-store payloads as cache misses", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",[\"A\"]]", {
            version: 1, endpointScope: "participant", parties: "A", activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: [],
        });

        await expect(cache.readContractsAsync({ parties: ["A"] })).resolves.toBeUndefined();
    });

    it("rejects an empty or malformed party scope before ACS I/O", async () => {
        const getActiveContractsPageAsync = vi.fn();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, store(), 100, "participant");

        const hostileParties = new Proxy([] as string[], {
            get: () => {
                throw new Error("hostile party list");
            },
        });

        await expect(cache.cacheContracts({ parties: [] })).rejects.toBeInstanceOf(ValidationError);
        await expect(cache.cacheContracts({ parties: ["Alice", 4] } as never)).rejects.toBeInstanceOf(ValidationError);
        await expect(cache.cacheContracts({ parties: hostileParties })).rejects.toBeInstanceOf(ValidationError);
        expect(getActiveContractsPageAsync).not.toHaveBeenCalled();
    });
});
