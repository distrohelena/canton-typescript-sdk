import { describe, expect, it, vi } from "vitest";
import {
    CommandCompletionServiceClient,
    RequestOptions,
} from "../../../src";
import {
    CompletionStreamResponse,
    GetCompletionsRequest,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.js";

describe("CommandCompletionServiceClient", () => {
    it("forwards generated completion requests as a lazy stream", async () => {
        const response = CompletionStreamResponse.create({
            completionResponse: { oneofKind: undefined },
        });
        const getCompletionsAsync = vi.fn(async function* () {
            yield response;
        });

        const transport = {
            features: { supportsCommandSigning: false },
            getCompletionsAsync,
        };

        const client = new CommandCompletionServiceClient(transport as never);

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        const stream = client.getCompletionsAsync(
            GetCompletionsRequest.create({
                parties: ["Alice"],
                beginExclusive: "0",
            }),
            options,
        );

        expect(getCompletionsAsync).not.toHaveBeenCalled();
        await expect(Array.fromAsync(stream)).resolves.toEqual([response]);

        expect(getCompletionsAsync).toHaveBeenCalledWith(
            expect.objectContaining({ beginExclusive: "0", parties: ["Alice"] }),
            options,
        );
    });
});
