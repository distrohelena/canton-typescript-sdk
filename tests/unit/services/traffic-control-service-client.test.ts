import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    TrafficControlServiceClient,
    TrafficControlStateRequest,
    TrafficControlStateResponse,
} from "../../../src";

describe("TrafficControlServiceClient", () => {
    it("forwards traffic control reads through the selected transport", async () => {
        const trafficControlStateAsync = vi.fn(
            async () =>
                new TrafficControlStateResponse({}),
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
            new TrafficControlStateRequest({
                synchronizerId: "sync-1",
            }),
            options,
        );

        expect(trafficControlStateAsync).toHaveBeenLastCalledWith(
            expect.any(TrafficControlStateRequest),
            options,
        );
    });
});
