import { ListAllRequest } from "../../../core/types/requests/list-all-request.js";
import { ListAllV2Request } from "../../../core/types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../../../core/types/requests/list-available-stores-request.js";
import { ListDecentralizedNamespaceDefinitionRequest } from "../../../core/types/requests/list-decentralized-namespace-definition-request.js";
import { ListLsuAnnouncementRequest } from "../../../core/types/requests/list-lsu-announcement-request.js";
import { ListLsuSequencerConnectionSuccessorRequest } from "../../../core/types/requests/list-lsu-sequencer-connection-successor-request.js";
import { ListMediatorSynchronizerStateRequest } from "../../../core/types/requests/list-mediator-synchronizer-state-request.js";
import { ListNamespaceDelegationRequest } from "../../../core/types/requests/list-namespace-delegation-request.js";
import { ListOwnerToKeyMappingRequest } from "../../../core/types/requests/list-owner-to-key-mapping-request.js";
import { ListParticipantSynchronizerPermissionRequest } from "../../../core/types/requests/list-participant-synchronizer-permission-request.js";
import { ListPartyHostingLimitsRequest } from "../../../core/types/requests/list-party-hosting-limits-request.js";
import { ListPartyToKeyMappingRequest } from "../../../core/types/requests/list-party-to-key-mapping-request.js";
import { ListPartyToParticipantRequest } from "../../../core/types/requests/list-party-to-participant-request.js";
import { ListSequencerSynchronizerStateRequest } from "../../../core/types/requests/list-sequencer-synchronizer-state-request.js";
import { ListSequencingParametersStateRequest } from "../../../core/types/requests/list-sequencing-parameters-state-request.js";
import { ListSynchronizerParametersStateRequest } from "../../../core/types/requests/list-synchronizer-parameters-state-request.js";
import { ListSynchronizerTrustCertificateRequest } from "../../../core/types/requests/list-synchronizer-trust-certificate-request.js";
import { TopologyListVettedPackagesRequest } from "../../../core/types/requests/topology-list-vetted-packages-request.js";
import { ListAllResponse } from "../../../core/types/responses/list-all-response.js";
import { ListAllV2Response } from "../../../core/types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../../../core/types/responses/list-available-stores-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../../../core/types/responses/list-decentralized-namespace-definition-response.js";
import { ListLsuAnnouncementResponse } from "../../../core/types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../../../core/types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../../../core/types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../../../core/types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../../../core/types/responses/list-owner-to-key-mapping-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../../../core/types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../../../core/types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../../../core/types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../../../core/types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../../../core/types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../../../core/types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../../../core/types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../../../core/types/responses/list-synchronizer-trust-certificate-response.js";
import { TopologyListVettedPackagesResponse } from "../../../core/types/responses/topology-list-vetted-packages-response.js";
import { ListAllRequest as GrpcListAllRequest, ListAllResponse as GrpcListAllResponse, ListAllV2Request as GrpcListAllV2Request, ListAllV2Response as GrpcListAllV2Response, ListAvailableStoresRequest as GrpcListAvailableStoresRequest, ListAvailableStoresResponse as GrpcListAvailableStoresResponse, ListDecentralizedNamespaceDefinitionRequest as GrpcListDecentralizedNamespaceDefinitionRequest, ListDecentralizedNamespaceDefinitionResponse as GrpcListDecentralizedNamespaceDefinitionResponse, ListLsuAnnouncementRequest as GrpcListLsuAnnouncementRequest, ListLsuAnnouncementResponse as GrpcListLsuAnnouncementResponse, ListLsuSequencerConnectionSuccessorRequest as GrpcListLsuSequencerConnectionSuccessorRequest, ListLsuSequencerConnectionSuccessorResponse as GrpcListLsuSequencerConnectionSuccessorResponse, ListMediatorSynchronizerStateRequest as GrpcListMediatorSynchronizerStateRequest, ListMediatorSynchronizerStateResponse as GrpcListMediatorSynchronizerStateResponse, ListNamespaceDelegationRequest as GrpcListNamespaceDelegationRequest, ListNamespaceDelegationResponse as GrpcListNamespaceDelegationResponse, ListOwnerToKeyMappingRequest as GrpcListOwnerToKeyMappingRequest, ListOwnerToKeyMappingResponse as GrpcListOwnerToKeyMappingResponse, ListParticipantSynchronizerPermissionRequest as GrpcListParticipantSynchronizerPermissionRequest, ListParticipantSynchronizerPermissionResponse as GrpcListParticipantSynchronizerPermissionResponse, ListPartyHostingLimitsRequest as GrpcListPartyHostingLimitsRequest, ListPartyHostingLimitsResponse as GrpcListPartyHostingLimitsResponse, ListPartyToKeyMappingRequest as GrpcListPartyToKeyMappingRequest, ListPartyToKeyMappingResponse as GrpcListPartyToKeyMappingResponse, ListPartyToParticipantRequest as GrpcListPartyToParticipantRequest, ListPartyToParticipantResponse as GrpcListPartyToParticipantResponse, ListSequencerSynchronizerStateRequest as GrpcListSequencerSynchronizerStateRequest, ListSequencerSynchronizerStateResponse as GrpcListSequencerSynchronizerStateResponse, ListSequencingParametersStateRequest as GrpcListSequencingParametersStateRequest, ListSequencingParametersStateResponse as GrpcListSequencingParametersStateResponse, ListSynchronizerParametersStateRequest as GrpcListSynchronizerParametersStateRequest, ListSynchronizerParametersStateResponse as GrpcListSynchronizerParametersStateResponse, ListSynchronizerTrustCertificateRequest as GrpcListSynchronizerTrustCertificateRequest, ListSynchronizerTrustCertificateResponse as GrpcListSynchronizerTrustCertificateResponse, ListVettedPackagesRequest as GrpcTopologyListVettedPackagesRequest, ListVettedPackagesResponse as GrpcTopologyListVettedPackagesResponse } from "../generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import { TopologyMappingResult } from "../../../core/types/topology/topology-mapping-result.js";
import { mapGrpcListAllV2Response as mapListAllV2ResponseValue, mapGrpcListAvailableStoresResponse as mapListAvailableStoresResponseValue, mapGrpcListPartyToParticipantResponse as mapListPartyToParticipantResponseValue, mapGrpcTopologyBaseQuery as mapBaseQueryValue, mapGrpcTopologyBaseResult as mapBaseResultValue, mapGrpcTopologyMappingCode, mapSdkDecentralizedNamespaceDefinition, mapSdkDynamicSequencingParameters, mapSdkDynamicSynchronizerParameters, mapSdkLsuAnnouncement, mapSdkLsuSequencerConnectionSuccessor, mapSdkMediatorSynchronizerState, mapSdkNamespaceDelegation, mapSdkOwnerToKeyMapping, mapSdkParticipantSynchronizerPermission, mapSdkPartyHostingLimits, mapSdkPartyToKeyMapping, mapSdkSequencerSynchronizerState, mapSdkSynchronizerTrustCertificate, mapSdkTopologyVettedPackages } from "./topology-common-mapper.js";

