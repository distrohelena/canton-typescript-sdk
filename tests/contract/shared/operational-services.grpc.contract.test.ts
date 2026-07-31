import { describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    GetParticipantStatusRequest,
    PackageManagementServiceClient,
    ParticipantStatusServiceClient,
} from "../../../src";
import {
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    ListPackagesRequest as ParticipantListPackagesRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import { HealthCheckRequest } from "../../../src/transports/grpc/generated/canton/google/grpc/health/v1/health.js";
import {
    GetPackageRequest,
    GetPackageStatusRequest,
    ListPackagesRequest,
    ListVettedPackagesRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";
import { UploadDarFileRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import { GrantUserRightsRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { HealthServiceClient } from "../../../src/services/health/health-service-client.js";
import { PackageServiceClient } from "../../../src/services/package/package-service-client.js";
import { ParticipantPackageServiceClient } from "../../../src/services/participant-package/participant-package-service-client.js";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";
import { UserManagementServiceClient } from "../../../src/services/user-management/user-management-service-client.js";
import { VersionServiceClient } from "../../../src/services/version/version-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("gRPC operational services contract", () => {
    it("supports the gRPC-shaped operational service surface", async () => {
        const transport = new GrpcTransport({
            checkHealthAsync: async () => ({ status: 1 }),
            getHealthAsync: async () => ({
                status: "healthy",
                version: "1.0.0",
            }),
            createPartyAsync: async () => ({ identifier: "Alice" }),
            grantUserRightsAsync: async () => ({
                newlyGrantedRights: [
                    { kind: { oneofKind: "participantAdmin", participantAdmin: {} } },
                ],
            }),
            uploadPackageAsync: async () => ({}),
            listPackagesAsync: async () => ({
                packageIds: ["pkg-1"],
            }),
            getPackageAsync: async () => ({
                hashFunction: 0,
                archivePayload: new Uint8Array([1, 2, 3]),
                hash: "pkg-1",
            }),
            getPackageStatusAsync: async () => ({
                packageStatus: 1,
            }),
            listVettedPackagesAsync: async () => ({
                vettedPackages: [
                    {
                        packages: [
                            {
                                packageId: "pkg-1",
                                packageName: "Main",
                                packageVersion: "1.0.0",
                            },
                        ],
                        participantId: "participant-1",
                        synchronizerId: "sync-1",
                        topologySerial: 7,
                    },
                ],
                nextPageToken: "",
            }),
            listParticipantPackagesAsync: async () => ({
                packageDescriptions: [
                    {
                        packageId: "pkg-1",
                        name: "Main",
                        version: "1.0.0",
                        size: 123,
                    },
                ],
            }),
            getParticipantPackageContentsAsync: async () => ({
                description: {
                    packageId: "pkg-1",
                    name: "Main",
                    version: "1.0.0",
                    size: 123,
                },
                modules: [{ name: "Main.Module" }],
                isUtilityPackage: false,
                languageVersion: "2.dev",
            }),
            getParticipantPackageReferencesAsync: async () => ({
                dars: [
                    {
                        main: "pkg-1",
                        name: "main-dar",
                        version: "1.0.0",
                        description: "Main DAR",
                    },
                ],
            }),
            getParticipantStatusAsync: async () => ({
                kind: {
                    oneofKind: "status",
                    status: {
                        commonStatus: {
                            uid: "participant::sandbox",
                            ports: {},
                            active: true,
                            components: [],
                            version: "3.4.0",
                        },
                        connectedSynchronizers: [
                            {
                                physicalSynchronizerId: "sync::sandbox",
                                health: 1,
                            },
                        ],
                        active: true,
                        supportedProtocolVersions: [30],
                    },
                },
            }),
        });

        const versionService = new VersionServiceClient(transport);

        const healthService = new HealthServiceClient(transport);

        const partyManagementService = new PartyManagementServiceClient(
            transport,
        );

        const userManagementService = new UserManagementServiceClient(
            transport,
        );

        const packageService = new PackageServiceClient(
            transport,
        );

        const packageManagementService = new PackageManagementServiceClient(
            transport,
        );

        const participantPackageService = new ParticipantPackageServiceClient(
            transport,
        );

        const participantStatusService = new ParticipantStatusServiceClient(
            transport,
        );

        await expect(
            healthService.checkAsync(
                HealthCheckRequest.create({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).resolves.toMatchObject({
            status: 1,
        });
        await expect(
            versionService.getLedgerApiVersionAsync(),
        ).resolves.toMatchObject({ version: "1.0.0" });
        await expect(
            partyManagementService.allocatePartyAsync(new AllocatePartyRequest()),
        ).resolves.toMatchObject({
            party: "Alice",
        });
        await expect(
            userManagementService.grantUserRightsAsync(
                GrantUserRightsRequest.create({
                    userId: "carol",
                    rights: [
                        {
                            kind: {
                                oneofKind: "participantAdmin",
                                participantAdmin: {},
                            },
                        },
                    ],
                }),
            ),
        ).resolves.toMatchObject({
            newlyGrantedRights: [
                { kind: { oneofKind: "participantAdmin" } },
            ],
        });
        await expect(
            packageService.listPackagesAsync(
                ListPackagesRequest.create(),
            ),
        ).resolves.toMatchObject({
            packageIds: ["pkg-1"],
        });
        await expect(
            packageService.getPackageAsync(
                GetPackageRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            hashFunction: 0,
            hash: "pkg-1",
        });
        await expect(
            packageService.getPackageStatusAsync(
                GetPackageStatusRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            packageStatus: 1,
        });
        await expect(
            packageService.listVettedPackagesAsync(
                ListVettedPackagesRequest.create(),
            ),
        ).resolves.toMatchObject({
            vettedPackages: [
                {
                    participantId: "participant-1",
                    synchronizerId: "sync-1",
                },
            ],
        });
        await expect(
            packageManagementService.uploadDarFileAsync(
                UploadDarFileRequest.create({
                    darFile: new Uint8Array([1, 2, 3]),
                }),
            ),
        ).resolves.toEqual({});
        await expect(
            participantPackageService.listPackagesAsync(
                ParticipantListPackagesRequest.create(),
            ),
        ).resolves.toMatchObject({
            packageDescriptions: [
                {
                    packageId: "pkg-1",
                    name: "Main",
                },
            ],
        });
        await expect(
            participantPackageService.getPackageContentsAsync(
                GetPackageContentsRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            description: {
                packageId: "pkg-1",
            },
            modules: [{ name: "Main.Module" }],
        });
        await expect(
            participantPackageService.getPackageReferencesAsync(
                GetPackageReferencesRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            dars: [{ main: "pkg-1" }],
        });
        await expect(
            participantStatusService.getParticipantStatusAsync(
                new GetParticipantStatusRequest(),
            ),
        ).resolves.toMatchObject({
            kind: {
                oneofKind: "status",
                status: {
                    commonStatus: { uid: "participant::sandbox" },
                    connectedSynchronizers: [
                        {
                            physicalSynchronizerId: "sync::sandbox",
                            health: 1,
                        },
                    ],
                },
            },
        });
    });
});
