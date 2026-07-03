import { CreatePartyRequest } from "../../../core/types/requests/create-party-request.js";
import { ListPartiesRequest } from "../../../core/types/requests/list-parties-request.js";
import { PartyDetails as SdkPartyDetails } from "../../../core/types/party-details.js";
import { CreatePartyResponse } from "../../../core/types/responses/create-party-response.js";
import { ListPartiesResponse } from "../../../core/types/responses/list-parties-response.js";
import {
    AllocatePartyRequest,
    AllocatePartyResponse,
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
} from "../generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";

export function mapGrpcCreatePartyRequest(
    request: CreatePartyRequest,
): AllocatePartyRequest {
    return {
        partyIdHint: request.partyIdHint ?? "",
        identityProviderId: "",
        synchronizerId: "",
        userId: "",
    };
}

export function mapGrpcCreateParty(payload: {
    identifier?: string;
    partyDetails?: { party: string };
} | AllocatePartyResponse): CreatePartyResponse {
    return new CreatePartyResponse({
        party:
            payload.partyDetails?.party
            ?? ("identifier" in payload ? payload.identifier : undefined)
            ?? "",
    });
}

export function mapGrpcListPartiesRequest(
    request: ListPartiesRequest,
): ListKnownPartiesRequest {
    return {
        identityProviderId: request.identityProviderId ?? "",
        pageToken: request.pageToken ?? "",
        pageSize: request.pageSize ?? 0,
        filterParty: request.filterParty ?? "",
    };
}

export function mapGrpcListParties(
    payload: ListKnownPartiesResponse,
): ListPartiesResponse {
    return new ListPartiesResponse({
        partyDetails: payload.partyDetails.map(
            item =>
                new SdkPartyDetails({
                    party: item.party,
                    isLocal: item.isLocal,
                    localMetadata: item.localMetadata?.annotations,
                    identityProviderId: item.identityProviderId || undefined,
                }),
        ),
        nextPageToken: payload.nextPageToken || undefined,
    });
}
