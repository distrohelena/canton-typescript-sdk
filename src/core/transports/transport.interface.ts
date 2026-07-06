import { TransportFeatures } from "./transport-features.interface.js";
import { AllocatePartyRequest } from "../types/requests/allocate-party-request.js";
import { GrantUserRightsRequest } from "../types/requests/grant-user-rights-request.js";
import { GetActiveContractsPageRequest } from "../types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../types/requests/get-active-contracts-request.js";
import { ListKnownPartiesRequest } from "../types/requests/list-known-parties-request.js";
import { GetLedgerApiVersionRequest } from "../types/requests/get-ledger-api-version-request.js";
import { GetPackageContentsRequest } from "../types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../types/requests/get-package-status-request.js";
import { GetParticipantStatusRequest } from "../types/requests/get-participant-status-request.js";
import { GetUpdatesRequest } from "../types/requests/get-updates-request.js";
import { HealthCheckRequest } from "../types/requests/health-check-request.js";
import { ListAllRequest } from "../types/requests/list-all-request.js";
import { ListAllV2Request } from "../types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../types/requests/list-available-stores-request.js";
import { ListDecentralizedNamespaceDefinitionRequest } from "../types/requests/list-decentralized-namespace-definition-request.js";
import { ListKeyOwnersRequest } from "../types/requests/list-key-owners-request.js";
import { ListLsuAnnouncementRequest } from "../types/requests/list-lsu-announcement-request.js";
import { ListLsuSequencerConnectionSuccessorRequest } from "../types/requests/list-lsu-sequencer-connection-successor-request.js";
import { ListMediatorSynchronizerStateRequest } from "../types/requests/list-mediator-synchronizer-state-request.js";
import { ListNamespaceDelegationRequest } from "../types/requests/list-namespace-delegation-request.js";
import { ListOwnerToKeyMappingRequest } from "../types/requests/list-owner-to-key-mapping-request.js";
import { ListParticipantSynchronizerPermissionRequest } from "../types/requests/list-participant-synchronizer-permission-request.js";
import { ListPartyHostingLimitsRequest } from "../types/requests/list-party-hosting-limits-request.js";
import { ListPartyToKeyMappingRequest } from "../types/requests/list-party-to-key-mapping-request.js";
import { ListPartyToParticipantRequest } from "../types/requests/list-party-to-participant-request.js";
import { ListPackagesRequest } from "../types/requests/list-packages-request.js";
import { ListSequencerSynchronizerStateRequest } from "../types/requests/list-sequencer-synchronizer-state-request.js";
import { ListSequencingParametersStateRequest } from "../types/requests/list-sequencing-parameters-state-request.js";
import { ListSynchronizerParametersStateRequest } from "../types/requests/list-synchronizer-parameters-state-request.js";
import { ListSynchronizerTrustCertificateRequest } from "../types/requests/list-synchronizer-trust-certificate-request.js";
import { ListVettedPackagesRequest } from "../types/requests/list-vetted-packages-request.js";
import { TopologyListPartiesRequest } from "../types/requests/topology-list-parties-request.js";
import { TopologyListVettedPackagesRequest } from "../types/requests/topology-list-vetted-packages-request.js";
import { UploadDarFileRequest } from "../types/requests/upload-dar-file-request.js";
import { ParticipantListPackagesRequest } from "../types/requests/participant-list-packages-request.js";
import { GetPackageContentsResponse } from "../types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../types/responses/get-package-status-response.js";
import { GetParticipantStatusResponse } from "../types/responses/get-participant-status-response.js";
import { AllocatePartyResponse } from "../types/responses/allocate-party-response.js";
import { GetActiveContractsPageResponse } from "../types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../types/responses/health-check-response.js";
import { ListAllResponse } from "../types/responses/list-all-response.js";
import { ListAllV2Response } from "../types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../types/responses/list-available-stores-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../types/responses/list-decentralized-namespace-definition-response.js";
import { ListKeyOwnersResponse } from "../types/responses/list-key-owners-response.js";
import { ListLsuAnnouncementResponse } from "../types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../types/responses/list-owner-to-key-mapping-response.js";
import { ListPackagesResponse } from "../types/responses/list-packages-response.js";
import { ListKnownPartiesResponse } from "../types/responses/list-known-parties-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../types/responses/list-synchronizer-trust-certificate-response.js";
import { TopologyListPartiesResponse } from "../types/responses/topology-list-parties-response.js";
import { ListVettedPackagesResponse } from "../types/responses/list-vetted-packages-response.js";
import { TopologyListVettedPackagesResponse } from "../types/responses/topology-list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../types/responses/upload-dar-file-response.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { SignCommandResult } from "../signing/sign-command-result.js";
import { RequestOptions } from "../types/request-options.js";
import { SubmitCommandRequest } from "../types/requests/submit-command-request.js";

