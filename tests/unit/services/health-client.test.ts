import { describe, expect, it } from "vitest";
import {
    HealthCheckRequest,
    HealthCheckResponse,
    HealthCheckStatus,
} from "../../../src";
import { HealthServiceClient } from "../../../src/services/health/health-service-client.js";

describe("HealthServiceClient", () => {
    it("checks health through the selected transport", async () => {
        const client = new HealthServiceClient({
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            checkHealthAsync: async () =>
                new HealthCheckResponse({
                    status: HealthCheckStatus.serving,
                }),
            getActiveContractsPageAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        });

        await expect(
            client.checkAsync(
                new HealthCheckRequest({
                    service: "grpc.health.v1.Health",
                }),
            ),
        ).resolves.toBeInstanceOf(HealthCheckResponse);
    });
});
