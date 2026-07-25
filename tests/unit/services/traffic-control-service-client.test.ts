import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    TrafficControlServiceClient,
} from "../../../src";
import {
    TrafficControlStateRequest,
    TrafficControlStateResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";

describe("TrafficControlServiceClient", () => {
    it("forwards traffic control reads through the selected transport", async () => {
        const trafficControlStateAsync = vi.fn(
            async () =>
                TrafficControlStateResponse.create({}),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            trafficControlStateAsync,
        };

        const client = new TrafficControlServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await client.trafficControlStateAsync(
            TrafficControlStateRequest.create({
                synchronizerId: "sync-1",
            }),
            options,
        );

        expect(trafficControlStateAsync).toHaveBeenLastCalledWith(
            TrafficControlStateRequest.create({ synchronizerId: "sync-1" }),
            options,
        );
    });
});
