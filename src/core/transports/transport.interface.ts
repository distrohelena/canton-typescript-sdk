import { TransportFeatures } from "./transport-features.interface.js";
import type {
    AddTransactionsRequest,
    AddTransactionsResponse,
    AuthorizeRequest,
    AuthorizeResponse,
    CreateTemporaryTopologyStoreRequest,
    CreateTemporaryTopologyStoreResponse,
    DropTemporaryTopologyStoreRequest,
    DropTemporaryTopologyStoreResponse,
    GenerateTransactionsRequest,
    GenerateTransactionsResponse,
    ImportTopologySnapshotRequest,
    ImportTopologySnapshotResponse,
    ImportTopologySnapshotV2Request,
    ImportTopologySnapshotV2Response,
    SignTransactionsRequest,
    SignTransactionsResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.js";
import type {
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdateResponse,
    GetUpdatesPageRequest,
    GetUpdatesPageResponse,
    GetUpdatesRequest,
    GetUpdatesResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
import type {
    CompletionStreamResponse,
    GetCompletionsRequest,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/command_completion_service.js";
import { AllocatePartyRequest } from "../types/requests/allocate-party-request.js";
import { AllocateExternalPartyRequest } from "../types/requests/allocate-external-party-request.js";
import { GetActiveContractsRequest } from "../types/requests/get-active-contracts-request.js";
import { ListKnownPartiesRequest } from "../types/requests/list-known-parties-request.js";
import { GenerateExternalPartyTopologyRequest } from "../types/requests/generate-external-party-topology-request.js";
import type {
    GetContractRequest,
    GetContractResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import type {
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";
import type {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";
import type {
    GetResourceLimitsRequest,
    GetResourceLimitsResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";
import type {
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import type {
    GetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleRequest as GetParticipantPruningScheduleRequest,
    GetParticipantScheduleResponse as GetParticipantPruningScheduleResponse,
    GetScheduleRequest as GetPruningScheduleRequest,
    GetScheduleResponse as GetPruningScheduleResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import { AllocatePartyResponse } from "../types/responses/allocate-party-response.js";
import { AllocateExternalPartyResponse } from "../types/responses/allocate-external-party-response.js";
import { GenerateExternalPartyTopologyResponse } from "../types/responses/generate-external-party-topology-response.js";
import type {
    ListAllV2Request,
    ListAllV2Response,
    ListAllRequest,
    ListAllResponse,
    ListAvailableStoresRequest,
    ListAvailableStoresResponse,
    ListLsuAnnouncementRequest,
    ListLsuAnnouncementResponse,
    ListLsuSequencerConnectionSuccessorRequest,
    ListLsuSequencerConnectionSuccessorResponse,
    ListMediatorSynchronizerStateRequest,
    ListMediatorSynchronizerStateResponse,
    ListSequencingParametersStateRequest,
    ListSequencingParametersStateResponse,
    ListSynchronizerParametersStateRequest,
    ListSynchronizerParametersStateResponse,
    ListPartyToParticipantRequest,
    ListPartyToParticipantResponse,
    ListVettedPackagesRequest as TopologyListVettedPackagesRequest,
    ListVettedPackagesResponse as TopologyListVettedPackagesResponse,
    ListPartyHostingLimitsRequest,
    ListPartyHostingLimitsResponse,
    ListParticipantSynchronizerPermissionRequest,
    ListParticipantSynchronizerPermissionResponse,
    ListSynchronizerTrustCertificateRequest,
    ListSynchronizerTrustCertificateResponse,
    ListPartyToKeyMappingRequest,
    ListPartyToKeyMappingResponse,
    ListOwnerToKeyMappingRequest,
    ListOwnerToKeyMappingResponse,
    ListDecentralizedNamespaceDefinitionRequest,
    ListDecentralizedNamespaceDefinitionResponse,
    ListNamespaceDelegationRequest,
    ListNamespaceDelegationResponse,
    ListSequencerSynchronizerStateRequest,
    ListSequencerSynchronizerStateResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import type {
    GetSynchronizerIdRequest,
    GetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse,
    ListRegisteredSynchronizersRequest,
    ListRegisteredSynchronizersResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import type {
    AddPartyAsyncRequest,
    AddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import type {
    GetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import type {
    ListKeyOwnersRequest,
    ListKeyOwnersResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import { ListKnownPartiesResponse } from "../types/responses/list-known-parties-response.js";
import type {
    CountInFlightRequest,
    CountInFlightResponse,
    GetConfigForSlowCounterParticipantsRequest,
    GetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsResponse,
    LookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse,
    LookupReceivedAcsCommitmentsRequest,
    LookupReceivedAcsCommitmentsResponse,
    LookupSentAcsCommitmentsRequest,
    LookupSentAcsCommitmentsResponse,
    InspectCommitmentContractsRequest,
    InspectCommitmentContractsResponse,
    OpenCommitmentRequest,
    OpenCommitmentResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import type {
    ListPendingOperationsRequest,
    ListPendingOperationsResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";
import type {
    ListPartiesRequest as TopologyListPartiesRequest,
    ListPartiesResponse as TopologyListPartiesResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import type {
    GetDarContentsRequest,
    GetDarContentsResponse,
    GetDarRequest,
    GetDarResponse,
    GetPackageContentsRequest,
    GetPackageContentsResponse,
    GetPackageReferencesRequest,
    GetPackageReferencesResponse,
    ListDarsRequest,
    ListDarsResponse,
    ListPackagesRequest as ParticipantListPackagesRequest,
    ListPackagesResponse as ParticipantListPackagesResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import { SubmitCommandResponse } from "../types/responses/submit-command-response.js";
import type {
    TrafficControlStateRequest,
    TrafficControlStateResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";
import { CommitmentChunkObserver } from "../../services/participant-inspection/commitment-chunk-observer.interface.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import { CommandSigners, ICommandSigner } from "../signing/command-signer.interface.js";
import { SignCommandResult } from "../signing/sign-command-result.js";
import { PreparedCommandSubmission } from "../types/prepared-command-submission.js";
import { SubmitCommandTransactionResponse } from "../types/responses/submit-command-transaction-response.js";
import { RequestOptions } from "../types/request-options.js";
import { SubmitCommandRequest } from "../types/requests/submit-command-request.js";
import type { HealthCheckRequest, HealthCheckResponse } from "../../transports/grpc/generated/canton/google/grpc/health/v1/health.js";
import type { GetLedgerApiVersionRequest, GetLedgerApiVersionResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.js";
import type { ParticipantStatusRequest, ParticipantStatusResponse } from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import type { GetIdentityProviderConfigRequest, GetIdentityProviderConfigResponse, ListIdentityProviderConfigsRequest, ListIdentityProviderConfigsResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";
import type { GetParticipantIdRequest, GetParticipantIdResponse, GetPartiesRequest, GetPartiesResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import type {
    GetUserRequest,
    GetUserResponse,
    GrantUserRightsRequest,
    GrantUserRightsResponse,
    ListUserRightsRequest,
    ListUserRightsResponse,
    ListUsersRequest,
    ListUsersResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import type {
    GetCommandStatusRequest,
    GetCommandStatusResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import type {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/state_service.js";
import type {
    ListKnownPackagesRequest,
    ListKnownPackagesResponse,
    UploadDarFileRequest,
    UploadDarFileResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import type {
    GetPackageRequest,
    GetPackageResponse,
    GetPackageStatusRequest,
    GetPackageStatusResponse,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    ListVettedPackagesResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/package_service.js";

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

    /** Generates external-party topology through the ledger-admin API. Supported on gRPC; JSON rejects it. */
    generateExternalPartyTopologyAsync(
        request: GenerateExternalPartyTopologyRequest,
        options?: RequestOptions,
    ): Promise<GenerateExternalPartyTopologyResponse>;

    /** Allocates an external party through the ledger-admin API. Supported on gRPC; JSON rejects it. */
    allocateExternalPartyAsync(
        request: AllocateExternalPartyRequest,
        options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse>;

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
        request: ParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<ParticipantStatusResponse>;

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

    /** Starts online party replication on the target participant. Supported on gRPC; JSON rejects it. */
    addPartyAsync(
        request: AddPartyAsyncRequest,
        options?: RequestOptions,
    ): Promise<AddPartyAsyncResponse>;

    /** Clears an onboarding flag on the target participant. Supported on gRPC; JSON rejects it. */
    clearPartyOnboardingFlagAsync(
        request: ClearPartyOnboardingFlagRequest,
        options?: RequestOptions,
    ): Promise<ClearPartyOnboardingFlagResponse>;

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
        request: AuthorizeRequest,
        options?: RequestOptions,
    ): Promise<AuthorizeResponse>;

    /** Adds topology transactions to a topology store. Supported on gRPC; JSON rejects it. */
    addTopologyTransactionsAsync(
        request: AddTransactionsRequest,
        options?: RequestOptions,
    ): Promise<AddTransactionsResponse>;

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
        request: SignTransactionsRequest,
        options?: RequestOptions,
    ): Promise<SignTransactionsResponse>;

    /** Generates topology transactions from raw proposals. Supported on gRPC; JSON rejects it. */
    generateTopologyTransactionsAsync(
        request: GenerateTransactionsRequest,
        options?: RequestOptions,
    ): Promise<GenerateTransactionsResponse>;

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
        options?: RequestOptions,
    ): AsyncIterable<GetUpdatesResponse>;

    /** Reads one update by offset. Supported on gRPC; JSON rejects it. */
    getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateResponse>;

    /** Reads one update by update id. Supported on gRPC; JSON rejects it. */
    getUpdateByIdAsync(
        request: GetUpdateByIdRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateResponse>;

    /** Reads one update by transaction hash. Supported on gRPC; JSON rejects it. */
    getUpdateByHashAsync(
        request: GetUpdateByHashRequest,
        options?: RequestOptions,
    ): Promise<GetUpdateResponse>;

    /** Reads a page of updates. Supported on gRPC; JSON rejects it. */
    getUpdatesPageAsync(
        request: GetUpdatesPageRequest,
        options?: RequestOptions,
    ): Promise<GetUpdatesPageResponse>;

    /** Reads command completions as a stream. Supported on gRPC; JSON rejects it. */
    getCompletionsAsync(
        request: GetCompletionsRequest,
        options?: RequestOptions,
    ): AsyncIterable<CompletionStreamResponse>;

    /**
     * Submits a command.
     * Supported on JSON and gRPC. External signing is gRPC-only.
     */
    submitCommandAsync(
        request: SubmitCommandRequest,
        signer?: ICommandSigner | CommandSigners,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse>;
    submitCommandForTransactionAsync?(request: SubmitCommandRequest, options?: RequestOptions): Promise<SubmitCommandTransactionResponse>;
    prepareCommandAsync?(request: SubmitCommandRequest, options?: RequestOptions): Promise<PreparedCommandSubmission>;
    executePreparedCommandAndWaitAsync?(prepared: PreparedCommandSubmission, signatures: Readonly<Record<string, SignCommandResult>>, options?: RequestOptions): Promise<SubmitCommandResponse>;
}
