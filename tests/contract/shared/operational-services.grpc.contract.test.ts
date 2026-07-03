import { describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    GetLedgerApiVersionResponse,
    GrantUserRightsRequest,
    HealthCheckRequest,
    HealthCheckStatus,
    UploadDarFileRequest,
    UserRightKind,
} from "../../../src";
import { HealthServiceClient } from "../../../src/services/health/health-service-client.js";
import { PackageManagementServiceClient } from "../../../src/services/package-management/package-management-service-client.js";
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
        });

        const versionService = new VersionServiceClient(transport);

        const healthService = new HealthServiceClient(transport);

        const partyManagementService = new PartyManagementServiceClient(
            transport,
        );

        const userManagementService = new UserManagementServiceClient(
            transport,
        );

        const packageManagementService = new PackageManagementServiceClient(
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
            packageManagementService.uploadDarFileAsync(
                new UploadDarFileRequest({
                    bytes: new Uint8Array([1, 2, 3]),
                }),
            ),
        ).resolves.toMatchObject({
            packageId: "pkg-1",
        });
    });
});
