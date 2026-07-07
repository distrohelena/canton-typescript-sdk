import { CreatePartyResponse } from "../../../core/types/responses/create-party-response.js";
import { AllocatePartyRequest } from "../../../core/types/requests/allocate-party-request.js";
import { ListPartiesResponse } from "../../../core/types/responses/list-parties-response.js";
import { PartyDetails } from "../../../core/types/party-details.js";

export function mapJsonCreateParty(payload: {
    result?: { partyDetails?: { party?: string } };
    partyDetails?: { party?: string };
}): CreatePartyResponse {
    return new CreatePartyResponse({
        party:
            payload.result?.partyDetails?.party
            ?? payload.partyDetails?.party
            ?? "",
    });
}

export function mapJsonAllocatePartyRequest(
    request: AllocatePartyRequest,
): {
    partyIdHint?: string;
    localMetadata?: { attributes: Record<string, string> };
} {
    return {
        partyIdHint: request.partyIdHint,
        localMetadata:
            request.displayName === undefined
                ? undefined
                : {
                    attributes: {
                        displayName: request.displayName,
                    },
                },
    };
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
