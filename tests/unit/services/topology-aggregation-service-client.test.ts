import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    TopologyAggregationServiceClient,
    TopologyListPartiesRequest,
    TopologyListPartiesResponse,
} from "../../../src";

describe("TopologyAggregationServiceClient", () => {
    it("forwards topology aggregation requests through the selected transport", async () => {
        const topologyListPartiesAsync = vi.fn(
            async () =>
                new TopologyListPartiesResponse({
                    results: [],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            topologyListPartiesAsync,
        };

        const client = new TopologyAggregationServiceClient(transport as never);

        const request = new TopologyListPartiesRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.listPartiesAsync(request, options),
        ).resolves.toBeInstanceOf(TopologyListPartiesResponse);

        expect(topologyListPartiesAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
