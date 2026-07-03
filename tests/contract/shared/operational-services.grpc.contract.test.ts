import { describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    GetPackageRequest,
    GetPackageStatusRequest,
    GetLedgerApiVersionResponse,
    GrantUserRightsRequest,
    HashFunction,
    HealthCheckRequest,
    HealthCheckStatus,
    ListPackagesRequest,
    ListVettedPackagesRequest,
    PackageStatus,
    ParticipantListPackagesRequest,
    UploadDarFileRequest,
    UserRightKind,
} from "../../../src";
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
                rights: [{ type: "participantAdmin" }],
            }),
            uploadPackageAsync: async () => ({ packageId: "pkg-1" }),
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

        const participantPackageService = new ParticipantPackageServiceClient(
            transport,
        );

        await expect(
            healthService.checkAsync(
                new HealthCheckRequest({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).resolves.toMatchObject({
            status: HealthCheckStatus.serving,
        });
        await expect(
            versionService.getLedgerApiVersionAsync(),
        ).resolves.toBeInstanceOf(
            GetLedgerApiVersionResponse,
        );
        await expect(
            partyManagementService.allocatePartyAsync(new AllocatePartyRequest()),
        ).resolves.toMatchObject({
            party: "Alice",
        });
        await expect(
            userManagementService.grantUserRightsAsync(
                new GrantUserRightsRequest({
                    userId: "carol",
                    rights: [{ type: UserRightKind.participantAdmin }],
                }),
            ),
        ).resolves.toMatchObject({
            rights: [{ type: UserRightKind.participantAdmin }],
        });
        await expect(
            packageService.listPackagesAsync(
                new ListPackagesRequest(),
            ),
        ).resolves.toMatchObject({
            packageIds: ["pkg-1"],
        });
        await expect(
            packageService.getPackageAsync(
                new GetPackageRequest({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            hashFunction: HashFunction.sha256,
            hash: "pkg-1",
        });
        await expect(
            packageService.getPackageStatusAsync(
                new GetPackageStatusRequest({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            packageStatus: PackageStatus.registered,
        });
        await expect(
            packageService.listVettedPackagesAsync(
                new ListVettedPackagesRequest(),
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
            participantPackageService.uploadDarFileAsync(
                new UploadDarFileRequest({
                    bytes: new Uint8Array([1, 2, 3]),
                }),
            ),
        ).resolves.toMatchObject({
            packageId: "pkg-1",
        });
        await expect(
            participantPackageService.listPackagesAsync(
                new ParticipantListPackagesRequest(),
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
                new GetPackageContentsRequest({
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
                new GetPackageReferencesRequest({
                    packageId: "pkg-1",
                }),
            ),
        ).resolves.toMatchObject({
            dars: [{ main: "pkg-1" }],
        });
    });
});
