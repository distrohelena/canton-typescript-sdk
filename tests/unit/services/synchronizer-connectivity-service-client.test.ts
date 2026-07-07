import { describe, expect, it, vi } from "vitest";
import {
    GetSynchronizerIdRequest,
    GetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse,
    RequestOptions,
    SynchronizerConnectivityServiceClient,
} from "../../../src";

describe("SynchronizerConnectivityServiceClient", () => {
    it("forwards synchronizer connectivity reads through the selected transport", async () => {
        const listConnectedSynchronizersAsync = vi.fn(
            async () =>
                new ListConnectedSynchronizersResponse({
                    connectedSynchronizers: [],
                }),
        );

        const getSynchronizerIdAsync = vi.fn(
            async () =>
                new GetSynchronizerIdResponse({
                    synchronizerId: "sync-1",
                    physicalSynchronizerId: "physical-sync-1",
                }),
        );

        const listRegisteredSynchronizersAsync = vi.fn(
            async () => ({
                registeredSynchronizers: [],
            }),
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
            new ListConnectedSynchronizersRequest(),
            options,
        );

        await client.getSynchronizerIdAsync(
            new GetSynchronizerIdRequest({
                synchronizerAlias: "sync-alias-1",
            }),
            options,
        );

        await (client as any).listRegisteredSynchronizersAsync(
            {
                allStatuses: true,
            },
            options,
        );

        expect(listConnectedSynchronizersAsync).toHaveBeenLastCalledWith(
            expect.any(ListConnectedSynchronizersRequest),
            options,
        );
        expect(getSynchronizerIdAsync).toHaveBeenLastCalledWith(
            expect.any(GetSynchronizerIdRequest),
            options,
        );
        expect(listRegisteredSynchronizersAsync).toHaveBeenLastCalledWith(
            {
                allStatuses: true,
            },
            options,
        );
    });
});
