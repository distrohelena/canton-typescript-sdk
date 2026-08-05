import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    CantonManager,
    ContractCacheRequiredError,
    MemoryQueryCache,
    QuerySource,
} from "../../../src/index.js";
import { GrpcContractCache } from "../../../src/query/grpc/grpc-contract-cache.js";
import { GrpcQuerySnapshotReader } from "../../../src/query/grpc/grpc-query-snapshot-reader.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { GrantUserRightsRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { getLiveSeededContextAsync } from "../runtime/live-seeded-context.js";
import {
    getLiveQueryModelFixtureAsync,
    getLiveQueryModelV2FixtureAsync,
} from "../runtime/live-query-model-fixture.js";
import {
    archiveLiveIouAsync,
    createLiveIouAsync,
    grantLedgerUserActAsAsync,
} from "../runtime/live-query-manager-factory.js";

/**
 * Regression scenarios that unit tests with mocked transports cannot prove, because each one failed in a
 * live deployment while its mock-based test agreed with the bug:
 *
 * - one package name spanning multiple package ids (duplicate-package-metadata crash),
 * - multi-page ACS traversal with participant-minted page tokens (INVALID_ACS_PAGE_TOKEN),
 * - #package-name template filters inside real ACS requests (pushdown correctness),
 * - incremental history delta reads starting past offset zero.
 */
