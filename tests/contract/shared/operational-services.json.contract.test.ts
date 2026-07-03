import { describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    GetLedgerApiVersionResponse,
    GrantUserRightsRequest,
    UploadDarFileRequest,
    UserRightKind,
} from "../../../src";
import { PackageManagementServiceClient } from "../../../src/services/package-management/package-management-service-client.js";
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
