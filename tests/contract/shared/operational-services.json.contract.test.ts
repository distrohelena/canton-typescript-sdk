import { describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    GetParticipantStatusRequest,
    NotSupportedError,
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
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("JSON operational services contract", () => {
    it("supports the gRPC-shaped operational service surface", async () => {
        const transport = new JsonTransport({
            getAsync: async () => ({ status: "healthy", version: "1.0.0" }),
            postAsync: async (path: string) => {
                if (path === "/v2/parties") {
                    return { partyDetails: { party: "Alice" } };
                } else if (path === "/v1/user/rights/grant") {
                    return {
                        result: [{ type: "participantAdmin" }],
                    };
                } else if (path === "/v1/packages") {
                    return { result: { packageId: "pkg-1" } };
                }

                return {};
            },
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
        ).rejects.toThrow(NotSupportedError);
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
        ).rejects.toThrow(NotSupportedError);
        await expect(
            packageService.getPackageAsync(
                GetPackageRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            packageService.getPackageStatusAsync(
                GetPackageStatusRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            packageService.listVettedPackagesAsync(
                ListVettedPackagesRequest.create(),
            ),
        ).rejects.toThrow(NotSupportedError);
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
        ).rejects.toThrow(NotSupportedError);
        await expect(
            participantPackageService.getPackageContentsAsync(
                GetPackageContentsRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            participantPackageService.getPackageReferencesAsync(
                GetPackageReferencesRequest.create({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            participantStatusService.getParticipantStatusAsync(
                new GetParticipantStatusRequest(),
            ),
        ).rejects.toThrow(NotSupportedError);
    });
});
