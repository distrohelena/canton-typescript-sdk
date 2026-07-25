import { describe, expect, it, vi } from "vitest";
import {
    ParticipantRepairServiceClient,
    RequestOptions,
} from "../../../src";
import {
    ListPendingOperationsRequest,
    ListPendingOperationsResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";

describe("ParticipantRepairServiceClient", () => {
    it("forwards participant repair read requests through the selected transport", async () => {
        const listPendingOperationsAsync = vi.fn(
            async () => ListPendingOperationsResponse.create(),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            listPendingOperationsAsync,
        };

        const client = new ParticipantRepairServiceClient(transport as never);

        const request = ListPendingOperationsRequest.create({
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
        ).resolves.toBeDefined();

        expect(listPendingOperationsAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
