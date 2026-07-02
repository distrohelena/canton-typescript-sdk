import { SignCommandResult } from "../../../core/signing/signCommandResult.js";
import { SubmitCommandRequest } from "../../../core/types/requests/submitCommandRequest.js";
import { SubmitCommandResponse } from "../../../core/types/responses/submitCommandResponse.js";

export function mapGrpcSubmitCommandRequest(
  request: SubmitCommandRequest,
  signed?: SignCommandResult
): {
  applicationId: string;
  actAs: readonly string[];
  signed?: {
    algorithm: string;
    signature: Uint8Array;
    keyId?: string;
  };
} {
  return {
    applicationId: request.applicationId,
    actAs: request.actAs,
    signed: signed
      ? {
          algorithm: signed.algorithm,
          signature: signed.signature,
          keyId: signed.keyId
        }
      : undefined
  };
}

export function mapGrpcSubmitCommand(payload: {
  commandId?: string;
  transactionId?: string;
}): SubmitCommandResponse {
  return new SubmitCommandResponse({
    commandId: payload.commandId,
    transactionId: payload.transactionId
  });
}
