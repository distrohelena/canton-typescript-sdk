import { GrpcTransport as ProtobufGrpcTransport } from "@protobuf-ts/grpc-transport";
import { CantonClientOptions } from "../../client/canton-client-options.js";
import {
    IPackageServiceClient as IParticipantPackageServiceClient,
    PackageServiceClient as ParticipantPackageServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.client.js";
import {
    IPartyManagementServiceClient as IParticipantPartyManagementServiceClient,
    PartyManagementServiceClient as ParticipantPartyManagementServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.client.js";
import {
    IParticipantInspectionServiceClient,
    ParticipantInspectionServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.client.js";
import {
    IParticipantRepairServiceClient,
    ParticipantRepairServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.client.js";
import {
    IPruningServiceClient,
    PruningServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.client.js";
import {
    IResourceManagementServiceClient,
    ResourceManagementServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.client.js";
import {
    IParticipantStatusServiceClient,
    ParticipantStatusServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.client.js";
import {
    ISynchronizerConnectivityServiceClient,
    SynchronizerConnectivityServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.client.js";
import {
    ITrafficControlServiceClient,
    TrafficControlServiceClient,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.client.js";
import {
    IIdentityInitializationServiceClient,
    IdentityInitializationServiceClient,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.client.js";
import {
    ITopologyAggregationServiceClient,
    TopologyAggregationServiceClient,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.client.js";
import {
    ITopologyManagerReadServiceClient,
    TopologyManagerReadServiceClient,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.client.js";
import {
    ITopologyManagerWriteServiceClient,
    TopologyManagerWriteServiceClient,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_write_service.client.js";
import {
    ICommandInspectionServiceClient,
    CommandInspectionServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.client.js";
import {
    IIdentityProviderConfigServiceClient,
    IdentityProviderConfigServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.client.js";
import {
    IPackageManagementServiceClient,
    PackageManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.client.js";
import {
    IPackageServiceClient as ILedgerPackageServiceClient,
    PackageServiceClient as LedgerPackageServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/package_service.client.js";
import {
    IPartyManagementServiceClient,
    PartyManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.client.js";
import {
    IUserManagementServiceClient,
    UserManagementServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.client.js";
import {
    IVersionServiceClient,
    VersionServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/version_service.client.js";
import {
    ICommandServiceClient,
    CommandServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/command_service.client.js";
import {
    IInteractiveSubmissionServiceClient,
    InteractiveSubmissionServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/interactive/interactive_submission_service.client.js";
import {
    ICommandCompletionServiceClient,
    CommandCompletionServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/command_completion_service.client.js";
import {
    IContractServiceClient,
    ContractServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/contract_service.client.js";
import {
    IEventQueryServiceClient,
    EventQueryServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/event_query_service.client.js";
import {
    IStateServiceClient,
    StateServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/state_service.client.js";
import {
    IUpdateServiceClient,
    UpdateServiceClient,
} from "./generated/canton/com/daml/ledger/api/v2/update_service.client.js";
import {
    HealthClient,
    IHealthClient,
} from "./generated/canton/google/grpc/health/v1/health.client.js";
import {
    GetCompletionsRequest as GrpcGetCompletionsRequest,
    CompletionStreamResponse as GrpcCompletionStreamResponse,
} from "./generated/canton/com/daml/ledger/api/v2/command_completion_service.js";
import {
    GetContractRequest as GrpcGetContractRequest,
    GetContractResponse as GrpcGetContractResponse,
} from "./generated/canton/com/daml/ledger/api/v2/contract_service.js";
import {
    GetEventsByContractIdRequest as GrpcGetEventsByContractIdRequest,
    GetEventsByContractIdResponse as GrpcGetEventsByContractIdResponse,
} from "./generated/canton/com/daml/ledger/api/v2/event_query_service.js";
import {
    GetActiveContractsPageRequest,
    GetConnectedSynchronizersRequest as GrpcGetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse as GrpcGetConnectedSynchronizersResponse,
    GetActiveContractsPageResponse,
    GetLatestPrunedOffsetsRequest as GrpcGetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse as GrpcGetLatestPrunedOffsetsResponse,
    GetLedgerEndRequest as GrpcGetLedgerEndRequest,
    GetLedgerEndResponse as GrpcGetLedgerEndResponse,
} from "./generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    GetUpdatesRequest,
    GetUpdateByHashRequest as GrpcGetUpdateByHashRequest,
    GetUpdateByIdRequest as GrpcGetUpdateByIdRequest,
    GetUpdateByOffsetRequest as GrpcGetUpdateByOffsetRequest,
    GetUpdateResponse as GrpcGetUpdateResponse,
    GetUpdatesResponse,
    GetUpdatesPageRequest as GrpcGetUpdatesPageRequest,
    GetUpdatesPageResponse as GrpcGetUpdatesPageResponse,
} from "./generated/canton/com/daml/ledger/api/v2/update_service.js";
import { ListVettedPackagesRequest as GrpcListVettedPackagesRequest } from "./generated/canton/com/daml/ledger/api/v2/package_service.js";
import { HealthCheckRequest, HealthCheckResponse } from "./generated/canton/google/grpc/health/v1/health.js";
import {
    SubmitAndWaitRequest,
    SubmitAndWaitResponse,
} from "./generated/canton/com/daml/ledger/api/v2/command_service.js";
import {
    ExecuteSubmissionAndWaitRequest,
    ExecuteSubmissionAndWaitResponse,
    PrepareSubmissionRequest,
    PrepareSubmissionResponse,
} from "./generated/canton/com/daml/ledger/api/v2/interactive/interactive_submission_service.js";
import {
    ListKeyOwnersRequest as GrpcListKeyOwnersRequest,
    ListPartiesRequest as GrpcTopologyListPartiesRequest,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import {
    AddPartyAsyncRequest as GrpcAddPartyAsyncRequest,
    AddPartyAsyncResponse as GrpcAddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest as GrpcClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse as GrpcClearPartyOnboardingFlagResponse,
    GetHighestOffsetByTimestampRequest as GrpcGetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse as GrpcGetHighestOffsetByTimestampResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import {
    GetDarContentsRequest as GrpcGetDarContentsRequest,
    GetDarContentsResponse as GrpcGetDarContentsResponse,
    GetDarRequest as GrpcGetDarRequest,
    GetDarResponse as GrpcGetDarResponse,
    ListDarsRequest as GrpcListDarsRequest,
    ListDarsResponse as GrpcListDarsResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import {
    CountInFlightRequest as GrpcCountInFlightRequest,
    CountInFlightResponse as GrpcCountInFlightResponse,
    GetConfigForSlowCounterParticipantsRequest as GrpcGetConfigForSlowCounterParticipantsRequest,
    GetConfigForSlowCounterParticipantsResponse as GrpcGetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsRequest as GrpcGetIntervalsBehindForCounterParticipantsRequest,
    GetIntervalsBehindForCounterParticipantsResponse as GrpcGetIntervalsBehindForCounterParticipantsResponse,
    InspectCommitmentContractsRequest as GrpcInspectCommitmentContractsRequest,
    InspectCommitmentContractsResponse as GrpcInspectCommitmentContractsResponse,
    LookupReceivedAcsCommitmentsRequest as GrpcLookupReceivedAcsCommitmentsRequest,
    LookupReceivedAcsCommitmentsResponse as GrpcLookupReceivedAcsCommitmentsResponse,
    LookupOffsetByTimeRequest as GrpcLookupOffsetByTimeRequest,
    LookupOffsetByTimeResponse as GrpcLookupOffsetByTimeResponse,
    LookupSentAcsCommitmentsRequest as GrpcLookupSentAcsCommitmentsRequest,
    LookupSentAcsCommitmentsResponse as GrpcLookupSentAcsCommitmentsResponse,
    OpenCommitmentRequest as GrpcOpenCommitmentRequest,
    OpenCommitmentResponse as GrpcOpenCommitmentResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import {
    ListPendingOperationsRequest as GrpcListPendingOperationsRequest,
    ListPendingOperationsResponse as GrpcListPendingOperationsResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";
import {
    GetSafePruningOffsetRequest as GrpcGetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse as GrpcGetSafePruningOffsetResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import {
    CurrentTimeRequest as GrpcCurrentTimeRequest,
    CurrentTimeResponse as GrpcCurrentTimeResponse,
    GetIdRequest as GrpcGetIdRequest,
    GetIdResponse as GrpcGetIdResponse,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";
import {
    GetNoWaitCommitmentsFromRequest as GrpcGetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse as GrpcGetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleRequest as GrpcGetParticipantScheduleRequest,
    GetParticipantScheduleResponse as GrpcGetParticipantScheduleResponse,
    GetScheduleRequest as GrpcGetScheduleRequest,
    GetScheduleResponse as GrpcGetScheduleResponse,
} from "./generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import {
    GetSynchronizerIdRequest as GrpcGetSynchronizerIdRequest,
    GetSynchronizerIdResponse as GrpcGetSynchronizerIdResponse,
    ListConnectedSynchronizersRequest as GrpcListConnectedSynchronizersRequest,
    ListConnectedSynchronizersResponse as GrpcListConnectedSynchronizersResponse,
    ListRegisteredSynchronizersRequest as GrpcListRegisteredSynchronizersRequest,
    ListRegisteredSynchronizersResponse as GrpcListRegisteredSynchronizersResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import {
    TrafficControlStateRequest as GrpcTrafficControlStateRequest,
    TrafficControlStateResponse as GrpcTrafficControlStateResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";
import {
    ListAllRequest as GrpcTopologyListAllRequest,
    ListAllV2Request as GrpcTopologyListAllV2Request,
    ListAvailableStoresRequest as GrpcListAvailableStoresRequest,
    ListDecentralizedNamespaceDefinitionRequest as GrpcListDecentralizedNamespaceDefinitionRequest,
    ListLsuAnnouncementRequest as GrpcListLsuAnnouncementRequest,
    ListLsuSequencerConnectionSuccessorRequest as GrpcListLsuSequencerConnectionSuccessorRequest,
    ListMediatorSynchronizerStateRequest as GrpcListMediatorSynchronizerStateRequest,
    ListNamespaceDelegationRequest as GrpcListNamespaceDelegationRequest,
    ListOwnerToKeyMappingRequest as GrpcListOwnerToKeyMappingRequest,
    ListParticipantSynchronizerPermissionRequest as GrpcListParticipantSynchronizerPermissionRequest,
    ListPartyHostingLimitsRequest as GrpcListPartyHostingLimitsRequest,
    ListPartyToKeyMappingRequest as GrpcListPartyToKeyMappingRequest,
    ListPartyToParticipantRequest as GrpcListPartyToParticipantRequest,
    ListSequencerSynchronizerStateRequest as GrpcListSequencerSynchronizerStateRequest,
    ListSequencingParametersStateRequest as GrpcListSequencingParametersStateRequest,
    ListSynchronizerParametersStateRequest as GrpcListSynchronizerParametersStateRequest,
    ListSynchronizerTrustCertificateRequest as GrpcListSynchronizerTrustCertificateRequest,
    ListVettedPackagesRequest as GrpcTopologyListVettedPackagesRequest,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import { UploadDarFileRequest } from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import {
    GetCommandStatusRequest as GrpcGetCommandStatusRequest,
    GetCommandStatusResponse as GrpcGetCommandStatusResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import {
    GetIdentityProviderConfigRequest as GrpcGetIdentityProviderConfigRequest,
    GetIdentityProviderConfigResponse as GrpcGetIdentityProviderConfigResponse,
    ListIdentityProviderConfigsRequest as GrpcListIdentityProviderConfigsRequest,
    ListIdentityProviderConfigsResponse as GrpcListIdentityProviderConfigsResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";
import { ListKnownPackagesRequest as GrpcListKnownPackagesRequest, ListKnownPackagesResponse as GrpcListKnownPackagesResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import {
    AllocateExternalPartyRequest as GrpcAllocateExternalPartyRequest,
    AllocateExternalPartyResponse as GrpcAllocateExternalPartyResponse,
    AllocatePartyRequest,
    AllocatePartyResponse,
    GenerateExternalPartyTopologyRequest as GrpcGenerateExternalPartyTopologyRequest,
    GenerateExternalPartyTopologyResponse as GrpcGenerateExternalPartyTopologyResponse,
    GetParticipantIdRequest as GrpcGetParticipantIdRequest,
    GetParticipantIdResponse as GrpcGetParticipantIdResponse,
    GetPartiesRequest as GrpcGetPartiesRequest,
    GetPartiesResponse as GrpcGetPartiesResponse,
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import {
    GetUserRequest as GrpcGetUserRequest,
    GetUserResponse as GrpcGetUserResponse,
    GrantUserRightsRequest,
    GrantUserRightsResponse,
    ListUserRightsRequest as GrpcListUserRightsRequest,
    ListUserRightsResponse as GrpcListUserRightsResponse,
    ListUsersRequest as GrpcListUsersRequest,
    ListUsersResponse as GrpcListUsersResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { GetLedgerApiVersionResponse } from "./generated/canton/com/daml/ledger/api/v2/version_service.js";
import {
    GetResourceLimitsRequest as GrpcGetResourceLimitsRequest,
    GetResourceLimitsResponse as GrpcGetResourceLimitsResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";
import {
    buildGrpcCallOptionsAsync,
    createGrpcChannelCredentials,
} from "./grpc-call-options-factory.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";
import { IAuthProvider } from "../../core/auth/auth-provider.interface.js";

export interface GrpcOperations {
    disposeAsync?(): Promise<void>;
    checkHealthAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    getHealthAsync(options?: RequestOptions): Promise<unknown>;
    createPartyAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPartiesAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    generateExternalPartyTopologyAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    allocateExternalPartyAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantIdAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getPartiesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    grantUserRightsAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    getCommandStatusAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getUserAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listUsersAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listUserRightsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    uploadPackageAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    listKnownPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getIdentityProviderConfigAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listIdentityProviderConfigsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getPackageAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getPackageStatusAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listVettedPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listParticipantPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantPackageContentsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantPackageReferencesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantDarAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listParticipantDarsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantDarContentsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantStatusAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    lookupOffsetByTimeAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    openCommitmentAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    inspectCommitmentContractsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    countInFlightAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getConfigForSlowCounterParticipantsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getIntervalsBehindForCounterParticipantsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    lookupSentAcsCommitmentsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    lookupReceivedAcsCommitmentsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    addPartyAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    clearPartyOnboardingFlagAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getHighestOffsetByTimestampAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getSafePruningOffsetAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getPruningScheduleAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getParticipantPruningScheduleAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getNoWaitCommitmentsFromAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    trafficControlStateAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listConnectedSynchronizersAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getSynchronizerIdAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listRegisteredSynchronizersAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPendingOperationsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getResourceLimitsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getIdAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    currentTimeAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listNamespaceDelegationAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listDecentralizedNamespaceDefinitionAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listOwnerToKeyMappingAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPartyToKeyMappingAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listSynchronizerTrustCertificateAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listParticipantSynchronizerPermissionAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    authorizeTopologyTransactionsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    addTopologyTransactionsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    importTopologySnapshotAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    importTopologySnapshotV2Async?(request: unknown, options?: RequestOptions): Promise<unknown>;
    signTopologyTransactionsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    generateTopologyTransactionsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    createTemporaryTopologyStoreAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    dropTemporaryTopologyStoreAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPartyHostingLimitsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    topologyListVettedPackagesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listPartyToParticipantAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listSynchronizerParametersStateAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listSequencingParametersStateAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listMediatorSynchronizerStateAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listSequencerSynchronizerStateAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listLsuAnnouncementAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listLsuSequencerConnectionSuccessorAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listAvailableStoresAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listAllAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listAllV2Async?(request: unknown, options?: RequestOptions): Promise<unknown>;
    topologyListPartiesAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    listKeyOwnersAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getContractAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getEventsByContractIdAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    queryContractsAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    getConnectedSynchronizersAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getLedgerEndAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getLatestPrunedOffsetsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    streamTransactionsAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
    getUpdateByOffsetAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getUpdateByIdAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getUpdateByHashAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getUpdatesPageAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    getCompletionsAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    prepareSubmissionAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    executeSubmissionAndWaitAsync?(request: unknown, options?: RequestOptions): Promise<unknown>;
    submitCommandAsync(request: unknown, options?: RequestOptions): Promise<unknown>;
}

interface UnaryCallLike<TResponse> {
    response: Promise<TResponse>;
}

interface ServerStreamingCallLike<TResponse> {
    responses: AsyncIterable<TResponse>;
    status?: Promise<unknown>;
}

export interface GrpcOperationDependencies {
    versionServiceClient?: Pick<IVersionServiceClient, "getLedgerApiVersion">;
    healthClient?: Pick<IHealthClient, "check">;
    partyManagementServiceClient?: Pick<
        IPartyManagementServiceClient,
        | "allocateParty"
        | "listKnownParties"
        | "generateExternalPartyTopology"
        | "allocateExternalParty"
        | "getParticipantId"
        | "getParties"
    >;
    userManagementServiceClient?: Pick<
        IUserManagementServiceClient,
        "grantUserRights" | "getUser" | "listUsers" | "listUserRights"
    >;
    commandInspectionServiceClient?: Pick<
        ICommandInspectionServiceClient,
        "getCommandStatus"
    >;
    identityProviderConfigServiceClient?: Pick<
        IIdentityProviderConfigServiceClient,
        "getIdentityProviderConfig" | "listIdentityProviderConfigs"
    >;
    packageManagementServiceClient?: Pick<
        IPackageManagementServiceClient,
        "uploadDarFile" | "listKnownPackages"
    >;
    ledgerPackageServiceClient?: Pick<
        ILedgerPackageServiceClient,
        "listPackages" | "getPackage" | "getPackageStatus" | "listVettedPackages"
    >;
    participantPackageServiceClient?: Pick<
        IParticipantPackageServiceClient,
        | "listPackages"
        | "getPackageContents"
        | "getPackageReferences"
        | "getDar"
        | "listDars"
        | "getDarContents"
    >;
    participantInspectionServiceClient?: Pick<
        IParticipantInspectionServiceClient,
        | "lookupOffsetByTime"
        | "openCommitment"
        | "inspectCommitmentContracts"
        | "countInFlight"
        | "getConfigForSlowCounterParticipants"
        | "getIntervalsBehindForCounterParticipants"
        | "lookupSentAcsCommitments"
        | "lookupReceivedAcsCommitments"
    >;
    participantPartyManagementServiceClient?: Pick<
        IParticipantPartyManagementServiceClient,
        | "addPartyAsync"
        | "clearPartyOnboardingFlag"
        | "getHighestOffsetByTimestamp"
    >;
    participantRepairServiceClient?: Pick<
        IParticipantRepairServiceClient,
        "listPendingOperations"
    >;
    pruningServiceClient?: Pick<
        IPruningServiceClient,
        | "getSafePruningOffset"
        | "getSchedule"
        | "getParticipantSchedule"
        | "getNoWaitCommitmentsFrom"
    >;
    participantStatusServiceClient?: Pick<
        IParticipantStatusServiceClient,
        "participantStatus"
    >;
    synchronizerConnectivityServiceClient?: Pick<
        ISynchronizerConnectivityServiceClient,
        "listConnectedSynchronizers" | "getSynchronizerId" | "listRegisteredSynchronizers"
    >;
    trafficControlServiceClient?: Pick<
        ITrafficControlServiceClient,
        "trafficControlState"
    >;
    resourceManagementServiceClient?: Pick<
        IResourceManagementServiceClient,
        "getResourceLimits"
    >;
    identityInitializationServiceClient?: Pick<
        IIdentityInitializationServiceClient,
        "getId" | "currentTime"
    >;
    topologyManagerReadServiceClient?: Pick<
        ITopologyManagerReadServiceClient,
        "listNamespaceDelegation"
        | "listDecentralizedNamespaceDefinition"
        | "listOwnerToKeyMapping"
        | "listPartyToKeyMapping"
        | "listSynchronizerTrustCertificate"
        | "listParticipantSynchronizerPermission"
        | "listPartyHostingLimits"
        | "listVettedPackages"
        | "listPartyToParticipant"
        | "listSynchronizerParametersState"
        | "listSequencingParametersState"
        | "listMediatorSynchronizerState"
        | "listSequencerSynchronizerState"
        | "listLsuAnnouncement"
        | "listLsuSequencerConnectionSuccessor"
        | "listAvailableStores"
        | "listAll"
        | "listAllV2"
    >;
    topologyManagerWriteServiceClient?: Pick<
        ITopologyManagerWriteServiceClient,
        | "authorize"
        | "addTransactions"
        | "importTopologySnapshot"
        | "importTopologySnapshotV2"
        | "signTransactions"
        | "generateTransactions"
        | "createTemporaryTopologyStore"
        | "dropTemporaryTopologyStore"
    >;
    topologyAggregationServiceClient?: Pick<
        ITopologyAggregationServiceClient,
        "listParties" | "listKeyOwners"
    >;
    contractServiceClient?: Pick<IContractServiceClient, "getContract">;
    eventQueryServiceClient?: Pick<IEventQueryServiceClient, "getEventsByContractId">;
    stateServiceClient?: Pick<
        IStateServiceClient,
        "getActiveContractsPage" | "getConnectedSynchronizers" | "getLedgerEnd" | "getLatestPrunedOffsets"
    >;
    updateServiceClient?: Pick<
        IUpdateServiceClient,
        "getUpdates" | "getUpdateByOffset" | "getUpdateById" | "getUpdateByHash" | "getUpdatesPage"
    >;
    commandCompletionServiceClient?: Pick<ICommandCompletionServiceClient, "getCompletions">;
    interactiveSubmissionServiceClient?: Pick<
        IInteractiveSubmissionServiceClient,
        "prepareSubmission" | "executeSubmissionAndWait"
    >;
    commandServiceClient?: Pick<ICommandServiceClient, "submitAndWait">;
}

export function createGrpcOperations(
    options: CantonClientOptions,
    endpoint: string,
    grpcChannelSecurity: GrpcChannelSecurity,
    dependencies: GrpcOperationDependencies = {},
): GrpcOperations {
    const rpcTransport = new ProtobufGrpcTransport({
        host: normalizeGrpcHost(endpoint),
        channelCredentials: createGrpcChannelCredentials(
            grpcChannelSecurity,
        ),
        clientOptions:
            options.grpcConnectTimeoutMs === undefined
                ? undefined
                : {
                    connectTimeoutMs: options.grpcConnectTimeoutMs,
                },
    });

    const versionServiceClient =
        dependencies.versionServiceClient ?? new VersionServiceClient(rpcTransport);

    const healthClient = dependencies.healthClient ?? new HealthClient(rpcTransport);

    const partyManagementServiceClient =
        dependencies.partyManagementServiceClient
        ?? new PartyManagementServiceClient(rpcTransport);

    const userManagementServiceClient =
        dependencies.userManagementServiceClient
        ?? new UserManagementServiceClient(rpcTransport);

    const commandInspectionServiceClient =
        dependencies.commandInspectionServiceClient
        ?? new CommandInspectionServiceClient(rpcTransport);

    const identityProviderConfigServiceClient =
        dependencies.identityProviderConfigServiceClient
        ?? new IdentityProviderConfigServiceClient(rpcTransport);

    const packageManagementServiceClient =
        dependencies.packageManagementServiceClient
        ?? new PackageManagementServiceClient(rpcTransport);

    const ledgerPackageServiceClient =
        dependencies.ledgerPackageServiceClient
        ?? new LedgerPackageServiceClient(rpcTransport);

    const participantPackageServiceClient =
        dependencies.participantPackageServiceClient
        ?? new ParticipantPackageServiceClient(rpcTransport);

    const participantInspectionServiceClient =
        dependencies.participantInspectionServiceClient
        ?? new ParticipantInspectionServiceClient(rpcTransport);

    const participantPartyManagementServiceClient =
        dependencies.participantPartyManagementServiceClient
        ?? new ParticipantPartyManagementServiceClient(rpcTransport);

    const participantRepairServiceClient =
        dependencies.participantRepairServiceClient
        ?? new ParticipantRepairServiceClient(rpcTransport);

    const pruningServiceClient =
        dependencies.pruningServiceClient
        ?? new PruningServiceClient(rpcTransport);

    const participantStatusServiceClient =
        dependencies.participantStatusServiceClient
        ?? new ParticipantStatusServiceClient(rpcTransport);

    const resourceManagementServiceClient =
        dependencies.resourceManagementServiceClient
        ?? new ResourceManagementServiceClient(rpcTransport);

    const identityInitializationServiceClient =
        dependencies.identityInitializationServiceClient
        ?? new IdentityInitializationServiceClient(rpcTransport);

    const synchronizerConnectivityServiceClient =
        dependencies.synchronizerConnectivityServiceClient
        ?? new SynchronizerConnectivityServiceClient(rpcTransport);

    const trafficControlServiceClient =
        dependencies.trafficControlServiceClient
        ?? new TrafficControlServiceClient(rpcTransport);

    const topologyManagerReadServiceClient =
        dependencies.topologyManagerReadServiceClient
        ?? new TopologyManagerReadServiceClient(rpcTransport);

    const topologyManagerWriteServiceClient =
        dependencies.topologyManagerWriteServiceClient
        ?? new TopologyManagerWriteServiceClient(rpcTransport);

    const topologyAggregationServiceClient =
        dependencies.topologyAggregationServiceClient
        ?? new TopologyAggregationServiceClient(rpcTransport);

    const contractServiceClient =
        dependencies.contractServiceClient
        ?? new ContractServiceClient(rpcTransport);

    const eventQueryServiceClient =
        dependencies.eventQueryServiceClient
        ?? new EventQueryServiceClient(rpcTransport);

    const stateServiceClient =
        dependencies.stateServiceClient ?? new StateServiceClient(rpcTransport);

    const updateServiceClient =
        dependencies.updateServiceClient ?? new UpdateServiceClient(rpcTransport);

    const commandCompletionServiceClient =
        dependencies.commandCompletionServiceClient
        ?? new CommandCompletionServiceClient(rpcTransport);

    const interactiveSubmissionServiceClient =
        dependencies.interactiveSubmissionServiceClient
        ?? new InteractiveSubmissionServiceClient(rpcTransport);

    const commandServiceClient =
        dependencies.commandServiceClient
        ?? new CommandServiceClient(rpcTransport);

    return {
        async disposeAsync(): Promise<void> {
            rpcTransport.close();
        },
        async checkHealthAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<HealthCheckResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                healthClient.check(request as HealthCheckRequest, callOptions),
            );
        },
        async getHealthAsync(
            requestOptions?: RequestOptions,
        ): Promise<GetLedgerApiVersionResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                versionServiceClient.getLedgerApiVersion({}, callOptions),
            );
        },
        async createPartyAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<AllocatePartyResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.allocateParty(
                    request as AllocatePartyRequest,
                    callOptions,
                ),
            );
        },
        async listPartiesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<ListKnownPartiesResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.listKnownParties(
                    request as ListKnownPartiesRequest,
                    callOptions,
                ),
            );
        },
        async generateExternalPartyTopologyAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGenerateExternalPartyTopologyResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.generateExternalPartyTopology(
                    request as GrpcGenerateExternalPartyTopologyRequest,
                    callOptions,
                ),
            );
        },
        async allocateExternalPartyAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcAllocateExternalPartyResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.allocateExternalParty(
                    request as GrpcAllocateExternalPartyRequest,
                    callOptions,
                ),
            );
        },
        async getParticipantIdAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetParticipantIdResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.getParticipantId(
                    request as GrpcGetParticipantIdRequest,
                    callOptions,
                ),
            );
        },
        async getPartiesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetPartiesResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                partyManagementServiceClient.getParties(
                    request as GrpcGetPartiesRequest,
                    callOptions,
                ),
            );
        },
        async grantUserRightsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrantUserRightsResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                userManagementServiceClient.grantUserRights(
                    request as GrantUserRightsRequest,
                    callOptions,
                ),
            );
        },
        async getCommandStatusAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetCommandStatusResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                commandInspectionServiceClient.getCommandStatus(
                    request as GrpcGetCommandStatusRequest,
                    callOptions,
                ),
            );
        },
        async getUserAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetUserResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                userManagementServiceClient.getUser(
                    request as GrpcGetUserRequest,
                    callOptions,
                ),
            );
        },
        async listUsersAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListUsersResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                userManagementServiceClient.listUsers(
                    request as GrpcListUsersRequest,
                    callOptions,
                ),
            );
        },
        async listUserRightsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListUserRightsResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                userManagementServiceClient.listUserRights(
                    request as GrpcListUserRightsRequest,
                    callOptions,
                ),
            );
        },
        async uploadPackageAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                packageManagementServiceClient.uploadDarFile(
                    request as UploadDarFileRequest,
                    callOptions,
                ),
            );
        },
        async listKnownPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListKnownPackagesResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                packageManagementServiceClient.listKnownPackages(
                    request as GrpcListKnownPackagesRequest,
                    callOptions,
                ),
            );
        },
        async getIdentityProviderConfigAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetIdentityProviderConfigResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                identityProviderConfigServiceClient.getIdentityProviderConfig(
                    request as GrpcGetIdentityProviderConfigRequest,
                    callOptions,
                ),
            );
        },
        async listIdentityProviderConfigsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListIdentityProviderConfigsResponse> {
            const callOptions =
                await buildCallOptionsForLedgerAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                identityProviderConfigServiceClient.listIdentityProviderConfigs(
                    request as GrpcListIdentityProviderConfigsRequest,
                    callOptions,
                ),
            );
        },
        async listPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.listPackages(
                    request as Record<string, never>,
                    callOptions,
                ),
            );
        },
        async getPackageAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.getPackage(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async getPackageStatusAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.getPackageStatus(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async listVettedPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                ledgerPackageServiceClient.listVettedPackages(
                    request as GrpcListVettedPackagesRequest,
                    callOptions,
                ),
            );
        },
        async listParticipantPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.listPackages(
                    request as {
                        limit: number;
                        filterName: string;
                    },
                    callOptions,
                ),
            );
        },
        async getParticipantPackageContentsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.getPackageContents(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async getParticipantPackageReferencesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.getPackageReferences(
                    request as { packageId: string },
                    callOptions,
                ),
            );
        },
        async getParticipantDarAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetDarResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.getDar(
                    request as GrpcGetDarRequest,
                    callOptions,
                ),
            );
        },
        async listParticipantDarsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListDarsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.listDars(
                    request as GrpcListDarsRequest,
                    callOptions,
                ),
            );
        },
        async getParticipantDarContentsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetDarContentsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPackageServiceClient.getDarContents(
                    request as GrpcGetDarContentsRequest,
                    callOptions,
                ),
            );
        },
        async getParticipantStatusAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantStatusServiceClient.participantStatus(
                    request as Record<string, never>,
                    callOptions,
                ),
            );
        },
        async lookupOffsetByTimeAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcLookupOffsetByTimeResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantInspectionServiceClient.lookupOffsetByTime(
                    request as GrpcLookupOffsetByTimeRequest,
                    callOptions,
                ),
            );
        },
        async openCommitmentAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcOpenCommitmentResponse[]> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await collectServerResponsesAsync(
                participantInspectionServiceClient.openCommitment(
                    request as GrpcOpenCommitmentRequest,
                    callOptions,
                ),
            );
        },
        async inspectCommitmentContractsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcInspectCommitmentContractsResponse[]> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await collectServerResponsesAsync(
                participantInspectionServiceClient.inspectCommitmentContracts(
                    request as GrpcInspectCommitmentContractsRequest,
                    callOptions,
                ),
            );
        },
        async countInFlightAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcCountInFlightResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantInspectionServiceClient.countInFlight(
                    request as GrpcCountInFlightRequest,
                    callOptions,
                ),
            );
        },
        async getConfigForSlowCounterParticipantsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetConfigForSlowCounterParticipantsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantInspectionServiceClient.getConfigForSlowCounterParticipants(
                    request as GrpcGetConfigForSlowCounterParticipantsRequest,
                    callOptions,
                ),
            );
        },
        async getIntervalsBehindForCounterParticipantsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetIntervalsBehindForCounterParticipantsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantInspectionServiceClient.getIntervalsBehindForCounterParticipants(
                    request as GrpcGetIntervalsBehindForCounterParticipantsRequest,
                    callOptions,
                ),
            );
        },
        async lookupSentAcsCommitmentsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcLookupSentAcsCommitmentsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantInspectionServiceClient.lookupSentAcsCommitments(
                    request as GrpcLookupSentAcsCommitmentsRequest,
                    callOptions,
                ),
            );
        },
        async lookupReceivedAcsCommitmentsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcLookupReceivedAcsCommitmentsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantInspectionServiceClient.lookupReceivedAcsCommitments(
                    request as GrpcLookupReceivedAcsCommitmentsRequest,
                    callOptions,
                ),
            );
        },
        async addPartyAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcAddPartyAsyncResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPartyManagementServiceClient.addPartyAsync(
                    request as GrpcAddPartyAsyncRequest,
                    callOptions,
                ),
            );
        },
        async clearPartyOnboardingFlagAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcClearPartyOnboardingFlagResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPartyManagementServiceClient.clearPartyOnboardingFlag(
                    request as GrpcClearPartyOnboardingFlagRequest,
                    callOptions,
                ),
            );
        },
        async getHighestOffsetByTimestampAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetHighestOffsetByTimestampResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantPartyManagementServiceClient.getHighestOffsetByTimestamp(
                    request as GrpcGetHighestOffsetByTimestampRequest,
                    callOptions,
                ),
            );
        },
        async getSafePruningOffsetAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetSafePruningOffsetResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                pruningServiceClient.getSafePruningOffset(
                    request as GrpcGetSafePruningOffsetRequest,
                    callOptions,
                ),
            );
        },
        async getPruningScheduleAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetScheduleResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                pruningServiceClient.getSchedule(
                    request as GrpcGetScheduleRequest,
                    callOptions,
                ),
            );
        },
        async getParticipantPruningScheduleAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetParticipantScheduleResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                pruningServiceClient.getParticipantSchedule(
                    request as GrpcGetParticipantScheduleRequest,
                    callOptions,
                ),
            );
        },
        async getNoWaitCommitmentsFromAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetNoWaitCommitmentsFromResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                pruningServiceClient.getNoWaitCommitmentsFrom(
                    request as GrpcGetNoWaitCommitmentsFromRequest,
                    callOptions,
                ),
            );
        },
        async trafficControlStateAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcTrafficControlStateResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                trafficControlServiceClient.trafficControlState(
                    request as GrpcTrafficControlStateRequest,
                    callOptions,
                ),
            );
        },
        async listConnectedSynchronizersAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListConnectedSynchronizersResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                synchronizerConnectivityServiceClient.listConnectedSynchronizers(
                    request as GrpcListConnectedSynchronizersRequest,
                    callOptions,
                ),
            );
        },
        async getSynchronizerIdAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetSynchronizerIdResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                synchronizerConnectivityServiceClient.getSynchronizerId(
                    request as GrpcGetSynchronizerIdRequest,
                    callOptions,
                ),
            );
        },
        async listRegisteredSynchronizersAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListRegisteredSynchronizersResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                synchronizerConnectivityServiceClient.listRegisteredSynchronizers(
                    request as GrpcListRegisteredSynchronizersRequest,
                    callOptions,
                ),
            );
        },
        async listPendingOperationsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcListPendingOperationsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                participantRepairServiceClient.listPendingOperations(
                    request as GrpcListPendingOperationsRequest,
                    callOptions,
                ),
            );
        },
        async getResourceLimitsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetResourceLimitsResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                resourceManagementServiceClient.getResourceLimits(
                    request as GrpcGetResourceLimitsRequest,
                    callOptions,
                ),
            );
        },
        async getIdAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetIdResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                identityInitializationServiceClient.getId(
                    request as GrpcGetIdRequest,
                    callOptions,
                ),
            );
        },
        async currentTimeAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcCurrentTimeResponse> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                identityInitializationServiceClient.currentTime(
                    request as GrpcCurrentTimeRequest,
                    callOptions,
                ),
            );
        },
        async listNamespaceDelegationAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listNamespaceDelegation(
                    request as GrpcListNamespaceDelegationRequest,
                    callOptions,
                ),
            );
        },
        async listDecentralizedNamespaceDefinitionAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listDecentralizedNamespaceDefinition(
                    request as GrpcListDecentralizedNamespaceDefinitionRequest,
                    callOptions,
                ),
            );
        },
        async listOwnerToKeyMappingAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listOwnerToKeyMapping(
                    request as GrpcListOwnerToKeyMappingRequest,
                    callOptions,
                ),
            );
        },
        async listPartyToKeyMappingAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listPartyToKeyMapping(
                    request as GrpcListPartyToKeyMappingRequest,
                    callOptions,
                ),
            );
        },
        async listSynchronizerTrustCertificateAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listSynchronizerTrustCertificate(
                    request as GrpcListSynchronizerTrustCertificateRequest,
                    callOptions,
                ),
            );
        },
        async listParticipantSynchronizerPermissionAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listParticipantSynchronizerPermission(
                    request as GrpcListParticipantSynchronizerPermissionRequest,
                    callOptions,
                ),
            );
        },
        async listPartyHostingLimitsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listPartyHostingLimits(
                    request as GrpcListPartyHostingLimitsRequest,
                    callOptions,
                ),
            );
        },
        async topologyListVettedPackagesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listVettedPackages(
                    request as GrpcTopologyListVettedPackagesRequest,
                    callOptions,
                ),
            );
        },
        async listPartyToParticipantAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listPartyToParticipant(
                    request as GrpcListPartyToParticipantRequest,
                    callOptions,
                ),
            );
        },
        async listSynchronizerParametersStateAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listSynchronizerParametersState(
                    request as GrpcListSynchronizerParametersStateRequest,
                    callOptions,
                ),
            );
        },
        async listSequencingParametersStateAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listSequencingParametersState(
                    request as GrpcListSequencingParametersStateRequest,
                    callOptions,
                ),
            );
        },
        async listMediatorSynchronizerStateAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listMediatorSynchronizerState(
                    request as GrpcListMediatorSynchronizerStateRequest,
                    callOptions,
                ),
            );
        },
        async listSequencerSynchronizerStateAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listSequencerSynchronizerState(
                    request as GrpcListSequencerSynchronizerStateRequest,
                    callOptions,
                ),
            );
        },
        async listLsuAnnouncementAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listLsuAnnouncement(
                    request as GrpcListLsuAnnouncementRequest,
                    callOptions,
                ),
            );
        },
        async listLsuSequencerConnectionSuccessorAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listLsuSequencerConnectionSuccessor(
                    request as GrpcListLsuSequencerConnectionSuccessorRequest,
                    callOptions,
                ),
            );
        },
        async listAvailableStoresAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listAvailableStores(
                    request as GrpcListAvailableStoresRequest,
                    callOptions,
                ),
            );
        },
        async listAllAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listAll(
                    request as GrpcTopologyListAllRequest,
                    callOptions,
                ),
            );
        },
        async listAllV2Async(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerReadServiceClient.listAllV2(
                    request as GrpcTopologyListAllV2Request,
                    callOptions,
                ),
            );
        },
        async authorizeTopologyTransactionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerWriteServiceClient.authorize(
                    request as never,
                    callOptions,
                ),
            );
        },
        async addTopologyTransactionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerWriteServiceClient.addTransactions(
                    request as never,
                    callOptions,
                ),
            );
        },
        async importTopologySnapshotAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await sendClientStreamRequestAndReadResponseAsync(
                topologyManagerWriteServiceClient.importTopologySnapshot(
                    callOptions,
                ),
                request,
            );
        },
        async importTopologySnapshotV2Async(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await sendClientStreamRequestAndReadResponseAsync(
                topologyManagerWriteServiceClient.importTopologySnapshotV2(
                    callOptions,
                ),
                request,
            );
        },
        async signTopologyTransactionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerWriteServiceClient.signTransactions(
                    request as never,
                    callOptions,
                ),
            );
        },
        async generateTopologyTransactionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerWriteServiceClient.generateTransactions(
                    request as never,
                    callOptions,
                ),
            );
        },
        async createTemporaryTopologyStoreAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerWriteServiceClient.createTemporaryTopologyStore(
                    request as never,
                    callOptions,
                ),
            );
        },
        async dropTemporaryTopologyStoreAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyManagerWriteServiceClient.dropTemporaryTopologyStore(
                    request as never,
                    callOptions,
                ),
            );
        },
        async topologyListPartiesAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyAggregationServiceClient.listParties(
                    request as GrpcTopologyListPartiesRequest,
                    callOptions,
                ),
            );
        },
        async listKeyOwnersAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<unknown> {
            const callOptions =
                await buildCallOptionsForParticipantAdminSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                topologyAggregationServiceClient.listKeyOwners(
                    request as GrpcListKeyOwnersRequest,
                    callOptions,
                ),
            );
        },
        async getContractAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetContractResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                contractServiceClient.getContract(
                    request as GrpcGetContractRequest,
                    callOptions,
                ),
            );
        },
        async getEventsByContractIdAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetEventsByContractIdResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                eventQueryServiceClient.getEventsByContractId(
                    request as GrpcGetEventsByContractIdRequest,
                    callOptions,
                ),
            );
        },
        async queryContractsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GetActiveContractsPageResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                stateServiceClient.getActiveContractsPage(
                    request as GetActiveContractsPageRequest,
                    callOptions,
                ),
            );
        },
        async getConnectedSynchronizersAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetConnectedSynchronizersResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                stateServiceClient.getConnectedSynchronizers(
                    request as GrpcGetConnectedSynchronizersRequest,
                    callOptions,
                ),
            );
        },
        async getLedgerEndAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetLedgerEndResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                stateServiceClient.getLedgerEnd(
                    request as GrpcGetLedgerEndRequest,
                    callOptions,
                ),
            );
        },
        async getLatestPrunedOffsetsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetLatestPrunedOffsetsResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                stateServiceClient.getLatestPrunedOffsets(
                    request as GrpcGetLatestPrunedOffsetsRequest,
                    callOptions,
                ),
            );
        },
        async streamTransactionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GetUpdatesResponse[]> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await collectServerResponsesAsync(
                updateServiceClient.getUpdates(
                    request as GetUpdatesRequest,
                    callOptions,
                ),
            );
        },
        async getUpdateByOffsetAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetUpdateResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                updateServiceClient.getUpdateByOffset(
                    request as GrpcGetUpdateByOffsetRequest,
                    callOptions,
                ),
            );
        },
        async getUpdateByIdAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetUpdateResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                updateServiceClient.getUpdateById(
                    request as GrpcGetUpdateByIdRequest,
                    callOptions,
                ),
            );
        },
        async getUpdateByHashAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetUpdateResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                updateServiceClient.getUpdateByHash(
                    request as GrpcGetUpdateByHashRequest,
                    callOptions,
                ),
            );
        },
        async getUpdatesPageAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcGetUpdatesPageResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                updateServiceClient.getUpdatesPage(
                    request as GrpcGetUpdatesPageRequest,
                    callOptions,
                ),
            );
        },
        async getCompletionsAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<GrpcCompletionStreamResponse[]> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await collectServerResponsesAsync(
                commandCompletionServiceClient.getCompletions(
                    request as GrpcGetCompletionsRequest,
                    callOptions,
                ),
            );
        },
        async submitCommandAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<SubmitAndWaitResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                commandServiceClient.submitAndWait(
                    request as SubmitAndWaitRequest,
                    callOptions,
                ),
            );
        },
        async prepareSubmissionAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<PrepareSubmissionResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                interactiveSubmissionServiceClient.prepareSubmission(
                    request as PrepareSubmissionRequest,
                    callOptions,
                ),
            );
        },
        async executeSubmissionAndWaitAsync(
            request: unknown,
            requestOptions?: RequestOptions,
        ): Promise<ExecuteSubmissionAndWaitResponse> {
            const callOptions =
                await buildCallOptionsForLedgerSurfaceAsync(
                    options,
                    requestOptions,
                );

            return await unwrapUnaryResponse(
                interactiveSubmissionServiceClient.executeSubmissionAndWait(
                    request as ExecuteSubmissionAndWaitRequest,
                    callOptions,
                ),
            );
        },
    };
}

