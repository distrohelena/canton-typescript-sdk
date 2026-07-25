import { describe, expect, it, vi } from "vitest";
import { RequestOptions } from "../../../src";
import { HealthServiceClient } from "../../../src/services/health/health-service-client.js";
import {
    HealthCheckRequest,
    HealthCheckResponse,
    HealthCheckResponse_ServingStatus,
} from "../../../src/transports/grpc/generated/canton/google/grpc/health/v1/health.js";

describe("HealthServiceClient", () => {
    it("checks health through the selected transport", async () => {
        const response = HealthCheckResponse.create({
            status: HealthCheckResponse_ServingStatus.SERVING,
        });
        const checkHealthAsync = vi.fn(async () => response);

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

        await expect(client.checkAsync(HealthCheckRequest.create({
            service: "grpc.health.v1.Health",
        }))).resolves.toBe(response);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await client.checkAsync(
            HealthCheckRequest.create({
                service: "grpc.health.v1.Health",
            }),
            options,
        );

        expect(checkHealthAsync).toHaveBeenLastCalledWith(
            expect.objectContaining({ service: "grpc.health.v1.Health" }),
            options,
        );
    });
});
