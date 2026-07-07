import { describe, expect, it } from "vitest";
import {
    GetDarContentsRequest,
    GetDarRequest,
    GetHighestOffsetByTimestampRequest,
    ListDarsRequest,
    ListPendingOperationsRequest,
    ParticipantPackageServiceClient,
    ParticipantPartyManagementServiceClient,
    ParticipantRepairServiceClient,
    RequestOptions,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 3 read services", () => {
    it("maps participant-admin package and lightweight read methods", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            listParticipantPackagesAsync: async () => ({
                packageDescriptions: [],
            }),
            getParticipantPackageContentsAsync: async () => ({
                modules: [],
                isUtilityPackage: false,
                languageVersion: "2.dev",
            }),
            getParticipantPackageReferencesAsync: async () => ({
                dars: [],
            }),
            getParticipantDarAsync: async () => ({
                payload: new Uint8Array([1, 2, 3]),
                data: {
                    main: "pkg-1",
                    name: "Main",
                    version: "1.0.0",
                    description: "Primary DAR",
                },
            }),
            listParticipantDarsAsync: async () => ({
                dars: [
                    {
                        main: "pkg-1",
                        name: "Main",
                        version: "1.0.0",
                        description: "Primary DAR",
                    },
                ],
            }),
            getParticipantDarContentsAsync: async () => ({
                description: {
                    main: "pkg-1",
                    name: "Main",
                    version: "1.0.0",
                    description: "Primary DAR",
                },
                packages: [
                    {
                        packageId: "pkg-1",
                        name: "Main",
                        version: "1.0.0",
                        size: 100,
                    },
                ],
            }),
            getHighestOffsetByTimestampAsync: async () => ({
                ledgerOffset: "42",
            }),
            listPendingOperationsAsync: async () => ({
                pendingOperations: [
                    {
                        operationName: "repair-op",
                        operationKey: "key-1",
                        synchronizer: {
                            kind: {
                                oneofKind: "id",
                                id: "sync-1",
                            },
                        },
                    },
                ],
            }),
        } as any);

        const options = new RequestOptions({
            timeoutMs: 1_000,
        });

        const participantPackage = new ParticipantPackageServiceClient(
            transport,
        );

        const participantPartyManagement =
            new ParticipantPartyManagementServiceClient(transport);

        const participantRepair = new ParticipantRepairServiceClient(
            transport,
        );

        const dar = await participantPackage.getDarAsync(
            new GetDarRequest({
                mainPackageId: "pkg-1",
            }),
            options,
        );

        const dars = await participantPackage.listDarsAsync(
            new ListDarsRequest({
                limit: 10,
            }),
            options,
        );

        const darContents = await participantPackage.getDarContentsAsync(
            new GetDarContentsRequest({
                mainPackageId: "pkg-1",
            }),
            options,
        );

        const highestOffset =
            await participantPartyManagement.getHighestOffsetByTimestampAsync(
                new GetHighestOffsetByTimestampRequest({
                    synchronizerId: "sync-1",
                    timestamp: new Date("2026-01-01T00:00:00.000Z"),
                    force: true,
                }),
                options,
            );

        const pendingOperations =
            await participantRepair.listPendingOperationsAsync(
                new ListPendingOperationsRequest({
                    operationName: "repair-op",
                }),
                options,
            );

        expect(dar.payload).toEqual(new Uint8Array([1, 2, 3]));
        expect(dars.dars[0]?.main).toBe("pkg-1");
        expect(darContents.packages[0]?.packageId).toBe("pkg-1");
        expect(highestOffset.ledgerOffset).toBe("42");
        expect(pendingOperations.pendingOperations[0]).toMatchObject({
            operationName: "repair-op",
            operationKey: "key-1",
            synchronizerId: "sync-1",
        });
    });
});
