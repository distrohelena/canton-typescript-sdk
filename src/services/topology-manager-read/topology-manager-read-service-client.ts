import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ListAllRequest } from "../../core/types/requests/list-all-request.js";
import { ListAllV2Request } from "../../core/types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../../core/types/requests/list-available-stores-request.js";
import { ListDecentralizedNamespaceDefinitionRequest } from "../../core/types/requests/list-decentralized-namespace-definition-request.js";
import { ListLsuAnnouncementRequest } from "../../core/types/requests/list-lsu-announcement-request.js";
import { ListLsuSequencerConnectionSuccessorRequest } from "../../core/types/requests/list-lsu-sequencer-connection-successor-request.js";
import { ListMediatorSynchronizerStateRequest } from "../../core/types/requests/list-mediator-synchronizer-state-request.js";
import { ListNamespaceDelegationRequest } from "../../core/types/requests/list-namespace-delegation-request.js";
import { ListOwnerToKeyMappingRequest } from "../../core/types/requests/list-owner-to-key-mapping-request.js";
import { ListParticipantSynchronizerPermissionRequest } from "../../core/types/requests/list-participant-synchronizer-permission-request.js";
import { ListPartyHostingLimitsRequest } from "../../core/types/requests/list-party-hosting-limits-request.js";
import { ListPartyToKeyMappingRequest } from "../../core/types/requests/list-party-to-key-mapping-request.js";
import { ListPartyToParticipantRequest } from "../../core/types/requests/list-party-to-participant-request.js";
import { ListSequencerSynchronizerStateRequest } from "../../core/types/requests/list-sequencer-synchronizer-state-request.js";
import { ListSequencingParametersStateRequest } from "../../core/types/requests/list-sequencing-parameters-state-request.js";
import { ListSynchronizerParametersStateRequest } from "../../core/types/requests/list-synchronizer-parameters-state-request.js";
import { ListSynchronizerTrustCertificateRequest } from "../../core/types/requests/list-synchronizer-trust-certificate-request.js";
import { TopologyListVettedPackagesRequest } from "../../core/types/requests/topology-list-vetted-packages-request.js";
import { ListAllResponse } from "../../core/types/responses/list-all-response.js";
import { ListAllV2Response } from "../../core/types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../../core/types/responses/list-available-stores-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../../core/types/responses/list-decentralized-namespace-definition-response.js";
import { ListLsuAnnouncementResponse } from "../../core/types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../../core/types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../../core/types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../../core/types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../../core/types/responses/list-owner-to-key-mapping-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../../core/types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../../core/types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../../core/types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../../core/types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../../core/types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../../core/types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../../core/types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../../core/types/responses/list-synchronizer-trust-certificate-response.js";
import { TopologyListVettedPackagesResponse } from "../../core/types/responses/topology-list-vetted-packages-response.js";

