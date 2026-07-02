import { ICommandSigner } from "../../core/signing/iCommandSigner.js";
import { ITransport } from "../../core/transports/iTransport.js";
import { SubmitCommandRequest } from "../../core/types/requests/submitCommandRequest.js";
import { SubmitCommandResponse } from "../../core/types/responses/submitCommandResponse.js";
import { CommandSubmissionPipeline } from "./commandSubmissionPipeline.js";

export class CommandsClient {
  private readonly pipeline: CommandSubmissionPipeline;

  public constructor(transport: ITransport, signer?: ICommandSigner) {
    this.pipeline = new CommandSubmissionPipeline({
      transport,
      signer
    });
  }

  public submitAsync(request: SubmitCommandRequest): Promise<SubmitCommandResponse> {
    return this.pipeline.submitAsync(request);
  }
}
