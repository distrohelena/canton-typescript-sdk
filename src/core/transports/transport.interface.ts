import { TransportFeatures } from "./transport-features.interface.js";
import { AllocatePartyRequest } from "../types/requests/allocate-party-request.js";
import { AddTopologyTransactionsRequest } from "../types/requests/add-topology-transactions-request.js";
import { AuthorizeTopologyTransactionsRequest } from "../types/requests/authorize-topology-transactions-request.js";
import { GrantUserRightsRequest } from "../types/requests/grant-user-rights-request.js";
import { CreateTemporaryTopologyStoreRequest } from "../types/requests/create-temporary-topology-store-request.js";
import { GetActiveContractsPageRequest } from "../types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../types/requests/get-active-contracts-request.js";
import { GetCompletionsRequest } from "../types/requests/get-completions-request.js";
import { GetConnectedSynchronizersRequest } from "../types/requests/get-connected-synchronizers-request.js";
import { CountInFlightRequest } from "../types/requests/count-in-flight-request.js";
import { CurrentTimeRequest } from "../types/requests/current-time-request.js";
import { GetDarContentsRequest } from "../types/requests/get-dar-contents-request.js";
import { GetDarRequest } from "../types/requests/get-dar-request.js";
import { GetCommandStatusRequest } from "../types/requests/get-command-status-request.js";
import { GetContractRequest } from "../types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../types/requests/get-events-by-contract-id-request.js";
import { GetHighestOffsetByTimestampRequest } from "../types/requests/get-highest-offset-by-timestamp-request.js";
import { GetConfigForSlowCounterParticipantsRequest } from "../types/requests/get-config-for-slow-counter-participants-request.js";
import { GetIdentityProviderConfigRequest } from "../types/requests/get-identity-provider-config-request.js";
import { GetIdRequest } from "../types/requests/get-id-request.js";
import { GetIntervalsBehindForCounterParticipantsRequest } from "../types/requests/get-intervals-behind-for-counter-participants-request.js";
import { InspectCommitmentContractsRequest } from "../types/requests/inspect-commitment-contracts-request.js";
import { GetNoWaitCommitmentsFromRequest } from "../types/requests/get-no-wait-commitments-from-request.js";
import { ListKnownPartiesRequest } from "../types/requests/list-known-parties-request.js";
import { GetLatestPrunedOffsetsRequest } from "../types/requests/get-latest-pruned-offsets-request.js";
import { GetLedgerEndRequest } from "../types/requests/get-ledger-end-request.js";
import { GetLedgerApiVersionRequest } from "../types/requests/get-ledger-api-version-request.js";
import { GetPackageContentsRequest } from "../types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../types/requests/get-package-status-request.js";
import { GetParticipantPruningScheduleRequest } from "../types/requests/get-participant-pruning-schedule-request.js";
import { GetParticipantIdRequest } from "../types/requests/get-participant-id-request.js";
import { GetParticipantStatusRequest } from "../types/requests/get-participant-status-request.js";
import { GetPartiesRequest } from "../types/requests/get-parties-request.js";
import { GetPruningScheduleRequest } from "../types/requests/get-pruning-schedule-request.js";
import { GetResourceLimitsRequest } from "../types/requests/get-resource-limits-request.js";
import { GetSafePruningOffsetRequest } from "../types/requests/get-safe-pruning-offset-request.js";
import { GetSynchronizerIdRequest } from "../types/requests/get-synchronizer-id-request.js";
import { GetUpdateByHashRequest } from "../types/requests/get-update-by-hash-request.js";
import { GetUpdateByIdRequest } from "../types/requests/get-update-by-id-request.js";
import { GetUpdateByOffsetRequest } from "../types/requests/get-update-by-offset-request.js";
import { GetUpdatesRequest } from "../types/requests/get-updates-request.js";
import { GetUpdatesPageRequest } from "../types/requests/get-updates-page-request.js";
import { GetUserRequest } from "../types/requests/get-user-request.js";
import { DropTemporaryTopologyStoreRequest } from "../types/requests/drop-temporary-topology-store-request.js";
import { GenerateTopologyTransactionsRequest } from "../types/requests/generate-topology-transactions-request.js";
import { HealthCheckRequest } from "../types/requests/health-check-request.js";
import { ImportTopologySnapshotRequest } from "../types/requests/import-topology-snapshot-request.js";
import { ImportTopologySnapshotV2Request } from "../types/requests/import-topology-snapshot-v2-request.js";
import { ListAllRequest } from "../types/requests/list-all-request.js";
import { ListAllV2Request } from "../types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../types/requests/list-available-stores-request.js";
import { ListConnectedSynchronizersRequest } from "../types/requests/list-connected-synchronizers-request.js";
import { ListRegisteredSynchronizersRequest } from "../types/requests/list-registered-synchronizers-request.js";
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
import { ListKnownPackagesRequest } from "../types/requests/list-known-packages-request.js";
import { ListIdentityProviderConfigsRequest } from "../types/requests/list-identity-provider-configs-request.js";
import { ListDarsRequest } from "../types/requests/list-dars-request.js";
import { ListPendingOperationsRequest } from "../types/requests/list-pending-operations-request.js";
import { ListUserRightsRequest } from "../types/requests/list-user-rights-request.js";
import { ListUsersRequest } from "../types/requests/list-users-request.js";
import { LookupReceivedAcsCommitmentsRequest } from "../types/requests/lookup-received-acs-commitments-request.js";
import { LookupSentAcsCommitmentsRequest } from "../types/requests/lookup-sent-acs-commitments-request.js";
import { LookupOffsetByTimeRequest } from "../types/requests/lookup-offset-by-time-request.js";
import { OpenCommitmentRequest } from "../types/requests/open-commitment-request.js";
import { ListVettedPackagesRequest } from "../types/requests/list-vetted-packages-request.js";
import { TopologyListPartiesRequest } from "../types/requests/topology-list-parties-request.js";
import { TopologyListVettedPackagesRequest } from "../types/requests/topology-list-vetted-packages-request.js";
import { TrafficControlStateRequest } from "../types/requests/traffic-control-state-request.js";
import { UploadDarFileRequest } from "../types/requests/upload-dar-file-request.js";
import { ParticipantListPackagesRequest } from "../types/requests/participant-list-packages-request.js";
import { SignTopologyTransactionsRequest } from "../types/requests/sign-topology-transactions-request.js";
import { GetPackageContentsResponse } from "../types/responses/get-package-contents-response.js";
import { GetConnectedSynchronizersResponse } from "../types/responses/get-connected-synchronizers-response.js";
import { CountInFlightResponse } from "../types/responses/count-in-flight-response.js";
import { CurrentTimeResponse } from "../types/responses/current-time-response.js";
import { GetDarContentsResponse } from "../types/responses/get-dar-contents-response.js";
import { GetDarResponse } from "../types/responses/get-dar-response.js";
import { GetCommandStatusResponse } from "../types/responses/get-command-status-response.js";
import { GetContractResponse } from "../types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../types/responses/get-events-by-contract-id-response.js";
import { GetConfigForSlowCounterParticipantsResponse } from "../types/responses/get-config-for-slow-counter-participants-response.js";
import { GetHighestOffsetByTimestampResponse } from "../types/responses/get-highest-offset-by-timestamp-response.js";
import { GetIdentityProviderConfigResponse } from "../types/responses/get-identity-provider-config-response.js";
import { GetIdResponse } from "../types/responses/get-id-response.js";
import { GetIntervalsBehindForCounterParticipantsResponse } from "../types/responses/get-intervals-behind-for-counter-participants-response.js";
import { InspectCommitmentContractsResponse } from "../types/responses/inspect-commitment-contracts-response.js";
import { GetNoWaitCommitmentsFromResponse } from "../types/responses/get-no-wait-commitments-from-response.js";
import { GetLatestPrunedOffsetsResponse } from "../types/responses/get-latest-pruned-offsets-response.js";
import { GetLedgerEndResponse } from "../types/responses/get-ledger-end-response.js";
import { GetPackageReferencesResponse } from "../types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../types/responses/get-package-status-response.js";
import { GetParticipantPruningScheduleResponse } from "../types/responses/get-participant-pruning-schedule-response.js";
import { GetParticipantIdResponse } from "../types/responses/get-participant-id-response.js";
import { GetParticipantStatusResponse } from "../types/responses/get-participant-status-response.js";
import { GetPartiesResponse } from "../types/responses/get-parties-response.js";
import { GetPruningScheduleResponse } from "../types/responses/get-pruning-schedule-response.js";
import { GetResourceLimitsResponse } from "../types/responses/get-resource-limits-response.js";
import { GetSafePruningOffsetResponse } from "../types/responses/get-safe-pruning-offset-response.js";
import { GetSynchronizerIdResponse } from "../types/responses/get-synchronizer-id-response.js";
import { GetUpdateByHashResponse } from "../types/responses/get-update-by-hash-response.js";
import { GetUpdateByIdResponse } from "../types/responses/get-update-by-id-response.js";
import { GetUpdateByOffsetResponse } from "../types/responses/get-update-by-offset-response.js";
import { AllocatePartyResponse } from "../types/responses/allocate-party-response.js";
import { GetActiveContractsPageResponse } from "../types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../types/responses/get-ledger-api-version-response.js";
import { GetUpdatesPageResponse } from "../types/responses/get-updates-page-response.js";
import { GetUserResponse } from "../types/responses/get-user-response.js";
import { AddTopologyTransactionsResponse } from "../types/responses/add-topology-transactions-response.js";
import { AuthorizeTopologyTransactionsResponse } from "../types/responses/authorize-topology-transactions-response.js";
import { CreateTemporaryTopologyStoreResponse } from "../types/responses/create-temporary-topology-store-response.js";
import { DropTemporaryTopologyStoreResponse } from "../types/responses/drop-temporary-topology-store-response.js";
import { GenerateTopologyTransactionsResponse } from "../types/responses/generate-topology-transactions-response.js";
import { GrantUserRightsResponse } from "../types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../types/responses/health-check-response.js";
import { ImportTopologySnapshotResponse } from "../types/responses/import-topology-snapshot-response.js";
import { ImportTopologySnapshotV2Response } from "../types/responses/import-topology-snapshot-v2-response.js";
import { ListAllResponse } from "../types/responses/list-all-response.js";
import { ListAllV2Response } from "../types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../types/responses/list-available-stores-response.js";
import { ListConnectedSynchronizersResponse } from "../types/responses/list-connected-synchronizers-response.js";
import { ListRegisteredSynchronizersResponse } from "../types/responses/list-registered-synchronizers-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../types/responses/list-decentralized-namespace-definition-response.js";
import { ListKeyOwnersResponse } from "../types/responses/list-key-owners-response.js";
import { ListLsuAnnouncementResponse } from "../types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../types/responses/list-owner-to-key-mapping-response.js";
import { ListPackagesResponse } from "../types/responses/list-packages-response.js";
import { ListKnownPackagesResponse } from "../types/responses/list-known-packages-response.js";
import { ListKnownPartiesResponse } from "../types/responses/list-known-parties-response.js";
import { ListDarsResponse } from "../types/responses/list-dars-response.js";
import { ListIdentityProviderConfigsResponse } from "../types/responses/list-identity-provider-configs-response.js";
import { ListPendingOperationsResponse } from "../types/responses/list-pending-operations-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../types/responses/list-synchronizer-trust-certificate-response.js";
import { ListUserRightsResponse } from "../types/responses/list-user-rights-response.js";
import { ListUsersResponse } from "../types/responses/list-users-response.js";
import { LookupReceivedAcsCommitmentsResponse } from "../types/responses/lookup-received-acs-commitments-response.js";
import { LookupSentAcsCommitmentsResponse } from "../types/responses/lookup-sent-acs-commitments-response.js";
import { LookupOffsetByTimeResponse } from "../types/responses/lookup-offset-by-time-response.js";
import { OpenCommitmentResponse } from "../types/responses/open-commitment-response.js";
import { SignTopologyTransactionsResponse } from "../types/responses/sign-topology-transactions-response.js";
import { TopologyListPartiesResponse } from "../types/responses/topology-list-parties-response.js";
import { ListVettedPackagesResponse } from "../types/responses/list-vetted-packages-response.js";
import { TopologyListVettedPackagesResponse } from "../types/responses/topology-list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import { TrafficControlStateResponse } from "../types/responses/traffic-control-state-response.js";
import { UploadDarFileResponse } from "../types/responses/upload-dar-file-response.js";
import { CompletionObserver } from "../../services/command-completion/completion-observer.interface.js";
import { CommitmentChunkObserver } from "../../services/participant-inspection/commitment-chunk-observer.interface.js";
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

    /** Reads the host participant identifier. Supported on gRPC; JSON rejects it. */
    getParticipantIdAsync(
        request: GetParticipantIdRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantIdResponse>;

    /** Reads party details for specific parties. Supported on gRPC; JSON rejects it. */
    getPartiesAsync(
        request: GetPartiesRequest,
        options?: RequestOptions,
    ): Promise<GetPartiesResponse>;

    /** Grants user rights. Supported on JSON and gRPC. */
    grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse>;

    /** Reads ledger-admin command status records. Supported on gRPC; JSON rejects it. */
    getCommandStatusAsync(
        request: GetCommandStatusRequest,
        options?: RequestOptions,
    ): Promise<GetCommandStatusResponse>;

    /** Reads a participant user. Supported on gRPC; JSON rejects it. */
    getUserAsync(
        request: GetUserRequest,
        options?: RequestOptions,
    ): Promise<GetUserResponse>;

    /** Lists participant users. Supported on gRPC; JSON rejects it. */
    listUsersAsync(
        request: ListUsersRequest,
        options?: RequestOptions,
    ): Promise<ListUsersResponse>;

    /** Lists rights for a participant user. Supported on gRPC; JSON rejects it. */
    listUserRightsAsync(
        request: ListUserRightsRequest,
        options?: RequestOptions,
    ): Promise<ListUserRightsResponse>;

    /** Uploads a DAR package. Supported on JSON and gRPC. */
    uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse>;

    /** Lists participant-known package metadata. Supported on gRPC; JSON rejects it. */
    listKnownPackagesAsync(
        request: ListKnownPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPackagesResponse>;

    /** Reads one ledger-admin identity provider config. Supported on gRPC; JSON rejects it. */
    getIdentityProviderConfigAsync(
        request: GetIdentityProviderConfigRequest,
        options?: RequestOptions,
    ): Promise<GetIdentityProviderConfigResponse>;

    /** Lists ledger-admin identity provider configs. Supported on gRPC; JSON rejects it. */
    listIdentityProviderConfigsAsync(
        request: ListIdentityProviderConfigsRequest,
        options?: RequestOptions,
    ): Promise<ListIdentityProviderConfigsResponse>;

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

    /** Reads a participant-local DAR archive. Supported on gRPC; JSON rejects it. */
    getParticipantDarAsync(
        request: GetDarRequest,
        options?: RequestOptions,
    ): Promise<GetDarResponse>;

    /** Lists participant-local DAR archives. Supported on gRPC; JSON rejects it. */
    listParticipantDarsAsync(
        request: ListDarsRequest,
        options?: RequestOptions,
    ): Promise<ListDarsResponse>;

    /** Reads participant-local DAR contents. Supported on gRPC; JSON rejects it. */
    getParticipantDarContentsAsync(
        request: GetDarContentsRequest,
        options?: RequestOptions,
    ): Promise<GetDarContentsResponse>;

    /** Reads participant admin status. Supported on gRPC; JSON rejects it. */
    getParticipantStatusAsync(
        request: GetParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse>;

    /** Reads the participant ledger offset for a timestamp. Supported on gRPC; JSON rejects it. */
    lookupOffsetByTimeAsync(
        request: LookupOffsetByTimeRequest,
        options?: RequestOptions,
    ): Promise<LookupOffsetByTimeResponse>;

    /** Opens an ACS commitment payload chunk. Supported on gRPC; JSON rejects it. */
    openCommitmentAsync(
        request: OpenCommitmentRequest,
        observer: CommitmentChunkObserver<OpenCommitmentResponse>,
        options?: RequestOptions,
    ): Promise<void>;

    /** Reads commitment contract payload chunks. Supported on gRPC; JSON rejects it. */
    inspectCommitmentContractsAsync(
        request: InspectCommitmentContractsRequest,
        observer: CommitmentChunkObserver<InspectCommitmentContractsResponse>,
        options?: RequestOptions,
    ): Promise<void>;

    /** Reads participant in-flight submission and transaction counts. Supported on gRPC; JSON rejects it. */
    countInFlightAsync(
        request: CountInFlightRequest,
        options?: RequestOptions,
    ): Promise<CountInFlightResponse>;

    /** Reads slow counter-participant monitoring config. Supported on gRPC; JSON rejects it. */
    getConfigForSlowCounterParticipantsAsync(
        request: GetConfigForSlowCounterParticipantsRequest,
        options?: RequestOptions,
    ): Promise<GetConfigForSlowCounterParticipantsResponse>;

    /** Reads counter-participant lag information. Supported on gRPC; JSON rejects it. */
    getIntervalsBehindForCounterParticipantsAsync(
        request: GetIntervalsBehindForCounterParticipantsRequest,
        options?: RequestOptions,
    ): Promise<GetIntervalsBehindForCounterParticipantsResponse>;

    /** Reads sent ACS commitments. Supported on gRPC; JSON rejects it. */
    lookupSentAcsCommitmentsAsync(
        request: LookupSentAcsCommitmentsRequest,
        options?: RequestOptions,
    ): Promise<LookupSentAcsCommitmentsResponse>;

    /** Reads received ACS commitments. Supported on gRPC; JSON rejects it. */
    lookupReceivedAcsCommitmentsAsync(
        request: LookupReceivedAcsCommitmentsRequest,
        options?: RequestOptions,
    ): Promise<LookupReceivedAcsCommitmentsResponse>;

    /** Reads the highest participant ledger offset before or at a timestamp. Supported on gRPC; JSON rejects it. */
    getHighestOffsetByTimestampAsync(
        request: GetHighestOffsetByTimestampRequest,
        options?: RequestOptions,
    ): Promise<GetHighestOffsetByTimestampResponse>;

    /** Reads the safe participant pruning offset. Supported on gRPC; JSON rejects it. */
    getSafePruningOffsetAsync(
        request: GetSafePruningOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetSafePruningOffsetResponse>;

    /** Reads the automatic pruning schedule. Supported on gRPC; JSON rejects it. */
    getPruningScheduleAsync(
        request: GetPruningScheduleRequest,
        options?: RequestOptions,
    ): Promise<GetPruningScheduleResponse>;

    /** Reads the participant-specific automatic pruning schedule. Supported on gRPC; JSON rejects it. */
    getParticipantPruningScheduleAsync(
        request: GetParticipantPruningScheduleRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantPruningScheduleResponse>;

    /** Reads no-wait commitments configuration. Supported on gRPC; JSON rejects it. */
    getNoWaitCommitmentsFromAsync(
        request: GetNoWaitCommitmentsFromRequest,
        options?: RequestOptions,
    ): Promise<GetNoWaitCommitmentsFromResponse>;

    /** Reads participant traffic control state. Supported on gRPC; JSON rejects it. */
    trafficControlStateAsync(
        request: TrafficControlStateRequest,
        options?: RequestOptions,
    ): Promise<TrafficControlStateResponse>;

    /** Lists connected synchronizers. Supported on gRPC; JSON rejects it. */
    listConnectedSynchronizersAsync(
        request: ListConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<ListConnectedSynchronizersResponse>;

    /** Reads synchronizer ids for a synchronizer alias. Supported on gRPC; JSON rejects it. */
    getSynchronizerIdAsync(
        request: GetSynchronizerIdRequest,
        options?: RequestOptions,
    ): Promise<GetSynchronizerIdResponse>;

    /** Lists registered synchronizers. Supported on gRPC; JSON rejects it. */
    listRegisteredSynchronizersAsync(
        request: ListRegisteredSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<ListRegisteredSynchronizersResponse>;

    /** Lists participant repair pending operations. Supported on gRPC; JSON rejects it. */
    listPendingOperationsAsync(
        request: ListPendingOperationsRequest,
        options?: RequestOptions,
    ): Promise<ListPendingOperationsResponse>;

    /** Reads participant-admin resource limits. Supported on gRPC; JSON rejects it. */
    getResourceLimitsAsync(
        request: GetResourceLimitsRequest,
        options?: RequestOptions,
    ): Promise<GetResourceLimitsResponse>;

    /** Reads the topology identity initialization id. Supported on gRPC; JSON rejects it. */
    getIdAsync(
        request: GetIdRequest,
        options?: RequestOptions,
    ): Promise<GetIdResponse>;

    /** Reads the topology identity initialization current time. Supported on gRPC; JSON rejects it. */
    currentTimeAsync(
        request: CurrentTimeRequest,
        options?: RequestOptions,
    ): Promise<CurrentTimeResponse>;

    /** Reads a single contract. Supported on gRPC; JSON rejects it. */
    getContractAsync(
        request: GetContractRequest,
        options?: RequestOptions,
    ): Promise<GetContractResponse>;

    /** Reads lifecycle events for a contract id. Supported on gRPC; JSON rejects it. */
    getEventsByContractIdAsync(
        request: GetEventsByContractIdRequest,
        options?: RequestOptions,
    ): Promise<GetEventsByContractIdResponse>;

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

    /** Authorizes topology transactions. Supported on gRPC; JSON rejects it. */
    authorizeTopologyTransactionsAsync(
        request: AuthorizeTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<AuthorizeTopologyTransactionsResponse>;

    /** Adds topology transactions to a topology store. Supported on gRPC; JSON rejects it. */
    addTopologyTransactionsAsync(
        request: AddTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<AddTopologyTransactionsResponse>;

    /** Imports a serialized topology snapshot. Supported on gRPC; JSON rejects it. */
    importTopologySnapshotAsync(
        request: ImportTopologySnapshotRequest,
        options?: RequestOptions,
    ): Promise<ImportTopologySnapshotResponse>;

    /** Imports a serialized topology snapshot using the V2 RPC. Supported on gRPC; JSON rejects it. */
    importTopologySnapshotV2Async(
        request: ImportTopologySnapshotV2Request,
        options?: RequestOptions,
    ): Promise<ImportTopologySnapshotV2Response>;

    /** Adds local signatures to topology transactions. Supported on gRPC; JSON rejects it. */
    signTopologyTransactionsAsync(
        request: SignTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<SignTopologyTransactionsResponse>;

    /** Generates topology transactions from raw proposals. Supported on gRPC; JSON rejects it. */
    generateTopologyTransactionsAsync(
        request: GenerateTopologyTransactionsRequest,
        options?: RequestOptions,
    ): Promise<GenerateTopologyTransactionsResponse>;

    /** Creates a temporary topology store. Supported on gRPC; JSON rejects it. */
    createTemporaryTopologyStoreAsync(
        request: CreateTemporaryTopologyStoreRequest,
        options?: RequestOptions,
    ): Promise<CreateTemporaryTopologyStoreResponse>;

    /** Drops a temporary topology store. Supported on gRPC; JSON rejects it. */
    dropTemporaryTopologyStoreAsync(
        request: DropTemporaryTopologyStoreRequest,
        options?: RequestOptions,
    ): Promise<DropTemporaryTopologyStoreResponse>;

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

    /** Reads connected synchronizers. Supported on gRPC; JSON rejects it. */
    getConnectedSynchronizersAsync(
        request: GetConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<GetConnectedSynchronizersResponse>;

    /** Reads the participant ledger end. Supported on gRPC; JSON rejects it. */
    getLedgerEndAsync(
        request: GetLedgerEndRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerEndResponse>;

    /** Reads the latest participant pruning offsets. Supported on gRPC; JSON rejects it. */
    getLatestPrunedOffsetsAsync(
        request: GetLatestPrunedOffsetsRequest,
        options?: RequestOptions,
    ): Promise<GetLatestPrunedOffsetsResponse>;

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

    /** Reads one update by offset. Supported on gRPC; JSON rejects it. */
    getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateByOffsetResponse>;

    /** Reads one update by update id. Supported on gRPC; JSON rejects it. */
    getUpdateByIdAsync(
        request: GetUpdateByIdRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateByIdResponse>;

    /** Reads one update by transaction hash. Supported on gRPC; JSON rejects it. */
    getUpdateByHashAsync(
        request: GetUpdateByHashRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateByHashResponse>;

    /** Reads a page of updates. Supported on gRPC; JSON rejects it. */
    getUpdatesPageAsync(
        request: GetUpdatesPageRequest,
        options?: RequestOptions,
    ): Promise<GetUpdatesPageResponse>;

    /** Reads command completions as a stream. Supported on gRPC; JSON rejects it. */
    getCompletionsAsync(
        request: GetCompletionsRequest,
        observer: CompletionObserver,
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
