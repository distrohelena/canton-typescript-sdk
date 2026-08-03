import { CommandSigners, ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { SubmitCommandsRequest } from "../../core/types/requests/submit-commands-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { SubmitCommandTransactionResponse } from "../../core/types/responses/submit-command-transaction-response.js";
import { CommandSubmissionPipeline } from "../commands/command-submission-pipeline.js";
import { PreparedCommandSubmission } from "../../core/types/prepared-command-submission.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";

export class CommandServiceClient {
    private readonly pipeline: CommandSubmissionPipeline;

    public constructor(transport: ITransport, signer?: ICommandSigner | CommandSigners) {
        this.pipeline = new CommandSubmissionPipeline({
            transport,
            signer,
        });
    }
    public submitAndWaitForTransactionAsync(request: SubmitCommandsRequest, options?: RequestOptions): Promise<SubmitCommandTransactionResponse> {
        return this.pipeline.submitForTransactionAsync(request, options);
    }

    /** Submits a command and waits for the result. Supported on JSON and gRPC. */
    public submitAndWaitAsync(
        request: SubmitCommandsRequest,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        return this.pipeline.submitAsync(request, options);
    }

    /**
     * Submits through the connected participant without external command signing.
     * A configured command signer is deliberately ignored for this call.
     */
    public submitParticipantLocalAndWaitAsync(
        request: SubmitCommandsRequest,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        return this.pipeline.submitParticipantLocalAsync(request, options);
    }

    public prepareAsync(request: SubmitCommandsRequest, options?: RequestOptions): Promise<PreparedCommandSubmission> {
        return this.pipeline.prepareAsync(request, options);
    }
    public executeAndWaitAsync(prepared: PreparedCommandSubmission, signatures: Readonly<Record<string, SignCommandResult>>, options?: RequestOptions): Promise<SubmitCommandResponse> {
        return this.pipeline.executeAsync(prepared, signatures, options);
    }
}
