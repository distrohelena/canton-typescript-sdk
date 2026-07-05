import { describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    GetParticipantStatusRequest,
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
    GetPackageRequest,
    GetPackageStatusRequest,
    GetLedgerApiVersionResponse,
    GrantUserRightsRequest,
    HealthCheckRequest,
    ListPackagesRequest,
    ListVettedPackagesRequest,
    NotSupportedError,
    ParticipantListPackagesRequest,
    ParticipantStatusServiceClient,
    UploadDarFileRequest,
    UserRightKind,
} from "../../../src";
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
                if (path === "/v1/parties/allocate") {
                    return { result: { identifier: "Alice" } };
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

        const participantPackageService = new ParticipantPackageServiceClient(
            transport,
        );

        const participantStatusService = new ParticipantStatusServiceClient(
            transport,
        );

        await expect(
            healthService.checkAsync(
                new HealthCheckRequest({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
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
        ).rejects.toThrow(NotSupportedError);
        await expect(
            packageService.getPackageAsync(
                new GetPackageRequest({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            packageService.getPackageStatusAsync(
                new GetPackageStatusRequest({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            packageService.listVettedPackagesAsync(
                new ListVettedPackagesRequest(),
            ),
        ).rejects.toThrow(NotSupportedError);
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
        ).rejects.toThrow(NotSupportedError);
        await expect(
            participantPackageService.getPackageContentsAsync(
                new GetPackageContentsRequest({
                    packageId: "pkg-1",
                }),
            ),
        ).rejects.toThrow(NotSupportedError);
        await expect(
            participantPackageService.getPackageReferencesAsync(
                new GetPackageReferencesRequest({
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
