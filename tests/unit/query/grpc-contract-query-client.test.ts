import { describe, expect, it, vi } from "vitest";
import { GrpcContractQueryClient } from "../../../src/query/grpc/grpc-contract-query-client.js";
import { MemoryQueryCache } from "../../../src/query/cache/memory-query-cache.js";
import { GrpcContractCache } from "../../../src/query/grpc/grpc-contract-cache.js";
import { QueryCapabilityError } from "../../../src/query/errors/query-capability-error.js";

describe("gRPC contract query client", () => {
    it("requires explicit cache configuration before prewarming and never populates on ordinary reads", async () => {
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({ activeContracts: [], activeAtOffset: "42" });

        const withoutCache = new GrpcContractQueryClient({ getActiveContractsPageAsync } as never, undefined);

        await expect(withoutCache.cacheContracts()).rejects.toThrow("cache");
        expect(getActiveContractsPageAsync).not.toHaveBeenCalled();

        const store = new MemoryQueryCache();

        const cache = new GrpcContractCache({ getActiveContractsPageAsync } as never, store, 1_000, "participant-1");

        const client = new GrpcContractQueryClient({ getActiveContractsPageAsync } as never, cache);

        await client.contracts.findMany();
        await expect(cache.readContractsAsync()).resolves.toBeUndefined();
    });

    it("uses the all-party ACS wildcard for filtered reads without implicitly caching", async () => {
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({
            activeContracts: [
                {
                    contractEntry: {
                        oneofKind: "activeContract",
                        activeContract: {
                            contractId: "cid",
                            templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
                        },
                    },
                },
            ],
            activeAtOffset: "42",
        });

        const client = new GrpcContractQueryClient(
            { getActiveContractsPageAsync } as never,
            new GrpcContractCache({ getActiveContractsPageAsync } as never, new MemoryQueryCache(), 1_000, "participant-1"),
        );

        await expect(
            client.contracts.findMany({
                where: { contractId: { equals: "cid" } },
            }),
        ).resolves.toEqual([
            expect.objectContaining({ contractId: "cid", templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" } }),
        ]);
        await client.contracts.count();

        expect(getActiveContractsPageAsync).toHaveBeenCalledTimes(2);
        expect(getActiveContractsPageAsync.mock.calls[0][0]).toMatchObject({
            eventFormat: {
                filtersByParty: {},
                filtersForAnyParty: {
                    cumulative: [
                        {
                            identifierFilter: {
                                oneofKind: "wildcardFilter",
                                wildcardFilter: {
                                    includeCreatedEventBlob: false,
                                },
                            },
                        },
                    ],
                },
                verbose: true,
            },
        });
    });

    it("rejects query features that the active-contracts API cannot represent", async () => {
        const client = new GrpcContractQueryClient(
            { getActiveContractsPageAsync: vi.fn() } as never,
            undefined,
        );

        await expect(client.contracts.findMany({ where: { contractId: { in: ["cid"] } } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findMany({ select: { payload: true } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findMany({ orderBy: [{ contractId: "asc" }] })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findUnique({ where: { contractId: "cid" }, select: { contractId: true } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findUnique({ where: { contractId: "cid" }, include: { contractType: true } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.aggregate({ count: true })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.groupBy({ by: ["witnesses"], aggregate: { count: true } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.packages.aggregate({ count: true })).rejects.toBeInstanceOf(QueryCapabilityError);
    });
});
