import { describe, expect, it, vi } from "vitest";
import {
    CommandInspectionServiceClient,
    CommandState,
    GetCommandStatusRequest,
    GetCommandStatusResponse,
    RequestOptions,
} from "../../../src";

describe("CommandInspectionServiceClient", () => {
    it("forwards command status requests through the selected transport", async () => {
        const getCommandStatusAsync = vi.fn(
            async () =>
                new GetCommandStatusResponse({
                    commandStatuses: [],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getCommandStatusAsync,
        };

        const client = new CommandInspectionServiceClient(transport as never);

        const request = new GetCommandStatusRequest({
            commandIdPrefix: "cmd-",
            state: CommandState.pending,
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
        ).resolves.toBeInstanceOf(GetCommandStatusResponse);

        expect(getCommandStatusAsync).toHaveBeenCalledWith(
            request,
            options,
        );
    });
});