export interface ITransport {
    readonly features: TransportFeatures;

    /** Disposes transport-owned resources. */
    disposeAsync(): Promise<void>;

    /** Reads the ledger API version. Supported on JSON and gRPC. */
    getLedgerApiVersionAsync(
        request?: GetLedgerApiVersionRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerApiVersionResponse>;

    /** Checks gRPC health. Supported on gRPC; JSON rejects it. */
    checkHealthAsync(
        request: HealthCheckRequest,
        options?: RequestOptions,
    ): Promise<HealthCheckResponse>;

    /** Allocates a party. Supported on JSON and gRPC. */
    allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<AllocatePartyResponse>;

    /** Lists known parties. Supported on JSON and gRPC. */
    listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse>;

    /** Grants user rights. Supported on JSON and gRPC. */
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse>;

    /** Uploads a DAR package. Supported on JSON and gRPC. */
    uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse>;

    /** Lists ledger-visible packages. Shared SDK surface; JSON may reject it. */
    listPackagesAsync(
        request: ListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListPackagesResponse>;

    /** Reads a ledger package archive. Shared SDK surface; JSON may reject it. */
    getPackageAsync(
        request: GetPackageRequest,
        options?: RequestOptions,
    ): Promise<GetPackageResponse>;

    /** Reads ledger package registration status. Shared SDK surface; JSON may reject it. */
    getPackageStatusAsync(
        request: GetPackageStatusRequest,
        options?: RequestOptions,
    ): Promise<GetPackageStatusResponse>;

    /** Lists vetted ledger packages. Shared SDK surface; JSON may reject it. */
    listVettedPackagesAsync(
        request: ListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse>;

    /** Lists participant-local packages. Shared SDK surface; JSON may reject it. */
    listParticipantPackagesAsync(
        request: ParticipantListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse>;

    /** Reads participant-local package contents. Shared SDK surface; JSON may reject it. */
    getParticipantPackageContentsAsync(
        request: GetPackageContentsRequest,
        options?: RequestOptions,
    ): Promise<GetPackageContentsResponse>;

    /** Reads participant package references. Shared SDK surface; JSON may reject it. */
    getParticipantPackageReferencesAsync(
        request: GetPackageReferencesRequest,
        options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse>;

    /** Reads participant admin status. Supported on gRPC; JSON rejects it. */
    getParticipantStatusAsync(
        request: GetParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse>;

    /** Reads namespace delegations. Supported on gRPC; JSON rejects it. */
    listNamespaceDelegationAsync(
        request: ListNamespaceDelegationRequest,
        options?: RequestOptions,
    ): Promise<ListNamespaceDelegationResponse>;

    /** Reads decentralized namespace definitions. Supported on gRPC; JSON rejects it. */
    listDecentralizedNamespaceDefinitionAsync(
        request: ListDecentralizedNamespaceDefinitionRequest,
        options?: RequestOptions,
    ): Promise<ListDecentralizedNamespaceDefinitionResponse>;

    /** Reads owner-to-key mappings. Supported on gRPC; JSON rejects it. */
    listOwnerToKeyMappingAsync(
        request: ListOwnerToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListOwnerToKeyMappingResponse>;

    /** Reads party-to-key mappings. Supported on gRPC; JSON rejects it. */
    listPartyToKeyMappingAsync(
        request: ListPartyToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToKeyMappingResponse>;

    /** Reads synchronizer trust certificates. Supported on gRPC; JSON rejects it. */
    listSynchronizerTrustCertificateAsync(
        request: ListSynchronizerTrustCertificateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerTrustCertificateResponse>;

    /** Reads participant synchronizer permissions. Supported on gRPC; JSON rejects it. */
    listParticipantSynchronizerPermissionAsync(
        request: ListParticipantSynchronizerPermissionRequest,
        options?: RequestOptions,
    ): Promise<ListParticipantSynchronizerPermissionResponse>;

    /** Reads party hosting limits. Supported on gRPC; JSON rejects it. */
    listPartyHostingLimitsAsync(
        request: ListPartyHostingLimitsRequest,
        options?: RequestOptions,
    ): Promise<ListPartyHostingLimitsResponse>;

    /** Reads topology vetted packages. Supported on gRPC; JSON rejects it. */
    topologyListVettedPackagesAsync(
        request: TopologyListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListVettedPackagesResponse>;

    /** Reads party-to-participant mappings. Supported on gRPC; JSON rejects it. */
    listPartyToParticipantAsync(
        request: ListPartyToParticipantRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToParticipantResponse>;

    /** Reads synchronizer parameter state. Supported on gRPC; JSON rejects it. */
    listSynchronizerParametersStateAsync(
        request: ListSynchronizerParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerParametersStateResponse>;

    /** Reads sequencing parameter state. Supported on gRPC; JSON rejects it. */
    listSequencingParametersStateAsync(
        request: ListSequencingParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencingParametersStateResponse>;

    /** Reads mediator synchronizer state. Supported on gRPC; JSON rejects it. */
    listMediatorSynchronizerStateAsync(
        request: ListMediatorSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListMediatorSynchronizerStateResponse>;

    /** Reads sequencer synchronizer state. Supported on gRPC; JSON rejects it. */
    listSequencerSynchronizerStateAsync(
        request: ListSequencerSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencerSynchronizerStateResponse>;

    /** Reads LSU announcements. Supported on gRPC; JSON rejects it. */
    listLsuAnnouncementAsync(
        request: ListLsuAnnouncementRequest,
        options?: RequestOptions,
    ): Promise<ListLsuAnnouncementResponse>;

    /** Reads LSU sequencer connection successors. Supported on gRPC; JSON rejects it. */
    listLsuSequencerConnectionSuccessorAsync(
        request: ListLsuSequencerConnectionSuccessorRequest,
        options?: RequestOptions,
    ): Promise<ListLsuSequencerConnectionSuccessorResponse>;

    /** Lists available topology stores. Supported on gRPC; JSON rejects it. */
    listAvailableStoresAsync(
        request: ListAvailableStoresRequest,
        options?: RequestOptions,
    ): Promise<ListAvailableStoresResponse>;

    /** Reads raw topology transactions. Supported on gRPC; JSON rejects it. */
    listAllAsync(
        request: ListAllRequest,
        options?: RequestOptions,
    ): Promise<ListAllResponse>;

    /** Reads raw topology transactions using the preferred V2 API. Supported on gRPC; JSON rejects it. */
    listAllV2Async(
        request: ListAllV2Request,
        options?: RequestOptions,
    ): Promise<ListAllV2Response>;

    /** Lists aggregated party hosting information. Supported on gRPC; JSON rejects it. */
    topologyListPartiesAsync(
        request: TopologyListPartiesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse>;

    /** Lists aggregated key owner information. Supported on gRPC; JSON rejects it. */
    listKeyOwnersAsync(
        request: ListKeyOwnersRequest,
        options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse>;

    /** Reads a page of active contracts. Supported on JSON and gRPC. */
    getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse>;

    /** Reads active contracts as a stream. JSON-backed; gRPC currently rejects it. */
    getActiveContractsAsync(
        request: GetActiveContractsRequest,
        observer: ContractObserver,
        options?: RequestOptions,
    ): Promise<void>;

    /** Reads ledger updates. gRPC-backed; JSON currently rejects it. */
    getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
        options?: RequestOptions,
    ): Promise<void>;

    /**
     * Submits a command.
     * Supported on JSON and gRPC. External signing is gRPC-only.
     */
    submitCommandAsync(
        request: SubmitCommandRequest,
        signed?: SignCommandResult,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse>;
}
