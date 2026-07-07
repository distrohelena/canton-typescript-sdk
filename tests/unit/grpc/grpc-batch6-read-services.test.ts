import { describe, expect, it } from "vitest";
import {
    RequestOptions,
    TrafficControlServiceClient,
    TrafficControlStateRequest,
} from "../../../src";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("GrpcTransport batch 6 read services", () => {
    it("maps traffic control reads", async () => {
        const transport = new GrpcTransport({
            getHealthAsync: async () => ({ version: "3.4.0", features: {} }),
            checkHealthAsync: async () => ({ status: 1 }),
            createPartyAsync: async () => ({ identifier: "unused" }),
            listPartiesAsync: async () => ({ partyDetails: [], nextPageToken: "" }),
            grantUserRightsAsync: async () => ({ rights: [] }),
            uploadPackageAsync: async () => ({ packageId: "unused" }),
            queryContractsAsync: async () => ({ activeContracts: [] }),
            streamTransactionsAsync: async () => [],
            submitCommandAsync: async () => ({ updateId: "unused" }),
            trafficControlStateAsync: async () => ({
                trafficState: {
                    extraTrafficPurchased: "100",
                    extraTrafficConsumed: "25",
                    baseTrafficRemainder: "75",
                    lastConsumedCost: "5",
                    timestamp: "1735689600",
                    serial: 7,
                },
            }),
        } as any);

        const client = new TrafficControlServiceClient(transport);

        const response = await client.trafficControlStateAsync(
            new TrafficControlStateRequest({
                synchronizerId: "sync-1",
            }),
            new RequestOptions({
                timeoutMs: 1_000,
            }),
        );

        expect(response.trafficState).toMatchObject({
            extraTrafficPurchased: "100",
            extraTrafficConsumed: "25",
            baseTrafficRemainder: "75",
            lastConsumedCost: "5",
            timestamp: "1735689600",
            serial: 7,
        });
    });
});
