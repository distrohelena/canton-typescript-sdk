import { CreatePartyRequest } from "../../../core/types/requests/createPartyRequest.js";
import { CreatePartyResponse } from "../../../core/types/responses/createPartyResponse.js";

export function mapGrpcCreatePartyRequest(request: CreatePartyRequest): {
  identifierHint?: string;
  displayName?: string;
} {
  return {
    identifierHint: request.partyIdHint,
    displayName: request.displayName
  };
}

export function mapGrpcCreateParty(payload: { identifier?: string }): CreatePartyResponse {
  return new CreatePartyResponse({
    party: payload.identifier ?? ""
  });
}