export const mapGrpcTopologyBaseQuery = mapBaseQueryValue;

export const mapGrpcTopologyBaseResult = mapBaseResultValue;

export function mapGrpcListNamespaceDelegationRequest(
    request: ListNamespaceDelegationRequest,
): GrpcListNamespaceDelegationRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterNamespace: request.filterNamespace ?? "",
        filterTargetKeyFingerprint: request.filterTargetKeyFingerprint ?? "",
    };
}

export function mapGrpcListNamespaceDelegationResponse(
    payload: Partial<GrpcListNamespaceDelegationResponse>,
): ListNamespaceDelegationResponse {
    return new ListNamespaceDelegationResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkNamespaceDelegation(item.item),
                }),
        ),
    });
}

export function mapGrpcListDecentralizedNamespaceDefinitionRequest(
    request: ListDecentralizedNamespaceDefinitionRequest,
): GrpcListDecentralizedNamespaceDefinitionRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterNamespace: request.filterNamespace ?? "",
    };
}

export function mapGrpcListDecentralizedNamespaceDefinitionResponse(
    payload: Partial<GrpcListDecentralizedNamespaceDefinitionResponse>,
): ListDecentralizedNamespaceDefinitionResponse {
    return new ListDecentralizedNamespaceDefinitionResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkDecentralizedNamespaceDefinition(item.item),
                }),
        ),
    });
}

export function mapGrpcListOwnerToKeyMappingRequest(
    request: ListOwnerToKeyMappingRequest,
): GrpcListOwnerToKeyMappingRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterKeyOwnerType: request.filterKeyOwnerType ?? "",
        filterKeyOwnerUid: request.filterKeyOwnerUid ?? "",
    };
}

