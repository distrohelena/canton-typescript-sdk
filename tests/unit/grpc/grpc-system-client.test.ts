import { describe, expect, it } from "vitest";
import { GetLedgerApiVersionResponse } from "../../../src";
import { VersionServiceClient } from "../../../src/services/version/version-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("VersionServiceClient with gRPC transport", () => {
    it("reports grpc signing capability", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({
                version: "3.4.0",
                features: {},
            }),
            createPartyAsync: async () => ({ identifier: "Alice" }),
            grantUserRightsAsync: async () => ({
                rights: [{ type: "participantAdmin" }],
            }),
            uploadPackageAsync: async () => ({ packageId: "pkg-1" }),
        });

        const client = new VersionServiceClient(transport);

        expect(transport.features.supportsCommandSigning).toBe(true);
        await expect(client.getLedgerApiVersionAsync()).resolves.toBeInstanceOf(
            GetLedgerApiVersionResponse,
        );
    });
});
