import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { CommandSigners, ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { SubmitCommandsRequest } from "../../core/types/requests/submit-commands-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { SubmitCommandTransactionResponse } from "../../core/types/responses/submit-command-transaction-response.js";
import { PreparedCommandSubmission } from "../../core/types/prepared-command-submission.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";

export class CommandSubmissionPipeline {
    public constructor(
        private readonly dependencies: {
            transport: ITransport;
            signer?: ICommandSigner | CommandSigners;
        },
    ) {}

    public async submitAsync(
        request: SubmitCommandsRequest,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        if (this.dependencies.signer) {
            if (!this.dependencies.transport.features.supportsCommandSigning) {
                throw new NotSupportedError(
                    "command signing is not supported by the selected transport",
                );
            }
        }

        return this.dependencies.transport.submitCommandAsync(
            request,
            this.dependencies.signer,
            options,
        );
    }
    public submitForTransactionAsync(request: SubmitCommandsRequest, options?: RequestOptions): Promise<SubmitCommandTransactionResponse> {
        if (!this.dependencies.transport.submitCommandForTransactionAsync) {
            throw new NotSupportedError("transaction-returning command submission is not supported by the selected transport");
        }

        return this.dependencies.transport.submitCommandForTransactionAsync(request, options);
    }
    public prepareAsync(request: SubmitCommandsRequest, options?: RequestOptions): Promise<PreparedCommandSubmission> {
        if (!this.dependencies.transport.prepareCommandAsync) {
            throw new NotSupportedError("interactive command preparation is not supported by the selected transport");
        }

        return this.dependencies.transport.prepareCommandAsync(request, options);
    }
    public executeAsync(prepared: PreparedCommandSubmission, signatures: Readonly<Record<string, SignCommandResult>>, options?: RequestOptions): Promise<SubmitCommandResponse> {
        if (!this.dependencies.transport.executePreparedCommandAndWaitAsync) {
            throw new NotSupportedError("interactive command execution is not supported by the selected transport");
        }

        return this.dependencies.transport.executePreparedCommandAndWaitAsync(prepared, signatures, options);
    }
}

