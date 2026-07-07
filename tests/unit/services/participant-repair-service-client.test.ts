import { describe, expect, it, vi } from "vitest";
import {
    ListPendingOperationsRequest,
    ListPendingOperationsResponse,
    ParticipantRepairServiceClient,
    RequestOptions,
} from "../../../src";

describe("ParticipantRepairServiceClient", () => {
    it("forwards participant repair read requests through the selected transport", async () => {
        const listPendingOperationsAsync = vi.fn(
            async () =>
                new ListPendingOperationsResponse({
                    pendingOperations: [],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            listPendingOperationsAsync,
        };

        const client = new ParticipantRepairServiceClient(transport as never);

        const request = new ListPendingOperationsRequest({
            operationName: "repair-op",
            filterOperationKey: "key-1",
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.listPendingOperationsAsync(
                request,
                options,
            ),
        ).resolves.toBeInstanceOf(ListPendingOperationsResponse);

        expect(listPendingOperationsAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