export class TopologyManagerReadServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads namespace delegations. Supported on gRPC; JSON rejects it. */
    public listNamespaceDelegationAsync(
        request: ListNamespaceDelegationRequest,
        options?: RequestOptions,
    ): Promise<ListNamespaceDelegationResponse> {
        return this.transport.listNamespaceDelegationAsync(request, options);
    }

    /** Reads decentralized namespace definitions. Supported on gRPC; JSON rejects it. */
    public listDecentralizedNamespaceDefinitionAsync(
        request: ListDecentralizedNamespaceDefinitionRequest,
        options?: RequestOptions,
    ): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        return this.transport.listDecentralizedNamespaceDefinitionAsync(
            request,
            options,
        );
    }

    /** Reads owner-to-key mappings. Supported on gRPC; JSON rejects it. */
    public listOwnerToKeyMappingAsync(
        request: ListOwnerToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListOwnerToKeyMappingResponse> {
        return this.transport.listOwnerToKeyMappingAsync(request, options);
    }

    /** Reads party-to-key mappings. Supported on gRPC; JSON rejects it. */
    public listPartyToKeyMappingAsync(
        request: ListPartyToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToKeyMappingResponse> {
        return this.transport.listPartyToKeyMappingAsync(request, options);
    }

    /** Reads synchronizer trust certificates. Supported on gRPC; JSON rejects it. */
    public listSynchronizerTrustCertificateAsync(
        request: ListSynchronizerTrustCertificateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerTrustCertificateResponse> {
        return this.transport.listSynchronizerTrustCertificateAsync(
            request,
            options,
        );
    }

    /** Reads participant synchronizer permissions. Supported on gRPC; JSON rejects it. */
    public listParticipantSynchronizerPermissionAsync(
        request: ListParticipantSynchronizerPermissionRequest,
        options?: RequestOptions,
    ): Promise<ListParticipantSynchronizerPermissionResponse> {
        return this.transport.listParticipantSynchronizerPermissionAsync(
            request,
            options,
        );
    }

    /** Reads party hosting limits. Supported on gRPC; JSON rejects it. */
    public listPartyHostingLimitsAsync(
        request: ListPartyHostingLimitsRequest,
        options?: RequestOptions,
    ): Promise<ListPartyHostingLimitsResponse> {
        return this.transport.listPartyHostingLimitsAsync(request, options);
    }

    /** Reads topology vetted packages. Supported on gRPC; JSON rejects it. */
    public listVettedPackagesAsync(
        request: TopologyListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListVettedPackagesResponse> {
        return this.transport.topologyListVettedPackagesAsync(request, options);
    }

    /** Reads party-to-participant mappings. Supported on gRPC; JSON rejects it. */
    public listPartyToParticipantAsync(
        request: ListPartyToParticipantRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToParticipantResponse> {
        return this.transport.listPartyToParticipantAsync(request, options);
    }

    /** Reads synchronizer parameter state. Supported on gRPC; JSON rejects it. */
    public listSynchronizerParametersStateAsync(
        request: ListSynchronizerParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerParametersStateResponse> {
        return this.transport.listSynchronizerParametersStateAsync(
            request,
            options,
        );
    }

    /** Reads sequencing parameter state. Supported on gRPC; JSON rejects it. */
    public listSequencingParametersStateAsync(
        request: ListSequencingParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencingParametersStateResponse> {
        return this.transport.listSequencingParametersStateAsync(
            request,
            options,
        );
    }

    /** Reads mediator synchronizer state. Supported on gRPC; JSON rejects it. */
    public listMediatorSynchronizerStateAsync(
        request: ListMediatorSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListMediatorSynchronizerStateResponse> {
        return this.transport.listMediatorSynchronizerStateAsync(
            request,
            options,
        );
    }

    /** Reads sequencer synchronizer state. Supported on gRPC; JSON rejects it. */
    public listSequencerSynchronizerStateAsync(
        request: ListSequencerSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencerSynchronizerStateResponse> {
        return this.transport.listSequencerSynchronizerStateAsync(
            request,
            options,
        );
    }

    /** Reads LSU announcements. Supported on gRPC; JSON rejects it. */
    public listLsuAnnouncementAsync(
        request: ListLsuAnnouncementRequest,
        options?: RequestOptions,
    ): Promise<ListLsuAnnouncementResponse> {
        return this.transport.listLsuAnnouncementAsync(request, options);
    }

    /** Reads LSU sequencer connection successors. Supported on gRPC; JSON rejects it. */
    public listLsuSequencerConnectionSuccessorAsync(
        request: ListLsuSequencerConnectionSuccessorRequest,
        options?: RequestOptions,
    ): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        return this.transport.listLsuSequencerConnectionSuccessorAsync(
            request,
            options,
        );
    }

    /** Lists available topology stores. Supported on gRPC; JSON rejects it. */
    public listAvailableStoresAsync(
        request: ListAvailableStoresRequest,
        options?: RequestOptions,
    ): Promise<ListAvailableStoresResponse> {
        return this.transport.listAvailableStoresAsync(request, options);
    }

    /** Reads raw topology transactions. Deprecated upstream. Supported on gRPC; JSON rejects it. */
    public listAllAsync(
        request: ListAllRequest,
        options?: RequestOptions,
    ): Promise<ListAllResponse> {
        return this.transport.listAllAsync(request, options);
    }

    /** Reads raw topology transactions using the preferred V2 API. Supported on gRPC; JSON rejects it. */
    public listAllV2Async(
        request: ListAllV2Request,
        options?: RequestOptions,
    ): Promise<ListAllV2Response> {
        return this.transport.listAllV2Async(request, options);
    }
}
