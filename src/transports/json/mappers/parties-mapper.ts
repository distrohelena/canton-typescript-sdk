import { CreatePartyResponse } from "../../../core/types/responses/create-party-response.js";

export function mapJsonCreateParty(payload: {
    result?: { identifier?: string };
    identifier?: string;
}): CreatePartyResponse {
    return new CreatePartyResponse({
        party: payload.result?.identifier ?? payload.identifier ?? "",
    });
}
