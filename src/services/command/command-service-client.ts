import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { CommandSubmissionPipeline } from "../commands/command-submission-pipeline.js";

export class CommandServiceClient {
    private readonly pipeline: CommandSubmissionPipeline;

    public constructor(transport: ITransport, signer?: ICommandSigner) {
        this.pipeline = new CommandSubmissionPipeline({
            transport,
            signer,
        });
    }

    /** Submits a command and waits for the result. Supported on JSON and gRPC. */
    public submitAndWaitAsync(
        request: SubmitCommandRequest,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        return this.pipeline.submitAsync(request, options);
    }
}
