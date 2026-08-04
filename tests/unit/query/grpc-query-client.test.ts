import { describe, expect, it, vi } from "vitest";
import { GrpcQueryClient } from "../../../src/query/grpc/grpc-query-client.js";
import { QueryCapabilityError } from "../../../src/query/errors/query-capability-error.js";
import { ValidationError } from "../../../src/core/errors/validation-error.js";
import { Event, CreatedEvent, ExercisedEvent } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event.js";
import { Transaction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/transaction.js";
import { GetUpdateResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import { GetActiveContractsResponse } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import { Value } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/value.js";
import { Archive } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { HashFunction } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { createHash } from "node:crypto";
import { canonicalPublicNumericIdentity, canonicalPublicNumericIdentityParts } from "../../../src/query/canonical/public-identity.js";
import { queryConformanceDataset, evaluatorCases } from "./query-conformance-fixture.js";

function fixtureProvider() {
    return {
        readDatasetAsync: vi.fn().mockResolvedValue(queryConformanceDataset),
    };
}

function historyUpdate(
    offset = "1",
    templateId = { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" },
    packageName = "app",
): GetUpdateResponse {
    const created = CreatedEvent.create({
        offset,
        nodeId: 1,
        contractId: "C1",
        templateId,
        packageName,
        representativePackageId: templateId.packageId,
        witnessParties: ["Alice"],
        signatories: ["Alice"],
        createdAt: { seconds: "1700000000", nanos: 0 },
        createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] },
    });

    const transaction = Transaction.create({
        offset,
        updateId: `update-${offset}`,
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

function packageFixture() {
    const archive = Archive.fromBinary(SampleLfPackageFixture.createLf2ArchiveBytes());

    const id = createHash("sha256").update(archive.payload).digest("hex");

    return { id, response: { hashFunction: HashFunction.SHA256, archivePayload: archive.payload, hash: id } };
}

describe("GrpcQueryClient", () => {
    it.each(evaluatorCases)("executes $name through the canonical evaluator", async (entry) => {
        const provider = fixtureProvider();

        const client = new GrpcQueryClient({
            stateService: {} as never,
            updateService: {} as never,
            packageService: {} as never,
        }, provider);

        await expect(entry.invoke(client, entry.args as never)).resolves.toEqual(entry.expected);
        expect(provider.readDatasetAsync).toHaveBeenCalledTimes(1);
    });

    it("keeps QueryCapabilityError exclusively for raw SQL", async () => {
        const client = new GrpcQueryClient({
            stateService: {} as never,
            updateService: {} as never,
            packageService: {} as never,
        }, fixtureProvider());

        await expect(client.$queryRaw("select 1")).rejects.toBeInstanceOf(QueryCapabilityError);
    });

    it("validates malformed typed input before provider I/O and keeps exercises collection-only", async () => {
        const provider = fixtureProvider();

        const client = new GrpcQueryClient({ stateService: {} as never, updateService: {} as never, packageService: {} as never }, provider);

        await expect(client.packages.findMany({ where: { unknown: { equals: "x" } } } as never)).rejects.toThrow("unknown is not a field of packages");
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

    it("uses canonical explicit parties for an active ACS probe without narrowing history", async () => {
        const stateService = {
            getLedgerEndAsync: vi.fn().mockResolvedValue({ offset: "1" }),
            getLatestPrunedOffsetsAsync: vi.fn(),
            getActiveContractsPageAsync: vi.fn().mockResolvedValue({ activeAtOffset: "1", activeContracts: [] }),
        };

        const client = new GrpcQueryClient({ stateService: stateService as never, updateService: { getUpdatesPageAsync: vi.fn() } as never, packageService: {} as never });

        await client.contracts.findMany({ parties: ["Bob", "Alice", "Alice"], where: { active: true } });
        expect(stateService.getActiveContractsPageAsync.mock.calls[0]![0].eventFormat).toMatchObject({ filtersByParty: { Alice: expect.anything(), Bob: expect.anything() } });
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
        const fixture = packageFixture();

        const templateId = { packageId: fixture.id, moduleName: "Sample.Module", entityName: "Iou" };

        const getUpdatesPageAsync = vi.fn().mockResolvedValue({ lowestPageOffsetExclusive: "0", highestPageOffsetInclusive: "300", updates: [historyUpdate("100", templateId, "sample-package")] });

        const stateService = {
            getLedgerEndAsync: vi.fn(),
            getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }),
            getActiveContractsPageAsync: vi.fn(),
        };

        const client = new GrpcQueryClient({
            stateService: stateService as never,
            updateService: { getUpdatesPageAsync } as never,
            packageService: { listPackagesAsync: vi.fn(), getPackageAsync: vi.fn().mockResolvedValue(fixture.response) } as never,
            contractCache: {
                readSnapshotAsync: vi.fn().mockResolvedValue({ activeAtOffset: "300", contracts: [queryConformanceDataset.rows.contracts[0]] }),
            } as never,
        });

        await expect(client.contracts.findMany({ where: { active: true }, include: { exercises: { take: 1 } } })).resolves.toEqual([expect.objectContaining({ contractId: "C1", exercises: [] })]);
        expect(stateService.getLedgerEndAsync).not.toHaveBeenCalled();
        expect(getUpdatesPageAsync.mock.calls[0]![0]).toMatchObject({ endOffsetInclusive: "300" });
    });

    it("uses complete history rows when a party-scoped cache supplies only the offset", async () => {
        const makeCreated = (contractId: string, witness: string, nodeId: number) => CreatedEvent.create({
            offset: "99",
            nodeId,
            contractId,
            templateId: { packageId: "pkg-id", moduleName: "Main", entityName: "Asset" },
            packageName: "app",
            representativePackageId: "pkg-id",
            witnessParties: [witness],
            signatories: [witness],
            createdAt: { seconds: "1700000000", nanos: 0 },
            createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: witness } }) }] },
        });

        const transaction = Transaction.create({
            offset: "99",
            updateId: "update-99",
            effectiveAt: { seconds: "1700000000", nanos: 0 },
            recordTime: { seconds: "1700000000", nanos: 0 },
            synchronizerId: "sync",
            events: [
                Event.create({ event: { oneofKind: "created", created: makeCreated("C1", "Alice", 1) } }),
                Event.create({ event: { oneofKind: "created", created: makeCreated("C2", "Bob", 2) } }),
            ],
        });

        const getUpdatesPageAsync = vi.fn().mockResolvedValue({ lowestPageOffsetExclusive: "0", highestPageOffsetInclusive: "99", updates: [GetUpdateResponse.create({ update: { oneofKind: "transaction", transaction } })] });

        const client = new GrpcQueryClient({
            stateService: { getLedgerEndAsync: vi.fn(), getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }), getActiveContractsPageAsync: vi.fn() } as never,
            updateService: { getUpdatesPageAsync } as never,
            packageService: {} as never,
            contractCache: { readSnapshotAsync: vi.fn().mockResolvedValue({ activeAtOffset: "99", contracts: [queryConformanceDataset.rows.contracts[0]] }) } as never,
        });

        const rows = await client.contracts.findMany({
            parties: ["Alice"],
            where: { active: true },
            select: { contractId: true },
            include: { createdTransaction: { include: { createdContracts: { take: 10, select: { contractId: true } } } } },
        });

        expect(rows).toEqual([{ contractId: "C1", createdTransaction: expect.objectContaining({ createdContracts: [{ contractId: "C1" }, { contractId: "C2" }] }) }]);
        expect(getUpdatesPageAsync.mock.calls[0]![0]).toMatchObject({ endOffsetInclusive: "99" });
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

    it("uses Package Service directly for packages and type collections", async () => {
        const fixture = packageFixture();

        const packageService = {
            listPackagesAsync: vi.fn().mockResolvedValue({ packageIds: [fixture.id] }),
            getPackageAsync: vi.fn().mockResolvedValue(fixture.response),
        };

        const stateService = { getLedgerEndAsync: vi.fn().mockResolvedValue({ offset: "1" }), getLatestPrunedOffsetsAsync: vi.fn(), getActiveContractsPageAsync: vi.fn() };

        const client = new GrpcQueryClient({ stateService: stateService as never, updateService: {} as never, packageService: packageService as never });

        await expect(client.packages.findMany({ select: { id: true } })).resolves.toEqual([{ id: fixture.id }]);
        await expect(client.contractTypes.findMany({ select: { entityName: true, payloadType: true } })).resolves.toEqual([
            { entityName: "EventLog", payloadType: "interface" },
            { entityName: "Iou", payloadType: "template" },
        ]);
        await expect(client.exerciseTypes.findMany({ select: { choice: true } })).resolves.toEqual([{ choice: "EventLog_HoldingsChange" }, { choice: "Transfer" }]);
        expect(stateService.getLedgerEndAsync).toHaveBeenCalledTimes(3);
        expect(packageService.listPackagesAsync).toHaveBeenCalledTimes(3);
        expect(packageService.getPackageAsync).toHaveBeenCalledTimes(3);
    });

    it("uses a cache offset but rereads ACS for active metadata/private joins", async () => {
        const fixture = packageFixture();

        const created = CreatedEvent.create({
            offset: "99",
            nodeId: 1,
            contractId: "C1",
            templateId: { packageId: fixture.id, moduleName: "Sample.Module", entityName: "Iou" },
            packageName: "sample-package",
            representativePackageId: fixture.id,
            witnessParties: ["Alice"],
            signatories: ["Alice"],
            createdAt: { seconds: "1700000000", nanos: 0 },
            createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] },
        });

        const getActiveContractsPageAsync = vi.fn().mockResolvedValue({ activeAtOffset: "99", activeContracts: [GetActiveContractsResponse.create({ contractEntry: { oneofKind: "activeContract", activeContract: { createdEvent: created, synchronizerId: "sync", reassignmentCounter: "0" } } })] });

        const getLedgerEndAsync = vi.fn().mockResolvedValue({ offset: "100" });

        const packageService = { listPackagesAsync: vi.fn(), getPackageAsync: vi.fn().mockResolvedValue(fixture.response) };

        const client = new GrpcQueryClient({
            stateService: { getLedgerEndAsync, getLatestPrunedOffsetsAsync: vi.fn(), getActiveContractsPageAsync } as never,
            updateService: {} as never,
            packageService: packageService as never,
            contractCache: { readSnapshotAsync: vi.fn().mockResolvedValue({ activeAtOffset: "99", contracts: [queryConformanceDataset.rows.contracts[0]] }) } as never,
        });

        await expect(client.contracts.findMany({ where: { active: true }, select: { contractId: true }, include: { contractType: { select: { entityName: true } } } })).resolves.toEqual([{ contractId: "C1", contractType: { entityName: "Iou" } }]);
        expect(getLedgerEndAsync).not.toHaveBeenCalled();
        expect(getActiveContractsPageAsync.mock.calls[0]![0]).toMatchObject({ activeAtOffset: "99" });
        expect(packageService.getPackageAsync).toHaveBeenCalledExactlyOnceWith({ packageId: fixture.id });
    });

    it("reads complete history for contracts -> contractType -> contracts and includes archived matching-template rows", async () => {
        const fixture = packageFixture();

        const templateId = { packageId: fixture.id, moduleName: "Sample.Module", entityName: "Iou" };

        const created = (contractId: string, offset: string, nodeId: number) => CreatedEvent.create({
            offset,
            nodeId,
            contractId,
            templateId,
            packageName: "sample-package",
            representativePackageId: fixture.id,
            witnessParties: ["Alice"],
            signatories: ["Alice"],
            createdAt: { seconds: "1700000000", nanos: 0 },
            createArguments: { fields: [{ label: "owner", value: Value.create({ sum: { oneofKind: "party", party: "Alice" } }) }] },
        });

        const transaction = (offset: string, event: Event) => Transaction.create({
            offset,
            updateId: `update-${offset}`,
            effectiveAt: { seconds: "1700000000", nanos: 0 },
            recordTime: { seconds: "1700000000", nanos: 0 },
            synchronizerId: "sync",
            events: [event],
        });

        const c1 = created("C1", "100", 1);

        const c2 = created("C2", "200", 1);

        const archive = ExercisedEvent.create({
            offset: "300",
            nodeId: 2,
            contractId: "C2",
            templateId,
            packageName: "sample-package",
            choice: "Transfer",
            choiceArgument: Value.create({ sum: { oneofKind: "unit", unit: {} } }),
            exerciseResult: Value.create({ sum: { oneofKind: "unit", unit: {} } }),
            actingParties: ["Alice"],
            witnessParties: ["Alice"],
            consuming: true,
            lastDescendantNodeId: 2,
        });

        const updates = [
            GetUpdateResponse.create({ update: { oneofKind: "transaction", transaction: transaction("100", Event.create({ event: { oneofKind: "created", created: c1 } })) } }),
            GetUpdateResponse.create({ update: { oneofKind: "transaction", transaction: transaction("200", Event.create({ event: { oneofKind: "created", created: c2 } })) } }),
            GetUpdateResponse.create({ update: { oneofKind: "transaction", transaction: transaction("300", Event.create({ event: { oneofKind: "exercised", exercised: archive } })) } }),
        ];

        const getUpdatesPageAsync = vi.fn().mockResolvedValue({ lowestPageOffsetExclusive: "0", highestPageOffsetInclusive: "300", updates });

        const packageService = { listPackagesAsync: vi.fn(), getPackageAsync: vi.fn().mockResolvedValue(fixture.response) };

        const getLedgerEndAsync = vi.fn().mockResolvedValue({ offset: "300" });

        const client = new GrpcQueryClient({
            stateService: { getLedgerEndAsync, getLatestPrunedOffsetsAsync: vi.fn().mockResolvedValue({ participantPrunedUpToInclusive: "0" }), getActiveContractsPageAsync: vi.fn() } as never,
            updateService: { getUpdatesPageAsync } as never,
            packageService: packageService as never,
            contractCache: { readSnapshotAsync: vi.fn().mockResolvedValue({ activeAtOffset: "300", contracts: [queryConformanceDataset.rows.contracts[0]] }) } as never,
        });

        const rows = await client.contracts.findMany({
            where: { active: true },
            select: { contractId: true },
            include: { contractType: { select: { entityName: true }, include: { contracts: { take: 10, select: { contractId: true, active: true } } } } },
        });

        const exercises = await client.exercises.findMany({
            select: { tpePk: true, contractTpePk: true },
        });

        expect(rows).toEqual([expect.objectContaining({ contractId: "C1", contractType: expect.objectContaining({ entityName: "Iou", contracts: expect.arrayContaining([expect.objectContaining({ contractId: "C2", active: false })]) }) })]);
        expect(exercises).toEqual([{
            tpePk: canonicalPublicNumericIdentity("sample-package:Sample.Module:Iou:Transfer"),
            contractTpePk: canonicalPublicNumericIdentityParts(["template", "sample-package:Sample.Module:Iou"]),
        }]);
        expect(getUpdatesPageAsync.mock.calls[0]![0]).toMatchObject({ beginOffsetExclusive: "0", endOffsetInclusive: "300" });
        expect(getLedgerEndAsync).toHaveBeenCalledTimes(1);
        expect(packageService.listPackagesAsync).not.toHaveBeenCalled();
        expect(packageService.getPackageAsync).toHaveBeenCalledTimes(2);
        expect(packageService.getPackageAsync).toHaveBeenLastCalledWith({ packageId: fixture.id });
    });
});
