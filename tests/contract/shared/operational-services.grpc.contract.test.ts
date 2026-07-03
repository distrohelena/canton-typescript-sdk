import { describe, expect, it } from "vitest";
import {
    CreatePartyRequest,
    GrantUserRightsRequest,
    HealthStatusResponse,
    PackageFormat,
    UploadPackageRequest,
    UserRightKind,
} from "../../../src";
import { PackagesClient } from "../../../src/services/packages/packages-client.js";
import { PartiesClient } from "../../../src/services/parties/parties-client.js";
import { SystemClient } from "../../../src/services/system/system-client.js";
import { UsersClient } from "../../../src/services/users/users-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("gRPC operational services contract", () => {
    it("supports the shared operational service surface", async () => {
        const transport = new GrpcTransport({
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

        const system = new SystemClient(transport);

        const parties = new PartiesClient(transport);

        const users = new UsersClient(transport);

        const packages = new PackagesClient(transport);

        await expect(system.getHealthAsync()).resolves.toBeInstanceOf(
            HealthStatusResponse,
        );
        await expect(
            parties.createAsync(new CreatePartyRequest()),
        ).resolves.toMatchObject({
            party: "Alice",
        });
        await expect(
            users.grantRightsAsync(
                new GrantUserRightsRequest({
                    userId: "carol",
                    rights: [{ type: UserRightKind.participantAdmin }],
                }),
            ),
        ).resolves.toMatchObject({
            rights: [{ type: UserRightKind.participantAdmin }],
        });
        await expect(
            packages.uploadAsync(
                new UploadPackageRequest({
                    bytes: new Uint8Array([1, 2, 3]),
                    format: PackageFormat.dar,
                }),
            ),
        ).resolves.toMatchObject({
            packageId: "pkg-1",
        });
    });
});