async function buildCallOptionsForLedgerSurfaceAsync(
    options: CantonClientOptions,
    requestOptions?: RequestOptions,
) {
    return buildGrpcCallOptionsAsync(
        options.ledgerAuthProvider,
        options.defaultRequestTimeoutMs,
        requestOptions,
    );
}

async function buildCallOptionsForLedgerAdminSurfaceAsync(
    options: CantonClientOptions,
    requestOptions?: RequestOptions,
) {
    return buildGrpcCallOptionsAsync(
        options.ledgerAdminAuthProvider,
        options.defaultRequestTimeoutMs,
        requestOptions,
    );
}

async function buildCallOptionsForParticipantAdminSurfaceAsync(
    options: CantonClientOptions,
    requestOptions?: RequestOptions,
) {
    return buildGrpcCallOptionsAsync(
        options.participantAdminAuthProvider,
        options.defaultRequestTimeoutMs,
        requestOptions,
    );
}

function normalizeGrpcHost(endpoint: string): string {
    if (endpoint.includes("://")) {
        return new URL(endpoint).host;
    }

    return endpoint;
}

async function unwrapUnaryResponse<TResponse>(
    call: UnaryCallLike<TResponse>,
): Promise<TResponse> {
    return await call.response;
}

async function sendClientStreamRequestAndReadResponseAsync<TRequest, TResponse>(
    call: any,
    request: TRequest,
): Promise<TResponse> {
    await call.requests.send(request);
    await call.requests.complete();

    return await call.response;
}

async function collectServerResponsesAsync<TResponse>(
    call: ServerStreamingCallLike<TResponse>,
): Promise<TResponse[]> {
    const responses: TResponse[] = [];

    for await (const response of call.responses) {
        responses.push(response);
    }

    await call.status;

    return responses;
}
