import { describe, expect, it } from "vitest";
import {
    RequestOptions,
    TrafficControlServiceClient,
} from "../../../src";
import {
    TrafficControlStateRequest,
    TrafficControlStateResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 6 read services", () => {
    it("maps traffic control reads", async () => {
        const trafficControlStateResponse = TrafficControlStateResponse.create({
            trafficState: {
                extraTrafficPurchased: "100",
                extraTrafficConsumed: "25",
                baseTrafficRemainder: "75",
                lastConsumedCost: "5",
                timestamp: "1735689600",
                serial: 7,
            },
        });
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            getUpdatesAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            trafficControlStateAsync: async () => trafficControlStateResponse,
        } as any);

        const client = new TrafficControlServiceClient(transport);

        const response = await client.trafficControlStateAsync(
            TrafficControlStateRequest.create({
                synchronizerId: "sync-1",
            }),
            new RequestOptions({
                timeoutMs: 1_000,
            }),
        );

        expect(response).toBe(trafficControlStateResponse);
    });
});
