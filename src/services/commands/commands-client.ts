import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { CommandSubmissionPipeline } from "./command-submission-pipeline.js";

export class CommandsClient {
    private readonly pipeline: CommandSubmissionPipeline;

    public constructor(transport: ITransport, signer?: ICommandSigner) {
        this.pipeline = new CommandSubmissionPipeline({
            transport,
            signer,
        });
    }

    /**
     * Submits a command.
     * Supported on JSON and gRPC. External signing is gRPC-only.
     */
    public submitAsync(
        request: SubmitCommandRequest,
    ): Promise<SubmitCommandResponse> {
        return this.pipeline.submitAsync(request);
    }
}
