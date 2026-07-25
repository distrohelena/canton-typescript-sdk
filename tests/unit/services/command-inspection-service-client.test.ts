import { describe, expect, it, vi } from "vitest";
import {
    CommandInspectionServiceClient,
    RequestOptions,
} from "../../../src";
import {
    CommandState,
    GetCommandStatusRequest,
    GetCommandStatusResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";

describe("CommandInspectionServiceClient", () => {
    it("forwards command status requests through the selected transport", async () => {
        const response = GetCommandStatusResponse.create();
        const getCommandStatusAsync = vi.fn(async () => response);

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getCommandStatusAsync,
        };

        const client = new CommandInspectionServiceClient(transport as never);

        const request = GetCommandStatusRequest.create({
            commandIdPrefix: "cmd-",
            state: CommandState.PENDING,
            limit: 25,
        });

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getCommandStatusAsync(
                request,
                options,
            ),
        ).resolves.toBe(response);

        expect(getCommandStatusAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