export function mapGrpcListOwnerToKeyMappingResponse(
    payload: Partial<GrpcListOwnerToKeyMappingResponse>,
): ListOwnerToKeyMappingResponse {
    return new ListOwnerToKeyMappingResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkOwnerToKeyMapping(item.item),
                }),
        ),
    });
}

export function mapGrpcListPartyToKeyMappingRequest(
    request: ListPartyToKeyMappingRequest,
): GrpcListPartyToKeyMappingRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterParty: request.filterParty ?? "",
    };
}

export function mapGrpcListPartyToKeyMappingResponse(
    payload: Partial<GrpcListPartyToKeyMappingResponse>,
): ListPartyToKeyMappingResponse {
    return new ListPartyToKeyMappingResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkPartyToKeyMapping(item.item),
                }),
        ),
    });
}

export function mapGrpcListSynchronizerTrustCertificateRequest(
    request: ListSynchronizerTrustCertificateRequest,
): GrpcListSynchronizerTrustCertificateRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterUid: request.filterUid ?? "",
    };
}

export function mapGrpcListSynchronizerTrustCertificateResponse(
    payload: Partial<GrpcListSynchronizerTrustCertificateResponse>,
): ListSynchronizerTrustCertificateResponse {
    return new ListSynchronizerTrustCertificateResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkSynchronizerTrustCertificate(item.item),
                }),
        ),
    });
}

export function mapGrpcListParticipantSynchronizerPermissionRequest(
    request: ListParticipantSynchronizerPermissionRequest,
): GrpcListParticipantSynchronizerPermissionRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterUid: request.filterUid ?? "",
    };
}

export function mapGrpcListParticipantSynchronizerPermissionResponse(
    payload: Partial<GrpcListParticipantSynchronizerPermissionResponse>,
): ListParticipantSynchronizerPermissionResponse {
    return new ListParticipantSynchronizerPermissionResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkParticipantSynchronizerPermission(item.item),
                }),
        ),
    });
}

export function mapGrpcListPartyHostingLimitsRequest(
    request: ListPartyHostingLimitsRequest,
): GrpcListPartyHostingLimitsRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterUid: request.filterUid ?? "",
    };
}

export function mapGrpcListPartyHostingLimitsResponse(
    payload: Partial<GrpcListPartyHostingLimitsResponse>,
): ListPartyHostingLimitsResponse {
    return new ListPartyHostingLimitsResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkPartyHostingLimits(item.item),
                }),
        ),
    });
}

export function mapGrpcTopologyListVettedPackagesRequest(
    request: TopologyListVettedPackagesRequest,
): GrpcTopologyListVettedPackagesRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterParticipant: request.filterParticipant ?? "",
    };
}

export function mapGrpcTopologyListVettedPackagesResponse(
    payload: Partial<GrpcTopologyListVettedPackagesResponse>,
): TopologyListVettedPackagesResponse {
    return new TopologyListVettedPackagesResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkTopologyVettedPackages(item.item),
                }),
        ),
    });
}

export function mapGrpcListPartyToParticipantRequest(
    request: ListPartyToParticipantRequest,
): GrpcListPartyToParticipantRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterParty: request.filterParty ?? "",
        filterParticipant: request.filterParticipant ?? "",
    };
}

export function mapGrpcListPartyToParticipantResponse(
    payload: Partial<GrpcListPartyToParticipantResponse>,
): ListPartyToParticipantResponse {
    return new ListPartyToParticipantResponse(
        mapListPartyToParticipantResponseValue(payload),
    );
}

export function mapGrpcListSynchronizerParametersStateRequest(
    request: ListSynchronizerParametersStateRequest,
): GrpcListSynchronizerParametersStateRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterSynchronizerId: request.filterSynchronizerId ?? "",
    };
}

export function mapGrpcListSynchronizerParametersStateResponse(
    payload: Partial<GrpcListSynchronizerParametersStateResponse>,
): ListSynchronizerParametersStateResponse {
    return new ListSynchronizerParametersStateResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkDynamicSynchronizerParameters(item.item),
                }),
        ),
    });
}

export function mapGrpcListSequencingParametersStateRequest(
    request: ListSequencingParametersStateRequest,
): GrpcListSequencingParametersStateRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterSynchronizerId: request.filterSynchronizerId ?? "",
    };
}

