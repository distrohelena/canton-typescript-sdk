import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetCompletionsRequest } from "../../core/types/requests/get-completions-request.js";
import { CompletionObserver } from "./completion-observer.interface.js";

export class CommandCompletionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads command completions as a stream. Supported on gRPC; JSON rejects it. */
    public getCompletionsAsync(
        request: GetCompletionsRequest,
        observer: CompletionObserver,
        options?: RequestOptions,
    ): Promise<void> {
        return this.transport.getCompletionsAsync(request, observer, options);
    }
}
