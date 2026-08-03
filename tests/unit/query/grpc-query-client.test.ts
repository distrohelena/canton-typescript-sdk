import { describe, expect, it, vi } from "vitest";
import { GrpcQueryClient, type GrpcQueryDataProvider } from "../../../src/query/grpc/grpc-query-client.js";
import { QueryCapabilityError } from "../../../src/query/errors/query-capability-error.js";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { Event, CreatedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { Transaction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import { GetUpdateResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { GetActiveContractsResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
import { queryConformanceDataset, evaluatorCases } from "./query-conformance-fixture.js";

function fixtureProvider(): GrpcQueryDataProvider {
    return {
        readDatasetAsync: vi.fn().mockResolvedValue(queryConformanceDataset),
    };
}

function historyUpdate(): GetUpdateResponse {
    const created = CreatedEvent.create({
        offset: "1",
        nodeId: 1,
        contractId: "C1",
        templateId: { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" },
        packageName: "app",
        representativePackageId: "pkg-id",
        witnessParties: ["Alice"],
        signatories: ["Alice"],
        createdAt: { seconds: "1700000000", nanos: 0 },
        createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] },
    });

    const transaction = Transaction.create({
        offset: "1",
        updateId: "update-1",
        effectiveAt: { seconds: "1700000000", nanos: 0 },
        recordTime: { seconds: "1700000000", nanos: 0 },
        synchronizerId: "sync",
        events: [Event.create({ event: { oneofKind: "created", created } })],
    });

    return GetUpdateResponse.create({ update: { oneofKind: "transaction", transaction } });
}

function activeContract(): GetActiveContractsResponse {
    return GetActiveContractsResponse.create({
        contractEntry: {
            oneofKind: "activeContract",
            activeContract: {
                createdEvent: CreatedEvent.create({
                    offset: "1",
                    nodeId: 1,
                    contractId: "C1",
                    templateId: { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" },
                    packageName: "app",
                    representativePackageId: "pkg-id",
                    witnessParties: ["Alice"],
                    signatories: ["Alice"],
                    createdAt: { seconds: "1700000000", nanos: 0 },
                    createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] },
                }),
                synchronizerId: "sync",
                reassignmentCounter: "0",
            },
        },
    });
}

describe("GrpcQueryClient", () => {
    it.each(evaluatorCases)("executes $name through the canonical evaluator", async (entry) => {
        const provider = fixtureProvider();

        const client = new GrpcQueryClient({
            stateService: {} as never,
            updateService: {} as never,
            packageService: {} as never,
            dataProvider: provider,
        });

        await expect(entry.invoke(client, entry.args as never)).resolves.toEqual(entry.expected);
        expect(provider.readDatasetAsync).toHaveBeenCalledTimes(1);
    });

    it("keeps QueryCapabilityError exclusively for raw SQL", async () => {
        const client = new GrpcQueryClient({
            stateService: {} as never,
            updateService: {} as never,
            packageService: {} as never,
            dataProvider: fixtureProvider(),
        });

        await expect(client.$queryRaw("select 1")).rejects.toBeInstanceOf(QueryCapabilityError);
    });

    it("validates malformed typed input before provider I/O and keeps exercises collection-only", async () => {
        const provider = fixtureProvider();

        const client = new GrpcQueryClient({ stateService: {} as never, updateService: {} as never, packageService: {} as never, dataProvider: provider });

        expect(() => client.packages.findMany({ where: { unknown: { equals: "x" } } } as never)).toThrow("unknown is not a field of packages");
        expect(provider.readDatasetAsync).not.toHaveBeenCalled();
        expect("findUnique" in client.exercises).toBe(false);
        await expect(client.cacheContracts()).rejects.toBeInstanceOf(ValidationError);
    });

    it("serves a proven active-only contract query from the exact-scope cache without ACS or history", async () => {
        const stateService = {
            getLedgerEndAsync: vi.fn(),
            getLatestPrunedOffsetsAsync: vi.fn(),
            getActiveContractsPageAsync: vi.fn(),
        };

        const updateService = { getUpdatesPageAsync: vi.fn() };

        const contractCache = {
            readSnapshotAsync: vi.fn().mockResolvedValue({
                activeAtOffset: "300",
                contracts: [queryConformanceDataset.rows.contracts[0]],
            }),
        };

        const client = new GrpcQueryClient({
            stateService: stateService as never,
            updateService: updateService as never,
            packageService: {} as never,
            contractCache: contractCache as never,
        });

        await expect(client.contracts.findMany({ where: { active: true }, select: { contractId: true } })).resolves.toEqual([{ contractId: "C1" }]);
        expect(stateService.getLedgerEndAsync).not.toHaveBeenCalled();
        expect(stateService.getActiveContractsPageAsync).not.toHaveBeenCalled();
        expect(updateService.getUpdatesPageAsync).not.toHaveBeenCalled();
    });

    it("reads a point-in-time ACS on an active-only cache miss without writing a cache entry", async () => {
        const stateService = {
            getLedgerEndAsync: vi.fn().mockResolvedValue({ offset: "1" }),
            getLatestPrunedOffsetsAsync: vi.fn(),
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeAtOffset: "1", activeContracts: [] }),
        };

        const client = new GrpcQueryClient({ stateService: stateService as never, updateService: { getUpdatesPageAsync: vi.fn() } as never, packageService: {} as never });

        await expect(client.contracts.findMany({ where: { active: true } })).resolves.toEqual([]);
        expect(stateService.getLedgerEndAsync).toHaveBeenCalledTimes(1);
        expect(stateService.getActiveContractsPageAsync).toHaveBeenCalledTimes(1);
    });

    it("keeps history-only edges incomplete for a nonempty ACS snapshot", async () => {
        const stateService = {
            getLedgerEndAsync: vi.fn().mockResolvedValue({ offset: "1" }),
            getLatestPrunedOffsetsAsync: vi.fn(),
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeAtOffset: "1", activeContracts: [activeContract()] }),
        };

        const client = new GrpcQueryClient({ stateService: stateService as never, updateService: { getUpdatesPageAsync: vi.fn() } as never, packageService: {} as never });

        await expect(client.contracts.findMany({ where: { active: true }, select: { contractId: true } })).resolves.toEqual([{ contractId: "C1" }]);
    });

    it("uses bounded history for unconstrained contracts and transaction relations", async () => {
        const getUpdatesPageAsync = vi.fn().mockResolvedValue({ lowestPageOffsetExclusive: "0", highestPageOffsetInclusive: "1", updates: [] });

        const stateService = {
            getLedgerEndAsync: vi.fn().mockResolvedValue({ offset: "1" }),
            getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }),
            getActiveContractsPageAsync: vi.fn(),
        };

        const client = new GrpcQueryClient({ stateService: stateService as never, updateService: { getUpdatesPageAsync } as never, packageService: {} as never });

        await expect(client.contracts.findMany()).resolves.toEqual([]);
        await expect(client.transactions.findMany()).resolves.toEqual([]);
        expect(getUpdatesPageAsync).toHaveBeenCalledTimes(2);
        expect(stateService.getActiveContractsPageAsync).not.toHaveBeenCalled();
    });

    it("pins historical contract includes to the active cache offset", async () => {
        const getUpdatesPageAsync = vi.fn().mockResolvedValue({ lowestPageOffsetExclusive: "0", highestPageOffsetInclusive: "300", updates: [] });

        const stateService = {
            getLedgerEndAsync: vi.fn(),
            getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }),
            getActiveContractsPageAsync: vi.fn(),
        };

        const client = new GrpcQueryClient({
            stateService: stateService as never,
            updateService: { getUpdatesPageAsync } as never,
            packageService: {} as never,
            contractCache: {
                readSnapshotAsync: vi.fn().mockResolvedValue({ activeAtOffset: "300", contracts: [queryConformanceDataset.rows.contracts[0]] }),
            } as never,
        });

        await expect(client.contracts.findMany({ where: { active: true }, include: { exercises: { take: 1 } } })).resolves.toEqual([expect.objectContaining({ contractId: "C1", exercises: [] })]);
        expect(stateService.getLedgerEndAsync).not.toHaveBeenCalled();
        expect(getUpdatesPageAsync.mock.calls[0]![0]).toMatchObject({ endOffsetInclusive: "300" });
    });

    it("does not resolve packages for nonempty transaction history without a type/package closure", async () => {
        const getUpdatesPageAsync = vi.fn().mockResolvedValue({ lowestPageOffsetExclusive: "0", highestPageOffsetInclusive: "1", updates: [historyUpdate()] });

        const packageService = { listPackagesAsync: vi.fn(), getPackageAsync: vi.fn() };

        const client = new GrpcQueryClient({
            stateService: {
                getLedgerEndAsync: vi.fn().mockResolvedValue({ offset: "1" }),
                getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }),
                getActiveContractsPageAsync: vi.fn(),
            } as never,
            updateService: { getUpdatesPageAsync } as never,
            packageService: packageService as never,
        });

        await expect(client.transactions.findMany({ select: { ix: true } })).resolves.toEqual([{ ix: "1" }]);
        expect(packageService.listPackagesAsync).not.toHaveBeenCalled();
        expect(packageService.getPackageAsync).not.toHaveBeenCalled();
    });
});