export function mapGrpcListSequencingParametersStateResponse(
    payload: Partial<GrpcListSequencingParametersStateResponse>,
): ListSequencingParametersStateResponse {
    return new ListSequencingParametersStateResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkDynamicSequencingParameters(item.item),
                }),
        ),
    });
}

export function mapGrpcListMediatorSynchronizerStateRequest(
    request: ListMediatorSynchronizerStateRequest,
): GrpcListMediatorSynchronizerStateRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterSynchronizerId: request.filterSynchronizerId ?? "",
    };
}

export function mapGrpcListMediatorSynchronizerStateResponse(
    payload: Partial<GrpcListMediatorSynchronizerStateResponse>,
): ListMediatorSynchronizerStateResponse {
    return new ListMediatorSynchronizerStateResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkMediatorSynchronizerState(item.item),
                }),
        ),
    });
}

export function mapGrpcListSequencerSynchronizerStateRequest(
    request: ListSequencerSynchronizerStateRequest,
): GrpcListSequencerSynchronizerStateRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterSynchronizerId: request.filterSynchronizerId ?? "",
    };
}

export function mapGrpcListSequencerSynchronizerStateResponse(
    payload: Partial<GrpcListSequencerSynchronizerStateResponse>,
): ListSequencerSynchronizerStateResponse {
    return new ListSequencerSynchronizerStateResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkSequencerSynchronizerState(item.item),
                }),
        ),
    });
}

export function mapGrpcListLsuAnnouncementRequest(
    request: ListLsuAnnouncementRequest,
): GrpcListLsuAnnouncementRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterSynchronizerId: request.filterSynchronizerId ?? "",
    };
}

export function mapGrpcListLsuAnnouncementResponse(
    payload: Partial<GrpcListLsuAnnouncementResponse>,
): ListLsuAnnouncementResponse {
    return new ListLsuAnnouncementResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkLsuAnnouncement(item.item),
                }),
        ),
    });
}

export function mapGrpcListLsuSequencerConnectionSuccessorRequest(
    request: ListLsuSequencerConnectionSuccessorRequest,
): GrpcListLsuSequencerConnectionSuccessorRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        filterSequencerId: request.filterSequencerId ?? "",
        filterSuccessorPhysicalSynchronizerId:
            request.filterSuccessorPhysicalSynchronizerId ?? "",
    };
}

export function mapGrpcListLsuSequencerConnectionSuccessorResponse(
    payload: Partial<GrpcListLsuSequencerConnectionSuccessorResponse>,
): ListLsuSequencerConnectionSuccessorResponse {
    return new ListLsuSequencerConnectionSuccessorResponse({
        results: (payload.results ?? []).map(
            (item) =>
                new TopologyMappingResult({
                    context: mapBaseResultValue(item.context),
                    item: mapSdkLsuSequencerConnectionSuccessor(item.item),
                }),
        ),
    });
}

export function mapGrpcListAvailableStoresRequest(
    _request: ListAvailableStoresRequest,
): GrpcListAvailableStoresRequest {
    return {};
}

export function mapGrpcListAvailableStoresResponse(
    payload: Partial<GrpcListAvailableStoresResponse>,
): ListAvailableStoresResponse {
    return new ListAvailableStoresResponse(
        mapListAvailableStoresResponseValue(payload),
    );
}

export function mapGrpcListAllRequest(
    request: ListAllRequest,
): GrpcListAllRequest {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        excludeMappings: [...request.excludeMappings],
        filterNamespace: request.filterNamespace ?? "",
    };
}

export function mapGrpcListAllResponse(
    payload: Partial<GrpcListAllResponse>,
): ListAllResponse {
    return new ListAllResponse(
        mapListAllV2ResponseValue({
            result: payload.result,
        }),
    );
}

export function mapGrpcListAllV2Request(
    request: ListAllV2Request,
): GrpcListAllV2Request {
    return {
        baseQuery: mapBaseQueryValue(request.baseQuery),
        includeMappings: request.includeMappings.map(mapGrpcTopologyMappingCode),
        filterNamespace: request.filterNamespace ?? "",
    };
}

export function mapGrpcListAllV2Response(
    payload: Partial<GrpcListAllV2Response>,
): ListAllV2Response {
    return new ListAllV2Response(
        mapListAllV2ResponseValue(payload),
    );
}
