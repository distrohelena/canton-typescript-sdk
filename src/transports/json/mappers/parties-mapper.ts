import { CreatePartyResponse } from "../../../core/types/responses/create-party-response.js";
import { ListPartiesResponse } from "../../../core/types/responses/list-parties-response.js";
import { PartyDetails } from "../../../core/types/party-details.js";

export function mapJsonCreateParty(payload: {
    result?: { identifier?: string };
    identifier?: string;
}): CreatePartyResponse {
    return new CreatePartyResponse({
        party: payload.result?.identifier ?? payload.identifier ?? "",
    });
}

export function mapJsonListParties(payload: {
    partyDetails?: Array<{
        party?: string;
        isLocal?: boolean;
        localMetadata?: { attributes?: Record<string, string> };
        identityProviderId?: string;
    }>;
    nextPageToken?: string;
}): ListPartiesResponse {
    return new ListPartiesResponse({
        partyDetails: (payload.partyDetails ?? []).map(
            item =>
                new PartyDetails({
                    party: item.party ?? "",
                    isLocal: item.isLocal ?? false,
                    localMetadata: item.localMetadata?.attributes,
                    identityProviderId: item.identityProviderId,
                }),
        ),
        nextPageToken: payload.nextPageToken,
    });
}
