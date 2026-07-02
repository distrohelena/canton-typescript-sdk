import { NotSupportedError } from "../../core/errors/notSupportedError.js";
import { ICommandSigner } from "../../core/signing/iCommandSigner.js";
import { SignCommandRequest } from "../../core/signing/signCommandRequest.js";
import { ITransport } from "../../core/transports/iTransport.js";
import { SubmitCommandRequest } from "../../core/types/requests/submitCommandRequest.js";
import { SubmitCommandResponse } from "../../core/types/responses/submitCommandResponse.js";
import { buildCanonicalCommandPayload } from "./commandPayloadBuilder.js";

export class CommandSubmissionPipeline {
  public constructor(
    private readonly dependencies: {
      transport: ITransport;
      signer?: ICommandSigner;
    }
  ) {}

  public async submitAsync(
    request: SubmitCommandRequest
  ): Promise<SubmitCommandResponse> {
    let signed;

    if (this.dependencies.signer) {
      if (!this.dependencies.transport.features.supportsCommandSigning) {
        throw new NotSupportedError(
          "command signing is not supported by the selected transport"
        );
      }

      signed = await this.dependencies.signer.signAsync(
        new SignCommandRequest({
          payload: buildCanonicalCommandPayload(request)
        })
      );
    }

    return this.dependencies.transport.submitCommandAsync(request, signed);
  }
}
