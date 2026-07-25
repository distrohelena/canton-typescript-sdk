import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    CompletionStreamResponse,
    GetCompletionsRequest,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.js";

export class CommandCompletionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads command completions as a stream. Supported on gRPC; JSON rejects it. */
    public getCompletionsAsync(
        request: GetCompletionsRequest,
        options?: RequestOptions,
    ): AsyncIterable<CompletionStreamResponse> {
        return this.getCompletionsLazy(request, options);
    }

    private async *getCompletionsLazy(
        request: GetCompletionsRequest,
        options?: RequestOptions,
    ): AsyncIterable<CompletionStreamResponse> {
        yield* this.transport.getCompletionsAsync(request, options);
    }
}
