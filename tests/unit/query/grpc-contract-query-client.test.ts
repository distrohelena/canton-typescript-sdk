import { describe, expect, it, vi } from "vitest";
import { GrpcContractQueryClient } from "../../../src/query/grpc/grpc-contract-query-client.js";
import { MemoryQueryCache } from "../../../src/query/cache/memory-query-cache.js";
import { QueryCapabilityError } from "../../../src/query/errors/query-capability-error.js";

describe("gRPC contract query client", () => {
    it("uses one all-party ACS snapshot for multiple filtered queries", async () => {
        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({
            contracts: [
                {
                    contractId: "cid",
                    templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
                },
            ],
            activeAtOffset: "42",
        });

        const client = new GrpcContractQueryClient(
            { getActiveContractsPageAsync } as never,
            new MemoryQueryCache(),
            1_000,
            "participant-1",
        );

        await expect(
            client.contracts.findMany({
                where: { templateId: { equals: "pkg:Module:Template" } },
            }),
        ).resolves.toEqual([
            expect.objectContaining({ contractId: "cid", templateId: "pkg:Module:Template" }),
        ]);
        await client.contracts.count();

        expect(getActiveContractsPageAsync).toHaveBeenCalledOnce();
        expect(getActiveContractsPageAsync.mock.calls[0][0]).toMatchObject({ allParties: true });
    });

    it("rejects query features that the active-contracts API cannot represent", async () => {
        const client = new GrpcContractQueryClient(
            { getActiveContractsPageAsync: vi.fn() } as never,
            undefined,
            undefined,
            "participant-1",
        );

        await expect(client.contracts.findMany({ where: { contractId: { in: ["cid"] } } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findMany({ select: { payload: true } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findMany({ orderBy: { contractId: "asc" } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.findUnique({ where: { contractId: "cid" }, select: { contractId: true } })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.contracts.aggregate({ count: true })).rejects.toBeInstanceOf(QueryCapabilityError);
        await expect(client.packages.aggregate({ count: true })).rejects.toBeInstanceOf(QueryCapabilityError);
    });
});
