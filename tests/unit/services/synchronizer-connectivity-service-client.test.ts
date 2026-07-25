import { describe, expect, it, vi } from "vitest";
import {
    RequestOptions,
    SynchronizerConnectivityServiceClient,
} from "../../../src";
import {
    GetSynchronizerIdRequest,
    GetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse,
    ListRegisteredSynchronizersRequest,
    ListRegisteredSynchronizersResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";

describe("SynchronizerConnectivityServiceClient", () => {
    it("forwards synchronizer connectivity reads through the selected transport", async () => {
        const listConnectedSynchronizersAsync = vi.fn(
            async () =>
                ListConnectedSynchronizersResponse.create({
                    connectedSynchronizers: [],
                }),
        );

        const getSynchronizerIdAsync = vi.fn(
            async () =>
                GetSynchronizerIdResponse.create({
                    synchronizerId: "sync-1",
                    physicalSynchronizerId: "physical-sync-1",
                }),
        );

        const listRegisteredSynchronizersAsync = vi.fn(
            async () => ListRegisteredSynchronizersResponse.create({ results: [] }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            listConnectedSynchronizersAsync,
            getSynchronizerIdAsync,
            listRegisteredSynchronizersAsync,
        };

        const client = new SynchronizerConnectivityServiceClient(
            transport as never,
        );

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await client.listConnectedSynchronizersAsync(
            ListConnectedSynchronizersRequest.create(),
            options,
        );

        await client.getSynchronizerIdAsync(
            GetSynchronizerIdRequest.create({
                synchronizerAlias: "sync-alias-1",
            }),
            options,
        );

        await client.listRegisteredSynchronizersAsync(
            ListRegisteredSynchronizersRequest.create({ allStatuses: true }),
            options,
        );

        expect(listConnectedSynchronizersAsync).toHaveBeenLastCalledWith(
            ListConnectedSynchronizersRequest.create(),
            options,
        );
        expect(getSynchronizerIdAsync).toHaveBeenLastCalledWith(
            GetSynchronizerIdRequest.create({ synchronizerAlias: "sync-alias-1" }),
            options,
        );
        expect(listRegisteredSynchronizersAsync).toHaveBeenLastCalledWith(
            ListRegisteredSynchronizersRequest.create({ allStatuses: true }),
            options,
        );
    });
});
