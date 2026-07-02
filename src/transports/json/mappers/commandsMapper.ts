import { SubmitCommandResponse } from "../../../core/types/responses/submitCommandResponse.js";

export function mapJsonSubmitCommand(payload: {
  result?: { commandId?: string; transactionId?: string };
  commandId?: string;
  transactionId?: string;
}): SubmitCommandResponse {
  return new SubmitCommandResponse({
    commandId: payload.result?.commandId ?? payload.commandId,
    transactionId: payload.result?.transactionId ?? payload.transactionId
  });
}
