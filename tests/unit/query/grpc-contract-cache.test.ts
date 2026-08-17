import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { GrpcContractCache } from "../../../src/query/grpc/grpc-contract-cache.js";
import { QueryCacheStore } from "../../../src/query/cache/query-cache-store.js";
import { CreatedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { GetActiveContractsPageResponse, GetActiveContractsResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";

const templateId = { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" };

function createdEvent(contractId: string, patch: Partial<ReturnType<typeof CreatedEvent.create>> = {}) {
    return CreatedEvent.create({
        offset: "10",
        nodeId: 1,
        contractId,
        templateId,
        packageName: "app",
        representativePackageId: "pkg-id",
        witnessParties: ["Alice"],
        signatories: ["Alice"],
        createdAt: { seconds: "1700000000", nanos: 123_000_000 },
        createArguments: {
            fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }],
        },
        ...patch,
    });
}

function activeContract(
    contractId: string,
    synchronizerId = "sync",
    reassignmentCounter = "0",
    event = createdEvent(contractId),
) {
    return GetActiveContractsResponse.create({
        contractEntry: {
            oneofKind: "activeContract",
            activeContract: {
                createdEvent: event,
                synchronizerId,
                reassignmentCounter,
            },
        },
    });
}

function activePage(init: Partial<ReturnType<typeof GetActiveContractsPageResponse.create>> = {}) {
    return GetActiveContractsPageResponse.create({ activeAtOffset: "42", ...init });
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
            .mockResolvedValueOnce(activePage({ activeContracts: [activeContract("C2")], nextPageToken: new Uint8Array([1]) }))
            .mockResolvedValueOnce(activePage({ activeContracts: [activeContract("C1")] }));

        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toEqual({
            source: "grpc", cached: true, activeAtOffset: "42", contractCount: 2, expiresAt: new Date(1_100), refresh: "full",
        });

        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);
        // The continuation request must stay identical to the first page's request apart from the token —
        // the participant rejects tokens accompanied by fields the original request did not carry.
        expect(getActiveContractsPageAsync.mock.calls[1]?.[0]).toMatchObject({ pageToken: new Uint8Array([1]) });
        expect(getActiveContractsPageAsync.mock.calls[1]?.[0].activeAtOffset).toBeUndefined();
        expect(getActiveContractsPageAsync.mock.calls[1]?.[0].eventFormat).toEqual(getActiveContractsPageAsync.mock.calls[0]?.[0].eventFormat);
        expect(getActiveContractsPageAsync.mock.calls[0]?.[0].activeAtOffset).toBeUndefined();
        expect(getActiveContractsPageAsync.mock.calls[0]?.[0].pageToken).toBeUndefined();
        expect(cacheStore.setAsync).toHaveBeenCalledOnce();

        const pagedGetActiveContractsPageAsync = vi.fn().mockResolvedValue(activePage());

        await new GrpcContractCache({ getActiveContractsPageAsync: pagedGetActiveContractsPageAsync } as never, store(), 100, "participant", () => 1_000, 1).cacheContracts();
        expect(pagedGetActiveContractsPageAsync.mock.calls[0]![0]).toMatchObject({ maxPageSize: 1 });
        expect(() => new GrpcContractCache({} as never, store(), 100, "participant", () => 1_000, 0)).toThrow("maxPageSize");

        const [, payload, ttlMs] = cacheStore.setAsync.mock.calls[0]!;

        expect(ttlMs).toBe(100);
        expect(payload).toMatchObject({ version: 3, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_100 });
        expect((payload as { contracts: readonly unknown[] }).contracts).toEqual([
            expect.objectContaining({
                contractId: "C1",
                templateId,
                packageId: "pkg-id",
                payload: { owner: "Alice" },
                witnesses: ["Alice"],
                createdEventOffset: "10",
                createdAt: new Date("2023-11-14T22:13:20.123Z"),
                archivedEventOffset: null,
                archivedAt: null,
                active: true,
            }),
            expect.objectContaining({ contractId: "C2" }),
        ]);
        expect((payload as { creationMetadata: readonly unknown[] }).creationMetadata).toEqual([
            { contractId: "C1", packageName: "app", representativePackageId: "pkg-id" },
            { contractId: "C2", packageName: "app", representativePackageId: "pkg-id" },
        ]);
    });

    it("coalesces matching cross-synchronizer activations across pages deterministically", async () => {
        const first = activeContract("C1", "sync-b", "2", createdEvent("C1", {
            offset: "20", nodeId: 4, witnessParties: ["Bob", "Alice"],
        }));

        const second = activeContract("C1", "sync-a", "1", createdEvent("C1", {
            offset: "15", nodeId: 3, witnessParties: ["Carol", "Alice"],
        }));

        const cacheStore = store();

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn()
                .mockResolvedValueOnce(activePage({ activeContracts: [first], nextPageToken: new Uint8Array([1]) }))
                .mockResolvedValueOnce(activePage({ activeContracts: [second] })),
        } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toMatchObject({ contractCount: 1, activeAtOffset: "42" });
        expect(cacheStore.setAsync.mock.calls[0]?.[1]).toMatchObject({
            contracts: [expect.objectContaining({
                contractId: "C1",
                createdEventOffset: "15",
                witnesses: ["Alice", "Bob", "Carol"],
                payload: { owner: "Alice" },
            })],
        });
    });

    it("rejects conflicting and same-synchronizer duplicate activations without writing", async () => {
        const bob = createdEvent("C1", {
            createArguments: {
                fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Bob" } }) }],
            },
        });

        for (const duplicate of [
            activeContract("C1", "sync-b", "1", bob),
            activeContract("C1", "sync-a", "1", createdEvent("C1", { offset: "20", nodeId: 2 })),
        ]) {
            const cacheStore = store();

            const cache = new GrpcContractCache({
                getActiveContractsPageAsync: vi.fn().mockResolvedValue(activePage({
                    activeContracts: [activeContract("C1", "sync-a", "0"), duplicate],
                })),
            } as never, cacheStore, 100, "participant", () => 1_000);

            await expect(cache.cacheContracts()).rejects.toBeInstanceOf(ValidationError);
            expect(cacheStore.setAsync).not.toHaveBeenCalled();
        }
    });

    it.each([
        [Number.MAX_VALUE, () => 1_000],
        [10, () => 8_640_000_000_000_000 - 5],
        [10, () => Number.POSITIVE_INFINITY],
    ])("rejects an invalid effective expiry before writing", async (ttlMs, now) => {
        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue(activePage());

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, ttlMs, "participant", now);

        await expect(cache.cacheContracts()).rejects.toBeInstanceOf(ValidationError);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("translates a revoked clock failure to ValidationError without writing", async () => {
        const cacheStore = store();

        const { proxy, revoke } = Proxy.revocable({}, {});

        revoke();

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue(activePage()),
        } as never, cacheStore, 100, "participant", () => {
            throw proxy;
        });

        await expect(cache.cacheContracts()).rejects.toBeInstanceOf(ValidationError);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("does not write when an ACS traversal fails or is incomplete", async () => {
        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn()
            .mockResolvedValueOnce(activePage({ activeContracts: [activeContract("C1")], nextPageToken: new Uint8Array([1]) }))
            .mockResolvedValueOnce(activePage({ activeContracts: [activeContract("C2")], activeAtOffset: "43" }));

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow("activeAtOffset");
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("does not truncate traversal when a non-empty page token is detached", async () => {
        const nextPageToken = new Uint8Array([1]);

        structuredClone(nextPageToken.buffer, { transfer: [nextPageToken.buffer] });

        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({
            activeAtOffset: "42",
            activeContracts: [activeContract("C1")],
            nextPageToken,
        });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow();
        expect(getActiveContractsPageAsync).toHaveBeenCalledOnce();
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("rejects a typed-array proxy page token without writing", async () => {
        const nextPageToken = new Proxy(new Uint8Array([1]), {
            get: (target, property) => Reflect.get(target, property, target),
        });

        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({
            activeAtOffset: "42",
            activeContracts: [activeContract("C1")],
            nextPageToken,
        });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow();
        expect(getActiveContractsPageAsync).toHaveBeenCalledOnce();
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("copies a typed-array subclass page token into plain bytes before continuing", async () => {
        class MisleadingToken extends Uint8Array {
            public override get length(): number {
                return 0;
            }
        }

        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn()
            .mockResolvedValueOnce({
                activeAtOffset: "42",
                activeContracts: [activeContract("C1")],
                nextPageToken: new MisleadingToken([1]),
            })
            .mockRejectedValueOnce(new Error("second page failed"));

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow("second page failed");
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);

        const continuedToken = getActiveContractsPageAsync.mock.calls[1]?.[0].pageToken;

        expect(continuedToken).toEqual(new Uint8Array([1]));
        expect(Object.getPrototypeOf(continuedToken)).toBe(Uint8Array.prototype);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("rejects an ACS contracts proxy that hides its entries without writing", async () => {
        const activeContracts = new Proxy([activeContract("C1")], {
            get: (target, property, receiver) => property === "length" ? 0 : Reflect.get(target, property, receiver),
        });

        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({ activeAtOffset: "42", activeContracts });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow();
        expect(getActiveContractsPageAsync).toHaveBeenCalledOnce();
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
    });

    it("deduplicates concurrent prewarms for the same normalized party scope", async () => {
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue(activePage({ activeContracts: [activeContract("C1")] }));

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

        const reader = { getActiveContractsPageAsync: vi.fn().mockResolvedValue(activePage({ activeContracts: [activeContract("C1")] })) };

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
            release = () => resolve(activePage({ activeContracts: [activeContract("C1")] }));
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

    it("treats a version-1 snapshot without creation metadata as a miss", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: [],
        });

        await expect(cache.readSnapshotAsync()).resolves.toBeUndefined();
    });

    it("treats incoherent creation metadata as a miss", async () => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        const contract = {
            contractId: "C1", templateId: { packageId: "pkg", moduleName: "Main", entityName: "Asset" }, packageId: "pkg", payload: {}, witnesses: ["Alice"], createdEventOffset: "10", createdAt: new Date(1), archivedEventOffset: null, archivedAt: null, active: true,
        };

        for (const creationMetadata of [
            [],
            [{ contractId: "C-other", packageName: "app", representativePackageId: null }],
            [{ contractId: "C1", packageName: "", representativePackageId: null }],
            [{ contractId: "C1", packageName: "app", representativePackageId: null }, { contractId: "C1", packageName: "app", representativePackageId: null }],
        ]) {
            cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
                version: 3, endpointScope: "participant", parties: undefined, activeAtOffset: "42", expiresAtEpochMs: 1_100, contracts: [contract], creationMetadata,
            });

            await expect(cache.readSnapshotAsync()).resolves.toBeUndefined();
        }
    });

    it.each(["", "01", "-1", "9223372036854775808"])("treats non-canonical cached activeAtOffset %p as a miss", async (activeAtOffset) => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", { version: 1, endpointScope: "participant", parties: undefined, activeAtOffset, expiresAtEpochMs: 1_100, contracts: [] });

        await expect(cache.readSnapshotAsync()).resolves.toBeUndefined();
    });

    it.each(["", "01", "-1", "9223372036854775808"])("rejects non-canonical ACS prewarm activeAtOffset %p without writing", async (activeAtOffset) => {
        const cacheStore = store();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn().mockResolvedValue(activePage({ activeAtOffset })) } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).rejects.toThrow(/activeAtOffset/i);
        expect(cacheStore.setAsync).not.toHaveBeenCalled();
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

    it("treats a custom-store contracts proxy that hides its entries as a cache miss", async () => {
        const cacheStore = store();

        const contracts = new Proxy([{
            contractId: "C1",
            templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
            packageId: null,
            payload: {},
            witnesses: ["Alice"],
            createdEventOffset: "1",
            createdAt: null,
            archivedEventOffset: null,
            archivedAt: null,
            active: true,
        }], {
            get: (target, property, receiver) => property === "length" ? 0 : Reflect.get(target, property, receiver),
        });

        cacheStore.values.set("grpc-contract-cache:v1:[\"participant\",null]", {
            version: 1,
            endpointScope: "participant",
            parties: undefined,
            activeAtOffset: "42",
            expiresAtEpochMs: 1_100,
            contracts,
        });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync: vi.fn() } as never, cacheStore, 100, "participant", () => 1_000);

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
            creationMetadata: 0,
            metadataContractId: 0,
            metadataPackageName: 0,
            metadataRepresentativePackageId: 0,
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

        const metadataEntry = {
            get contractId() {
                reads.metadataContractId += 1;

                return reads.metadataContractId === 1 ? "C1" : 7;
            },
            get packageName() {
                reads.metadataPackageName += 1;

                return reads.metadataPackageName === 1 ? "app" : 7;
            },
            get representativePackageId() {
                reads.metadataRepresentativePackageId += 1;

                return reads.metadataRepresentativePackageId === 1 ? null : 7;
            },
        };

        const creationMetadata = [metadataEntry];

        Object.defineProperty(creationMetadata, Symbol.iterator, {
            value: () => {
                throw new Error("custom creation metadata iterator must not be used");
            },
        });

        const cached = {
            get version() {
                reads.version += 1;

                return reads.version === 1 ? 3 : 7;
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
            get creationMetadata() {
                reads.creationMetadata += 1;

                return creationMetadata;
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
            creationMetadata: 1,
            metadataContractId: 1,
            metadataPackageName: 1,
            metadataRepresentativePackageId: 1,
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
            createdEvent: 0,
            synchronizerId: 0,
            reassignmentCounter: 0,
            offset: 0,
            nodeId: 0,
            contractId: 0,
            templateId: 0,
            templatePackageId: 0,
            templateModuleName: 0,
            templateEntityName: 0,
            createArguments: 0,
            fields: 0,
            fieldValue: 0,
            witnessParties: 0,
            witness: 0,
            createdAt: 0,
            timestampSeconds: 0,
            timestampNanos: 0,
        };

        const statefulTemplateId = {
            get packageId() {
                reads.templatePackageId += 1;

                return reads.templatePackageId === 1 ? "pkg-id" : 7;
            },
            get moduleName() {
                reads.templateModuleName += 1;

                return reads.templateModuleName === 1 ? "Main" : 7;
            },
            get entityName() {
                reads.templateEntityName += 1;

                return reads.templateEntityName === 1 ? "Asset" : 7;
            },
        };

        const value = Value.create({ sum: { oneofKind: "party", party: "Alice" } });

        const field = {
            label: "owner",
            get value() {
                reads.fieldValue += 1;

                return reads.fieldValue === 1 ? value : undefined;
            },
        };

        const fields = [field];

        Object.defineProperty(fields, Symbol.iterator, {
            value: () => {
                throw new Error("custom record iterator must not be used");
            },
        });

        const createArguments = {
            recordId: undefined,
            get fields() {
                reads.fields += 1;

                return fields;
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

        const createdAt = {
            get seconds() {
                reads.timestampSeconds += 1;

                return reads.timestampSeconds === 1 ? "1700000000" : "0";
            },
            get nanos() {
                reads.timestampNanos += 1;

                return reads.timestampNanos === 1 ? 123_000_000 : -1;
            },
        };

        const event = {
            ...createdEvent("C1"),
            get offset() {
                reads.offset += 1;

                return reads.offset === 1 ? "10" : "20";
            },
            get nodeId() {
                reads.nodeId += 1;

                return reads.nodeId === 1 ? 1 : -1;
            },
            get contractId() {
                reads.contractId += 1;

                return reads.contractId === 1 ? "C1" : 7;
            },
            get templateId() {
                reads.templateId += 1;

                return reads.templateId === 1 ? statefulTemplateId : 7;
            },
            get createArguments() {
                reads.createArguments += 1;

                return reads.createArguments === 1 ? createArguments : undefined;
            },
            get witnessParties() {
                reads.witnessParties += 1;

                return reads.witnessParties === 1 ? witnesses : [];
            },
            get createdAt() {
                reads.createdAt += 1;

                return reads.createdAt === 1 ? createdAt : undefined;
            },
        };

        const active = {
            get createdEvent() {
                reads.createdEvent += 1;

                return reads.createdEvent === 1 ? event : undefined;
            },
            get synchronizerId() {
                reads.synchronizerId += 1;

                return reads.synchronizerId === 1 ? "sync" : "";
            },
            get reassignmentCounter() {
                reads.reassignmentCounter += 1;

                return reads.reassignmentCounter === 1 ? "0" : "invalid";
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

                return activePage();
            });

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toEqual({
            source: "grpc", cached: true, activeAtOffset: "42", contractCount: 1, expiresAt: new Date(1_100), refresh: "full",
        });
        expect(cacheStore.setAsync.mock.calls[0]?.[1]).toMatchObject({
            activeAtOffset: "42",
            contracts: [expect.objectContaining({
                contractId: "C1",
                templateId,
                payload: { owner: "Alice" },
                witnesses: ["Alice"],
                createdEventOffset: "10",
                createdAt: new Date("2023-11-14T22:13:20.123Z"),
            })],
        });
        expect(reads).toEqual({
            activeAtOffset: 1,
            activeContracts: 1,
            nextPageToken: 1,
            contractEntry: 1,
            oneofKind: 1,
            activeContract: 1,
            createdEvent: 1,
            synchronizerId: 1,
            reassignmentCounter: 1,
            offset: 1,
            nodeId: 1,
            contractId: 1,
            templateId: 1,
            templatePackageId: 1,
            templateModuleName: 1,
            templateEntityName: 1,
            createArguments: 1,
            fields: 1,
            fieldValue: 1,
            witnessParties: 1,
            witness: 1,
            createdAt: 1,
            timestampSeconds: 1,
            timestampNanos: 1,
        });
    });

    it("deep-materializes each ACS response before reading the next array slot", async () => {
        const first = activeContract("C1");

        const activeContracts = new Array<ReturnType<typeof activeContract>>(2);

        Object.defineProperty(activeContracts, "0", {
            configurable: true,
            get: () => first,
        });
        Object.defineProperty(activeContracts, "1", {
            configurable: true,
            get: () => {
                first.contractEntry = { oneofKind: undefined };

                return activeContract("C2");
            },
        });

        const cacheStore = store();

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeContracts, activeAtOffset: "42" }),
        } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toMatchObject({ contractCount: 2 });
        expect(cacheStore.setAsync.mock.calls[0]?.[1]).toMatchObject({
            contracts: [expect.objectContaining({ contractId: "C1" }), expect.objectContaining({ contractId: "C2" })],
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
            getActiveContractsPageAsync: vi.fn().mockResolvedValue(activePage({ activeContracts: [activeContract("C1")] })),
        } as never, cacheStore, 100, "participant", () => 1_000);

        await expect(cache.cacheContracts()).resolves.toEqual({
            source: "grpc", cached: true, activeAtOffset: "42", contractCount: 1, expiresAt: new Date(1_100), refresh: "full",
        });
    });

    it("fails a prewarm without writing when an ACS payload contains shared memory", async () => {
        const cacheStore = store();

        const contract = activeContract("C1", "sync", "0", createdEvent("C1", {
            createdEventBlob: new Uint8Array(new SharedArrayBuffer(1)),
        }));

        const cache = new GrpcContractCache({
            getActiveContractsPageAsync: vi.fn().mockResolvedValue(activePage({ activeContracts: [contract] })),
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
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue(activePage());

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

describe("gRPC contract cache delta refresh (beta)", () => {
    const txUpdate = (offset: string, events: readonly unknown[]) => ({
        update: { oneofKind: "transaction", transaction: { offset, updateId: `update-${offset}`, synchronizerId: "sync", events } },
    });

    const createdEntry = (contractId: string, offset: string) => ({ event: { oneofKind: "created", created: createdEvent(contractId, { offset }) } });

    const archivedEntry = (contractId: string) => ({ event: { oneofKind: "archived", archived: { contractId, templateId } } });

    const updatesPage = (updates: readonly unknown[], init: Record<string, unknown> = {}) => ({
        lowestPageOffsetExclusive: "42",
        highestPageOffsetInclusive: "50",
        updates,
        ...init,
    });

    function harness(init: { delta?: { enabled?: boolean; maxOffsetGap?: number; maxUpdates?: number }; ledgerEnd?: string; prunedUpTo?: string; nowRef?: { value: number } } = {}) {
        const cacheStore = store();

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue(activePage({ activeContracts: [activeContract("C1")] }));

        const getLedgerEndAsync = vi.fn().mockResolvedValue({ offset: init.ledgerEnd ?? "50" });

        const getLatestPrunedOffsetsAsync = vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: init.prunedUpTo ?? "0" });

        const getUpdatesPageAsync = vi.fn();

        const nowRef = init.nowRef ?? { value: 1_000 };

        const cache = new GrpcContractCache(
            { getActiveContractsPageAsync, getLedgerEndAsync, getLatestPrunedOffsetsAsync } as never,
            cacheStore,
            100,
            "participant",
            () => nowRef.value,
            undefined,
            { getUpdatesPageAsync } as never,
            init.delta ?? { enabled: true },
        );

        return { cache, cacheStore, getActiveContractsPageAsync, getLedgerEndAsync, getLatestPrunedOffsetsAsync, getUpdatesPageAsync, nowRef };
    }

    it("patches a warm snapshot forward and reports the delta", async () => {
        const { cache, cacheStore, getActiveContractsPageAsync, getUpdatesPageAsync } = harness();

        await expect(cache.cacheContracts()).resolves.toMatchObject({ refresh: "full", activeAtOffset: "42", contractCount: 1 });

        getUpdatesPageAsync.mockResolvedValue(updatesPage([
            txUpdate("45", [createdEntry("C2", "45")]),
            txUpdate("48", [archivedEntry("C1")]),
        ]));

        await expect(cache.cacheContracts()).resolves.toMatchObject({
            refresh: "delta",
            activeAtOffset: "50",
            contractCount: 1,
            offsetGap: "8",
            deltaUpdateCount: 2,
        });

        // Only the original prewarm downloaded the ACS.
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
        expect(getUpdatesPageAsync.mock.calls[0]![0]).toMatchObject({ beginOffsetExclusive: "42", endOffsetInclusive: "50" });

        const snapshot = cacheStore.setAsync.mock.calls[1]![1] as { activeAtOffset: string; contracts: readonly { contractId: string }[]; creationMetadata: readonly { contractId: string }[] };

        expect(snapshot.activeAtOffset).toBe("50");
        expect(snapshot.contracts.map((row) => row.contractId)).toEqual(["C2"]);
        expect(snapshot.creationMetadata.map((entry) => entry.contractId)).toEqual(["C2"]);

        await expect(cache.readSnapshotAsync()).resolves.toMatchObject({ activeAtOffset: "50" });
    });

    it("cancels contracts created and archived inside the window", async () => {
        const { cache, getUpdatesPageAsync } = harness();

        await cache.cacheContracts();

        getUpdatesPageAsync.mockResolvedValue(updatesPage([
            txUpdate("44", [createdEntry("C9", "44")]),
            txUpdate("47", [archivedEntry("C9")]),
        ]));

        await expect(cache.cacheContracts()).resolves.toMatchObject({ refresh: "delta", contractCount: 1 });
        await expect(cache.readContractsAsync()).resolves.toEqual([expect.objectContaining({ contractId: "C1" })]);
    });

    it("re-stamps the TTL without any fetch when the ledger has not moved", async () => {
        const { cache, getActiveContractsPageAsync, getUpdatesPageAsync } = harness({ ledgerEnd: "42" });

        await cache.cacheContracts();

        await expect(cache.cacheContracts()).resolves.toMatchObject({ refresh: "noop", offsetGap: "0", contractCount: 1 });
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
        expect(getUpdatesPageAsync).not.toHaveBeenCalled();
    });

    it("uses an expired snapshot as the delta base", async () => {
        const nowRef = { value: 1_000 };

        const { cache, getActiveContractsPageAsync, getUpdatesPageAsync } = harness({ nowRef });

        await cache.cacheContracts();

        // Past the 100ms TTL: queries would miss, but the refresh still patches forward.
        nowRef.value = 5_000;

        getUpdatesPageAsync.mockResolvedValue(updatesPage([txUpdate("45", [createdEntry("C2", "45")])]));

        await expect(cache.cacheContracts()).resolves.toMatchObject({ refresh: "delta", contractCount: 2 });
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["a reassignment in the window", [{ update: { oneofKind: "reassignment", reassignment: { offset: "45" } } }]],
        ["a topology change in the window", [{ update: { oneofKind: "topologyTransaction", topologyTransaction: { offset: "45" } } }]],
        ["an exercised event where ACS_DELTA promises none", [txUpdate("45", [{ event: { oneofKind: "exercised", exercised: { contractId: "C1" } } }])]],
        ["an archive of a contract the snapshot does not hold", [txUpdate("45", [archivedEntry("C-unknown")])]],
        ["a duplicate create for a held contract", [txUpdate("45", [createdEntry("C1", "45")])]],
    ])("falls back to the full download on %s", async (_name, updates) => {
        const { cache, getActiveContractsPageAsync, getUpdatesPageAsync } = harness();

        await cache.cacheContracts();

        getUpdatesPageAsync.mockResolvedValue(updatesPage(updates));

        await expect(cache.cacheContracts()).resolves.toMatchObject({ refresh: "full", offsetGap: "0" });
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);
    });

    it("falls back to the full download when budgets are exceeded or the participant pruned past the base", async () => {
        const gapCapped = harness({ delta: { enabled: true, maxOffsetGap: 5 } });

        await gapCapped.cache.cacheContracts();
        await expect(gapCapped.cache.cacheContracts()).resolves.toMatchObject({ refresh: "full" });
        expect(gapCapped.getUpdatesPageAsync).not.toHaveBeenCalled();

        const updateCapped = harness({ delta: { enabled: true, maxUpdates: 1 } });

        await updateCapped.cache.cacheContracts();
        updateCapped.getUpdatesPageAsync.mockResolvedValue(updatesPage([
            txUpdate("44", [createdEntry("C2", "44")]),
            txUpdate("45", [createdEntry("C3", "45")]),
        ]));
        await expect(updateCapped.cache.cacheContracts()).resolves.toMatchObject({ refresh: "full" });

        const pruned = harness({ prunedUpTo: "43" });

        await pruned.cache.cacheContracts();
        await expect(pruned.cache.cacheContracts()).resolves.toMatchObject({ refresh: "full" });
        expect(pruned.getUpdatesPageAsync).not.toHaveBeenCalled();
    });

    it("performs the full download on re-warm when the beta flag is off", async () => {
        const { cache, getActiveContractsPageAsync, getUpdatesPageAsync } = harness({ delta: {} });

        await cache.cacheContracts();
        await expect(cache.cacheContracts()).resolves.toMatchObject({ refresh: "full", offsetGap: "0" });
        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);
        expect(getUpdatesPageAsync).not.toHaveBeenCalled();
    });

    it("measures a warm snapshot against the ledger end via inspectContractsCacheAsync", async () => {
        const { cache } = harness({ ledgerEnd: "50" });

        await expect(cache.inspectContractsCacheAsync()).resolves.toBeUndefined();

        await cache.cacheContracts();

        await expect(cache.inspectContractsCacheAsync()).resolves.toEqual({
            activeAtOffset: "42",
            ledgerEndOffset: "50",
            offsetGap: "8",
            contractCount: 1,
            expiresAt: new Date(1_100),
        });
    });
});
