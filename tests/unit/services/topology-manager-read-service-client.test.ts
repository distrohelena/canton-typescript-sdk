import { describe, expect, it, vi } from "vitest";
import {
    ListAvailableStoresRequest,
    ListAvailableStoresResponse,
    RequestOptions,
    TopologyManagerReadServiceClient,
} from "../../../src";

describe("TopologyManagerReadServiceClient", () => {
    it("forwards topology manager read requests through the selected transport", async () => {
        const listAvailableStoresAsync = vi.fn(
            async () =>
                new ListAvailableStoresResponse({
                    storeIds: [],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            listAvailableStoresAsync,
        };

        const client = new TopologyManagerReadServiceClient(transport as never);

        const request = new ListAvailableStoresRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.listAvailableStoresAsync(request, options),
        ).resolves.toBeInstanceOf(ListAvailableStoresResponse);

        expect(listAvailableStoresAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
