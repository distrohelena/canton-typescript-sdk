import { ListKeyOwnersRequest } from "../../../core/types/requests/list-key-owners-request.js";
import { TopologyListPartiesRequest } from "../../../core/types/requests/topology-list-parties-request.js";
import { ListKeyOwnersResponse } from "../../../core/types/responses/list-key-owners-response.js";
import { TopologyListPartiesResponse } from "../../../core/types/responses/topology-list-parties-response.js";
import { ListKeyOwnersRequest as GrpcListKeyOwnersRequest, ListKeyOwnersResponse as GrpcListKeyOwnersResponse, ListPartiesRequest as GrpcTopologyListPartiesRequest, ListPartiesResponse as GrpcTopologyListPartiesResponse } from "../generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import { mapGrpcTimestamp, mapGrpcListKeyOwnersResponse as mapListKeyOwnersResponseValue, mapGrpcTopologyListPartiesResponse as mapListPartiesResponseValue } from "./topology-common-mapper.js";

export function mapGrpcTopologyListPartiesRequest(
    request: TopologyListPartiesRequest,
): GrpcTopologyListPartiesRequest {
    return {
        asOf: mapGrpcTimestamp(request.asOf),
        limit: request.limit ?? 0,
        synchronizerIds: [...(request.synchronizerIds ?? [])],
        filterParty: request.filterParty ?? "",
        filterParticipant: request.filterParticipant ?? "",
    };
}

export function mapGrpcTopologyListPartiesResponse(
    payload: Partial<GrpcTopologyListPartiesResponse>,
): TopologyListPartiesResponse {
    return new TopologyListPartiesResponse(
        mapListPartiesResponseValue(payload),
    );
}

export function mapGrpcListKeyOwnersRequest(
    request: ListKeyOwnersRequest,
): GrpcListKeyOwnersRequest {
    return {
        asOf: mapGrpcTimestamp(request.asOf),
        limit: request.limit ?? 0,
        synchronizerIds: [...(request.synchronizerIds ?? [])],
        filterKeyOwnerType: request.filterKeyOwnerType ?? "",
        filterKeyOwnerUid: request.filterKeyOwnerUid ?? "",
    };
}

export function mapGrpcListKeyOwnersResponse(
    payload: Partial<GrpcListKeyOwnersResponse>,
): ListKeyOwnersResponse {
    return new ListKeyOwnersResponse(
        mapListKeyOwnersResponseValue(payload),
    );
}
