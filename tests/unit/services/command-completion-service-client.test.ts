import { describe, expect, it, vi } from "vitest";
import {
    CompletionObserver,
    CompletionStreamResponse,
    CommandCompletionServiceClient,
    GetCompletionsRequest,
    RequestOptions,
} from "../../../src";

describe("CommandCompletionServiceClient", () => {
    it("forwards completion read requests through the selected transport", async () => {
        const getCompletionsAsync = vi.fn(async () => undefined);

        const transport = {
            features: { supportsCommandSigning: false },
            getCompletionsAsync,
        };

        const client = new CommandCompletionServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        const observer: CompletionObserver<CompletionStreamResponse> = {
            nextAsync: async () => undefined,
        };

        await expect(
            client.getCompletionsAsync(
                new GetCompletionsRequest({
                    parties: ["Alice"],
                    beginExclusive: "0",
                }),
                observer,
                options,
            ),
        ).resolves.toBeUndefined();

        expect(getCompletionsAsync).toHaveBeenCalledWith(
            expect.any(GetCompletionsRequest),
            observer,
            options,
        );
    });
});
