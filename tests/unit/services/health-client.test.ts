import { describe, expect, it, vi } from "vitest";
import {
    HealthCheckRequest,
    HealthCheckResponse,
    HealthCheckStatus,
    RequestOptions,
} from "../../../src";
import { HealthServiceClient } from "../../../src/services/health/health-service-client.js";

describe("HealthServiceClient", () => {
    it("checks health through the selected transport", async () => {
        const checkHealthAsync = vi.fn(
            async () =>
                new HealthCheckResponse({
                    status: HealthCheckStatus.serving,
                }),
        );

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
            checkHealthAsync,
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

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await client.checkAsync(
            new HealthCheckRequest({
                service: "grpc.health.v1.Health",
            }),
            options,
        );

        expect(checkHealthAsync).toHaveBeenLastCalledWith(
            expect.any(HealthCheckRequest),
            options,
        );
    });
});
