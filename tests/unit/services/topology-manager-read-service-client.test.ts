import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    TopologyManagerReadServiceClient,
} from "../../../src";
import {
    ListAvailableStoresRequest,
    ListAvailableStoresResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";

describe("TopologyManagerReadServiceClient", () => {
    it("forwards topology manager read requests through the selected transport", async () => {
        const listAvailableStoresAsync = vi.fn(
            async () =>
                ListAvailableStoresResponse.create({
                    storeIds: [],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            listAvailableStoresAsync,
        };

        const client = new TopologyManagerReadServiceClient(transport as never);

        const request = ListAvailableStoresRequest.create();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.listAvailableStoresAsync(request, options),
        ).resolves.toEqual(ListAvailableStoresResponse.create({ storeIds: [] }));

        expect(listAvailableStoresAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