describe("live gRPC typed query regressions", () => {
    let manager: CantonManager | undefined;
    let party = "";
    let v1PackageId = "";
    let v2PackageId = "";
    let v1ActiveContractId = "";
    let v2ActiveContractId = "";
    let archivedContractId = "";

    beforeAll(async () => {
        const seeded = await getLiveSeededContextAsync();

        const v1 = await getLiveQueryModelFixtureAsync();

        const v2 = await getLiveQueryModelV2FixtureAsync();

        expect(v1.packageId).not.toBe(v2.packageId);

        v1PackageId = v1.packageId;
        v2PackageId = v2.packageId;

        manager = new CantonManager({
            grpc: seeded.grpcEnvironment.options,
            querySource: QuerySource.grpc,
            cache: { store: new MemoryQueryCache(), ttlMs: 600_000 },
        });

        await manager.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: v1.darBytes }),
        );
        await manager.grpc.packageManagementService.uploadDarFileAsync(
            UploadDarFileRequest.create({ darFile: v2.darBytes }),
        );

        const partyHint = `sdk-query-regressions-${seeded.runId}`;

        party = (await manager.grpc.partyManagementService.allocatePartyAsync(
            new AllocatePartyRequest({ partyIdHint: partyHint, displayName: partyHint }),
        )).party;

        await grantLedgerUserActAsAsync(manager, party);

        // Typed history queries read updates with the all-parties format, which requires readAsAnyParty.
        await manager.grpc.userManagementService.grantUserRightsAsync(
            GrantUserRightsRequest.create({
                userId: process.env.SDK_TEST_LEDGER_USER_ID ?? "ledger-api-user",
                identityProviderId: "",
                rights: [{ kind: { oneofKind: "canReadAsAnyParty", canReadAsAnyParty: {} } }],
            }),
        );

        v1ActiveContractId = await createLiveIouAsync(manager, party, party, v1PackageId);
        v2ActiveContractId = await createLiveIouAsync(manager, party, party, v2PackageId);
        archivedContractId = await createLiveIouAsync(manager, party, party, v1PackageId);
        await archiveLiveIouAsync(manager, party, archivedContractId, v1PackageId);
    }, 300_000);

    afterAll(async () => {
        await manager?.disposeAsync();
    }, 30_000);

    it("answers name-pinned active queries across multiple package ids sharing one package name", async () => {
        // ACS queries never fetch implicitly: without a warmed cache entry for this party scope they throw.
        await expect(manager!.query.contracts.findMany({ parties: [party], where: { active: true } }))
            .rejects.toBeInstanceOf(ContractCacheRequiredError);

        await manager!.query.cacheContracts({ parties: [party] });

        // Served from the warmed snapshot, deriving contractType metadata from creations that span two
        // package ids sharing one package name.
        const rows = await manager!.query.contracts.findMany({
            parties: [party],
            where: {
                active: true,
                contractType: {
                    packageName: { equals: "sdk-query-live-model" },
                    moduleName: { equals: "Main" },
                    entityName: { equals: "Iou" },
                },
            },
            include: { contractType: true },
            orderBy: [{ contractId: "asc" }],
        });

        const contractIds = rows.map((row) => row.contractId);

        expect(contractIds).toContain(v1ActiveContractId);
        expect(contractIds).toContain(v2ActiveContractId);
        expect(contractIds).not.toContain(archivedContractId);

        for (const row of rows) {
            expect(row.contractType).toMatchObject({
                packageName: "sdk-query-live-model",
                moduleName: "Main",
                entityName: "Iou",
            });
        }
    }, 120_000);

    it("resolves direct-exercise metadata from history events across both package versions", async () => {
        const exercises = await manager!.query.exercises.findMany({
            where: { contractId: { equals: archivedContractId } },
            include: { exerciseType: true, contractType: true },
            take: 10,
        });

        expect(exercises.length).toBeGreaterThanOrEqual(1);
        expect(exercises[0]).toMatchObject({
            contractId: archivedContractId,
            exerciseType: expect.objectContaining({
                choice: "Archive",
                consuming: true,
                choiceFqn: "sdk-query-live-model:Main:Iou:Archive",
            }),
            contractType: expect.objectContaining({
                templateFqn: "sdk-query-live-model:Main:Iou",
            }),
        });
    }, 300_000);

    it("serves catalog queries over a real package store containing same-name packages", async () => {
        const contractTypes = await manager!.query.contractTypes.findMany({
            where: {
                packageName: { equals: "sdk-query-live-model" },
                entityName: { equals: "Iou" },
            },
        });

        // Both versions declare an identical Main:Iou, so the name-keyed canonical row deduplicates to one.
        expect(contractTypes).toHaveLength(1);
        expect(contractTypes[0]).toMatchObject({ templateFqn: "sdk-query-live-model:Main:Iou", payloadType: "template" });

        const packages = await manager!.query.packages.findMany({
            where: { name: { equals: "sdk-query-live-model" } },
            orderBy: [{ version: "asc" }],
        });

        expect(packages.map((row) => [row.version, row.id])).toEqual([
            ["1.0.0", v1PackageId],
            ["2.0.0", v2PackageId],
        ]);
    }, 120_000);

    it("traverses a multi-page ACS with participant-minted page tokens", async () => {
        // maxPageSize 1 forces every continuation through a real page token; the participant validates each
        // token against the request it was minted for, which is exactly what mocked transports cannot do.
        const cache = new GrpcContractCache(
            manager!.grpc.stateService,
            new MemoryQueryCache(),
            60_000,
            "live-query-regressions",
            Date.now,
            1,
        );

        const result = await cache.cacheContracts({ parties: [party] });

        expect(result.contractCount).toBeGreaterThanOrEqual(2);

        const contracts = await cache.readContractsAsync({ parties: [party] });

        const cachedIds = (contracts ?? []).map((row) => row.contractId);

        expect(cachedIds).toContain(v1ActiveContractId);
        expect(cachedIds).toContain(v2ActiveContractId);

        // The snapshot reader's own ACS loop pages through the same token protocol.
        const reader = new GrpcQuerySnapshotReader(
            manager!.grpc.stateService as never,
            manager!.grpc.updateService as never,
            { activeContractPageSize: 1 },
        );

        const end = (await manager!.grpc.stateService.getLedgerEndAsync({})).offset;

        const snapshot = await reader.readActiveContractsAsync(end, [party]);

        expect(snapshot.activeContracts.length).toBeGreaterThanOrEqual(2);
    }, 120_000);

    it("extends an incremental history window with a delta read the participant accepts", async () => {
        const beginOffsets: string[] = [];

        const updateService = {
            getUpdatesPageAsync: async (request: { beginOffsetExclusive: string }) => {
                beginOffsets.push(request.beginOffsetExclusive);

                return manager!.grpc.updateService.getUpdatesPageAsync(request as never);
            },
        };

        const reader = new GrpcQuerySnapshotReader(
            manager!.grpc.stateService as never,
            updateService as never,
            { incrementalHistory: true },
        );

        const first = await reader.readCurrentHistoryAsync();

        expect(beginOffsets.length).toBeGreaterThanOrEqual(1);
        expect(beginOffsets.every((offset) => offset === "0")).toBe(true);

        const extraContractId = await createLiveIouAsync(manager!, party, party, v2PackageId);

        const requestsBeforeDelta = beginOffsets.length;

        const second = await reader.readCurrentHistoryAsync();

        // The delta read must start exactly at the cached window's end — and the participant must accept a
        // nonzero beginOffsetExclusive and serve only the new updates.
        const deltaOffsets = beginOffsets.slice(requestsBeforeDelta);

        expect(deltaOffsets.length).toBeGreaterThanOrEqual(1);
        expect(deltaOffsets.every((offset) => offset === first.endInclusive)).toBe(true);
        expect(second.updates.length).toBeGreaterThan(first.updates.length);
        expect(BigInt(second.endInclusive)).toBeGreaterThan(BigInt(first.endInclusive));

        const secondIds = JSON.stringify(second.updates);

        expect(secondIds).toContain(extraContractId);
    }, 300_000);
});
