import { SignCommandResult } from "../../../core/signing/sign-command-result.js";
import { SubmitCommandRequest } from "../../../core/types/requests/submit-command-request.js";
import { SubmitCommandResponse } from "../../../core/types/responses/submit-command-response.js";

export function mapGrpcSubmitCommandRequest(
    request: SubmitCommandRequest,
    signed?: SignCommandResult,
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
                  keyId: signed.keyId,
              }
            : undefined,
    };
}

export function mapGrpcSubmitCommand(payload: {
    commandId?: string;
    transactionId?: string;
}): SubmitCommandResponse {
    return new SubmitCommandResponse({
        commandId: payload.commandId,
        transactionId: payload.transactionId,
    });
}
