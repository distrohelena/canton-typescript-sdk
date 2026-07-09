import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";

export class CommandSubmissionPipeline {
    public constructor(
        private readonly dependencies: {
            transport: ITransport;
            signer?: ICommandSigner;
        },
    ) {}

    public async submitAsync(
        request: SubmitCommandRequest,
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
}
