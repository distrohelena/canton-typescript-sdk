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

    it.each([
        [Number.MAX_VALUE, () => 1_000],
        [10, () => 8_640_000_000_000_000 - 5],
        [10, () => Number.POSITIVE_INFINITY],
    ])("rejects an invalid effective expiry before writing", async (ttlMs, now) => {
        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({ activeContracts: [], activeAtOffset: "42" });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, ttlMs, "participant", now);

        await expect(cache.cacheContracts()).rejects.toBeInstanceOf(ValidationError);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("translates a revoked clock failure to ValidationError without writing", async () => {
        const cacheStore = store();

        const { proxy, revoke } = Proxy.revocable({}, {});

        revoke();

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeContracts: [], activeAtOffset: "42" }),
        } as never, cacheStore, 100, "participant", () => {
            throw proxy;
        });

        await expect(cache.cacheContracts()).rejects.toBeInstanceOf(ValidationError);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
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

    it("rejects custom-store entries with an expiry outside the Date range", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: Number.MAX_VALUE, contracts: [],
        });

        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("treats hostile custom-store payloads as cache misses", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",[\"A\"]]", {
            version: 1, endpointScope: "participant", parties: "A", activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: [],
        });

        await expect(cache.readContractsAsync({ parties: ["A"] })).resolves.toBeUndefined();

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1, endpointScope: "participant", parties: "A", activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: [],
        });

        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("treats a revoked custom-store snapshot field as a cache miss", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        const { proxy, revoke } = Proxy.revocable([], {});

        revoke();
        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: proxy,
        });

        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("treats cached rows with invalid dates as cache misses", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1,
            endpointScope: "participant",
            parties: undefined,
            activeAtOffset: "42",
            expiresAtEpochMs: 1_100,
            contracts: [{
                contractId: "C1",
                templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
                packageId: null,
                payload: {},
                witnesses: [],
                createdEventOffset: "",
                createdAt: new Date(Number.NaN),
                archivedEventOffset: null,
                archivedAt: null,
                active: true,
            }],
        });

        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("translates a revoked read-path clock failure to ValidationError", async () => {
        const cacheStore = store();

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: [],
        });

        const { proxy, revoke } = Proxy.revocable({}, {});

        revoke();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => {
            throw proxy;
        });

        await expect(cache.readContractsAsync()).rejects.toBeInstanceOf(ValidationError);
    });

    it("treats a cached payload backed by shared memory as a cache miss", async () => {
        const cacheStore = store();

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1,
            endpointScope: "participant",
            parties: undefined,
            activeAtOffset: "42",
            expiresAtEpochMs: 1_100,
            contracts: [{
                contractId: "C1",
                templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
                packageId: null,
                payload: { bytes: new Uint8Array(new SharedArrayBuffer(1)) },
                witnesses: [],
                createdEventOffset: "",
                createdAt: null,
                archivedEventOffset: null,
                archivedAt: null,
                active: true,
            }],
        });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("materializes stateful custom-store snapshot and row fields exactly once", async () => {
        const reads = {
            version: 0,
            endpointScope: 0,
            parties: 0,
            party: 0,
            activeAtOffset: 0,
            expiresAtEpochMs: 0,
            contracts: 0,
            contractId: 0,
            templateId: 0,
            templatePackageId: 0,
            templateModuleName: 0,
            templateEntityName: 0,
            packageId: 0,
            payload: 0,
            payloadOwner: 0,
            witnesses: 0,
            witness: 0,
            createdEventOffset: 0,
            createdAt: 0,
            createdAtGetTime: 0,
            archivedEventOffset: 0,
            archivedAt: 0,
            active: 0,
        };

        const createdAt = new Date("2026-01-01T00:00:00Z");

        Object.defineProperty(createdAt, "getTime", {
            value: () => {
                reads.createdAtGetTime += 1;

                return Date.parse("2026-01-01T00:00:00Z");
            },
        });

        const payload = Object.defineProperty({}, "owner", {
            enumerable: true,
            get: () => {
                reads.payloadOwner += 1;

                return "Alice";
            },
        });

        const templateId = {
            get packageId() {
                reads.templatePackageId += 1;

                return reads.templatePackageId === 1 ? "pkg" : 7;
            },
            get moduleName() {
                reads.templateModuleName += 1;

                return "Module";
            },
            get entityName() {
                reads.templateEntityName += 1;

                return "Template";
            },
        };

        const witnesses = ["Alice"];

        Object.defineProperty(witnesses, "0", {
            configurable: true,
            get: () => {
                reads.witness += 1;

                return reads.witness === 1 ? "Alice" : "Mallory";
            },
        });
        Object.defineProperty(witnesses, Symbol.iterator, {
            value: () => {
                throw new Error("custom witness iterator must not be used");
            },
        });

        const row = {
            get contractId() {
                reads.contractId += 1;

                return reads.contractId === 1 ? "C1" : 7;
            },
            get templateId() {
                reads.templateId += 1;

                return reads.templateId === 1 ? templateId : 7;
            },
            get packageId() {
                reads.packageId += 1;

                return reads.packageId === 1 ? null : 7;
            },
            get payload() {
                reads.payload += 1;

                return payload;
            },
            get witnesses() {
                reads.witnesses += 1;

                return witnesses;
            },
            get createdEventOffset() {
                reads.createdEventOffset += 1;

                return reads.createdEventOffset === 1 ? "1" : 7;
            },
            get createdAt() {
                reads.createdAt += 1;

                return reads.createdAt === 1 ? createdAt : "invalid";
            },
            get archivedEventOffset() {
                reads.archivedEventOffset += 1;

                return reads.archivedEventOffset === 1 ? null : "2";
            },
            get archivedAt() {
                reads.archivedAt += 1;

                return reads.archivedAt === 1 ? null : createdAt;
            },
            get active() {
                reads.active += 1;

                return reads.active === 1;
            },
        };

        const contracts = [row];

        Object.defineProperty(contracts, Symbol.iterator, {
            value: () => {
                throw new Error("custom contracts iterator must not be used");
            },
        });

        const storedParties = ["Alice"];

        Object.defineProperty(storedParties, "0", {
            configurable: true,
            get: () => {
                reads.party += 1;

                return reads.party === 1 ? "Alice" : "Mallory";
            },
        });
        Object.defineProperty(storedParties, Symbol.iterator, {
            value: () => {
                throw new Error("custom parties iterator must not be used");
            },
        });

        const cached = {
            get version() {
                reads.version += 1;

                return reads.version === 1 ? 1 : 2;
            },
            get endpointScope() {
                reads.endpointScope += 1;

                return reads.endpointScope === 1 ? "participant" : "other";
            },
            get parties() {
                reads.parties += 1;

                return reads.parties === 1 ? storedParties : 7;
            },
            get activeAtOffset() {
                reads.activeAtOffset += 1;

                return reads.activeAtOffset === 1 ? "42" : 7;
            },
            get expiresAtEpochMs() {
                reads.expiresAtEpochMs += 1;

                return reads.expiresAtEpochMs === 1 ? 1_100 : 0;
            },
            get contracts() {
                reads.contracts += 1;

                return contracts;
            },
        };

        const cacheStore = store();

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",[\"Alice\"]]", cached);

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.readContractsAsync({ parties: ["Alice"] })).resolves.toEqual([expect.objectContaining({
            contractId: "C1",
            templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
            payload: { owner: "Alice" },
            witnesses: ["Alice"],
            createdAt,
        })]);
        expect(reads).toEqual({
            version: 1,
            endpointScope: 1,
            parties: 1,
            party: 1,
            activeAtOffset: 1,
            expiresAtEpochMs: 1,
            contracts: 1,
            contractId: 1,
            templateId: 1,
            templatePackageId: 1,
            templateModuleName: 1,
            templateEntityName: 1,
            packageId: 1,
            payload: 1,
            payloadOwner: 1,
            witnesses: 1,
            witness: 1,
            createdEventOffset: 1,
            createdAt: 1,
            createdAtGetTime: 1,
            archivedEventOffset: 1,
            archivedAt: 1,
            active: 1,
        });
    });

    it("materializes stateful ACS page and contract fields exactly once", async () => {
        const reads = {
            activeAtOffset: 0,
            activeContracts: 0,
            nextPageToken: 0,
            contractEntry: 0,
            oneofKind: 0,
            activeContract: 0,
            contractId: 0,
            templateId: 0,
            templatePackageId: 0,
            templateModuleName: 0,
            templateEntityName: 0,
            payload: 0,
            payloadOwner: 0,
        };

        const payload = Object.defineProperty({}, "owner", {
            enumerable: true,
            get: () => {
                reads.payloadOwner += 1;

                return "Alice";
            },
        });

        const templateId = {
            get packageId() {
                reads.templatePackageId += 1;

                return reads.templatePackageId === 1 ? "pkg" : 7;
            },
            get moduleName() {
                reads.templateModuleName += 1;

                return "Module";
            },
            get entityName() {
                reads.templateEntityName += 1;

                return "Template";
            },
        };

        const active = {
            get contractId() {
                reads.contractId += 1;

                return reads.contractId === 1 ? "C1" : 7;
            },
            get templateId() {
                reads.templateId += 1;

                return reads.templateId === 1 ? templateId : 7;
            },
            get payload() {
                reads.payload += 1;

                return reads.payload === 1 ? payload : undefined;
            },
        };

        const entry = {
            get oneofKind() {
                reads.oneofKind += 1;

                return reads.oneofKind === 1 ? "activeContract" : "empty";
            },
            get activeContract() {
                reads.activeContract += 1;

                return reads.activeContract === 1 ? active : undefined;
            },
        };

        const activeContracts = [{
            get contractEntry() {
                reads.contractEntry += 1;

                return entry;
            },
        }];

        Object.defineProperty(activeContracts, Symbol.iterator, {
            value: () => {
                throw new Error("custom ACS iterator must not be used");
            },
        });

        const nextPageToken = new Uint8Array([1]);

        const response = {
            get activeAtOffset() {
                reads.activeAtOffset += 1;

                return reads.activeAtOffset === 1 ? "42" : 7;
            },
            get activeContracts() {
                reads.activeContracts += 1;

                return activeContracts;
            },
            get nextPageToken() {
                reads.nextPageToken += 1;
                activeContracts[0] = {} as never;

                return reads.nextPageToken === 1 ? nextPageToken : 7;
            },
        };

        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn()
            .mockResolvedValueOnce(response)
            .mockImplementationOnce(async (request) => {
                nextPageToken[0] = 9;
                expect(request.pageToken).toEqual(new Uint8Array([1]));

                return { activeContracts: [], activeAtOffset: "42" };
            });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toEqual({
            source: "grpc", cached: true, activeAtOffset: "42", contractCount: 1, expiresAt: new Date(1_100),
        });
        expect(cacheStore.setAsync.mock.calls[0]?.[1]).toMatchObject({
            activeAtOffset: "42",
            contracts: [expect.objectContaining({
                contractId: "C1",
                templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
                payload: { owner: "Alice" },
            })],
        });
        expect(reads).toEqual({
            activeAtOffset: 1,
            activeContracts: 1,
            nextPageToken: 1,
            contractEntry: 1,
            oneofKind: 1,
            activeContract: 1,
            contractId: 1,
            templateId: 1,
            templatePackageId: 1,
            templateModuleName: 1,
            templateEntityName: 1,
            payload: 1,
            payloadOwner: 1,
        });
    });

    it("returns captured metadata when the cache store mutates its input", async () => {
        const cacheStore: QueryCacheStore = {
            getAsync: async () => undefined,
            setAsync: vi.fn(async (_key: string, value: unknown) => {
                const snapshot = value as { activeAtOffset: string; contracts: unknown[]; expiresAtEpochMs: number };

                snapshot.activeAtOffset = "mutated";
                snapshot.contracts.length = 0;
                snapshot.expiresAtEpochMs = 0;
            }),
            deleteAsync: async () => {},
        };

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeContracts: [activeContract("C1")], activeAtOffset: "42" }),
        } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toEqual({
            source: "grpc", cached: true, activeAtOffset: "42", contractCount: 1, expiresAt: new Date(1_100),
        });
    });

    it("fails a prewarm without writing when an ACS payload contains shared memory", async () => {
        const cacheStore = store();

        const contract = activeContract("C1");

        contract.contractEntry.activeContract.payload = { bytes: new Uint8Array(new SharedArrayBuffer(1)) };

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeContracts: [contract], activeAtOffset: "42" }),
        } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow("shared memory");
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("fails a prewarm without writing when the ACS page is revoked", async () => {
        const cacheStore = store();

        const { proxy, revoke } = Proxy.revocable({ activeContracts: [], activeAtOffset: "42" }, {});

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue(proxy),
        } as never, cacheStore, 100, "participant", () => 1_000);

        revoke();

        await expect(cache.cacheContracts()).rejects.toBeInstanceOf(Error);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("translates a revoked value thrown by an ACS getter to a stable Error without writing", async () => {
        const cacheStore = store();

        const { proxy, revoke } = Proxy.revocable({}, {});

        revoke();

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({
                get activeAtOffset() {
                    throw proxy;
                },
            }),
        } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow("Active-contracts response is invalid.");
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
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

    it("reads caller parties once and translates a revoked getter failure to ValidationError", async () => {
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({ activeContracts: [], activeAtOffset: "42" });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, store(), 100, "participant", () => 1_000);

        let reads = 0;

        const statefulArgs = {
            get parties() {
                reads += 1;

                return reads === 1 ? ["Alice"] : 7;
            },
        };

        await cache.cacheContracts(statefulArgs as never);
        expect(reads).toBe(1);
        expect(getActiveContractsPageAsync.mock.calls[0]?.[0]).toMatchObject({
            eventFormat: { filtersByParty: { Alice: expect.anything() } },
        });

        const { proxy, revoke } = Proxy.revocable({}, {});

        revoke();

        await expect(cache.cacheContracts({
            get parties() {
                throw proxy;
            },
        })).rejects.toBeInstanceOf(ValidationError);
    });
});
