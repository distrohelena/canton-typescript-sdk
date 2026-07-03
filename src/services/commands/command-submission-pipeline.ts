import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { SignCommandRequest } from "../../core/signing/sign-command-request.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { buildCanonicalCommandPayload } from "./command-payload-builder.js";

export class CommandSubmissionPipeline {
    public constructor(
        private readonly dependencies: {
            transport: ITransport;
            signer?: ICommandSigner;
        },
    ) {}

    public async submitAsync(
        request: SubmitCommandRequest,
    ): Promise<SubmitCommandResponse> {
        let signed;

        if (this.dependencies.signer) {
            if (!this.dependencies.transport.features.supportsCommandSigning) {
                throw new NotSupportedError(
                    "command signing is not supported by the selected transport",
                );
            }

            signed = await this.dependencies.signer.signAsync(
                new SignCommandRequest({
                    payload: buildCanonicalCommandPayload(request),
                }),
            );
        }

        return this.dependencies.transport.submitCommandAsync(request, signed);
    }
}
