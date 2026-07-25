import { randomUUID } from "node:crypto";
import { CantonClientOptions } from "../../client/canton-client-options.js";
import { ValidationError } from "../../core/errors/validation-error.js";
import { AllocateExternalPartyRequest } from "../../core/types/requests/allocate-external-party-request.js";
import { AllocatePartyRequest } from "../../core/types/requests/allocate-party-request.js";
import { AddPartyAsyncRequest } from "../../core/types/requests/add-party-async-request.js";
import { CountInFlightRequest } from "../../core/types/requests/count-in-flight-request.js";
import { ClearPartyOnboardingFlagRequest } from "../../core/types/requests/clear-party-onboarding-flag-request.js";
import { GetDarContentsRequest } from "../../core/types/requests/get-dar-contents-request.js";
import { GetDarRequest } from "../../core/types/requests/get-dar-request.js";
import { GetActiveContractsRequest } from "../../core/types/requests/get-active-contracts-request.js";
import { GetConfigForSlowCounterParticipantsRequest } from "../../core/types/requests/get-config-for-slow-counter-participants-request.js";
import { GetHighestOffsetByTimestampRequest } from "../../core/types/requests/get-highest-offset-by-timestamp-request.js";
import { GetIntervalsBehindForCounterParticipantsRequest } from "../../core/types/requests/get-intervals-behind-for-counter-participants-request.js";
import { InspectCommitmentContractsRequest } from "../../core/types/requests/inspect-commitment-contracts-request.js";
import { GetNoWaitCommitmentsFromRequest } from "../../core/types/requests/get-no-wait-commitments-from-request.js";
import { GetPackageContentsRequest } from "../../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../../core/types/requests/get-package-references-request.js";
import { GetParticipantPruningScheduleRequest } from "../../core/types/requests/get-participant-pruning-schedule-request.js";
import { GetPruningScheduleRequest } from "../../core/types/requests/get-pruning-schedule-request.js";
import { GetResourceLimitsRequest } from "../../core/types/requests/get-resource-limits-request.js";
import { GetSafePruningOffsetRequest } from "../../core/types/requests/get-safe-pruning-offset-request.js";
import { GetSynchronizerIdRequest } from "../../core/types/requests/get-synchronizer-id-request.js";
import { GenerateExternalPartyTopologyRequest } from "../../core/types/requests/generate-external-party-topology-request.js";
import { ListAllRequest } from "../../core/types/requests/list-all-request.js";
import { ListAllV2Request } from "../../core/types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../../core/types/requests/list-available-stores-request.js";
import { ListConnectedSynchronizersRequest } from "../../core/types/requests/list-connected-synchronizers-request.js";
import { ListDecentralizedNamespaceDefinitionRequest } from "../../core/types/requests/list-decentralized-namespace-definition-request.js";
import { ListKeyOwnersRequest } from "../../core/types/requests/list-key-owners-request.js";
import { ListLsuAnnouncementRequest } from "../../core/types/requests/list-lsu-announcement-request.js";
import { ListLsuSequencerConnectionSuccessorRequest } from "../../core/types/requests/list-lsu-sequencer-connection-successor-request.js";
import { ListMediatorSynchronizerStateRequest } from "../../core/types/requests/list-mediator-synchronizer-state-request.js";
import { ListKnownPartiesRequest } from "../../core/types/requests/list-known-parties-request.js";
import { ListDarsRequest } from "../../core/types/requests/list-dars-request.js";
import { ListNamespaceDelegationRequest } from "../../core/types/requests/list-namespace-delegation-request.js";
import { ListOwnerToKeyMappingRequest } from "../../core/types/requests/list-owner-to-key-mapping-request.js";
import { ListParticipantSynchronizerPermissionRequest } from "../../core/types/requests/list-participant-synchronizer-permission-request.js";
import { ParticipantListPackagesRequest } from "../../core/types/requests/participant-list-packages-request.js";
import { ListPendingOperationsRequest } from "../../core/types/requests/list-pending-operations-request.js";
import { ListRegisteredSynchronizersRequest } from "../../core/types/requests/list-registered-synchronizers-request.js";
import { LookupReceivedAcsCommitmentsRequest } from "../../core/types/requests/lookup-received-acs-commitments-request.js";
import { LookupSentAcsCommitmentsRequest } from "../../core/types/requests/lookup-sent-acs-commitments-request.js";
import { LookupOffsetByTimeRequest } from "../../core/types/requests/lookup-offset-by-time-request.js";
import { OpenCommitmentRequest } from "../../core/types/requests/open-commitment-request.js";
import { ListPartyHostingLimitsRequest } from "../../core/types/requests/list-party-hosting-limits-request.js";
import { ListPartyToKeyMappingRequest } from "../../core/types/requests/list-party-to-key-mapping-request.js";
import { ListPartyToParticipantRequest } from "../../core/types/requests/list-party-to-participant-request.js";
import { ListSequencerSynchronizerStateRequest } from "../../core/types/requests/list-sequencer-synchronizer-state-request.js";
import { ListSequencingParametersStateRequest } from "../../core/types/requests/list-sequencing-parameters-state-request.js";
import { ListSynchronizerParametersStateRequest } from "../../core/types/requests/list-synchronizer-parameters-state-request.js";
import { ListSynchronizerTrustCertificateRequest } from "../../core/types/requests/list-synchronizer-trust-certificate-request.js";
import { SubmitCommandRequest } from "../../core/types/requests/submit-command-request.js";
import { TopologyListPartiesRequest } from "../../core/types/requests/topology-list-parties-request.js";
import { TopologyListVettedPackagesRequest } from "../../core/types/requests/topology-list-vetted-packages-request.js";
import { TrafficControlStateRequest } from "../../core/types/requests/traffic-control-state-request.js";
import { CommandSigners, ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { SignCommandRequest } from "../../core/signing/sign-command-request.js";
import { SignCommandResult } from "../../core/signing/sign-command-result.js";
import { PreparedCommandSubmission } from "../../core/types/prepared-command-submission.js";
import { AllocatePartyResponse as SdkAllocatePartyResponse } from "../../core/types/responses/allocate-party-response.js";
import { AllocateExternalPartyResponse } from "../../core/types/responses/allocate-external-party-response.js";
import { AddPartyAsyncResponse } from "../../core/types/responses/add-party-async-response.js";
import { GetPackageContentsResponse } from "../../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../../core/types/responses/get-package-references-response.js";
import { CountInFlightResponse } from "../../core/types/responses/count-in-flight-response.js";
import { GetDarContentsResponse } from "../../core/types/responses/get-dar-contents-response.js";
import { GetDarResponse } from "../../core/types/responses/get-dar-response.js";
import { GetConfigForSlowCounterParticipantsResponse } from "../../core/types/responses/get-config-for-slow-counter-participants-response.js";
import { GetHighestOffsetByTimestampResponse } from "../../core/types/responses/get-highest-offset-by-timestamp-response.js";
import { GetIntervalsBehindForCounterParticipantsResponse } from "../../core/types/responses/get-intervals-behind-for-counter-participants-response.js";
import { InspectCommitmentContractsResponse } from "../../core/types/responses/inspect-commitment-contracts-response.js";
import { GetNoWaitCommitmentsFromResponse } from "../../core/types/responses/get-no-wait-commitments-from-response.js";
import { GetParticipantPruningScheduleResponse } from "../../core/types/responses/get-participant-pruning-schedule-response.js";
import { GetPruningScheduleResponse } from "../../core/types/responses/get-pruning-schedule-response.js";
import { GetResourceLimitsResponse } from "../../core/types/responses/get-resource-limits-response.js";
import { GetSafePruningOffsetResponse } from "../../core/types/responses/get-safe-pruning-offset-response.js";
import { GetSynchronizerIdResponse } from "../../core/types/responses/get-synchronizer-id-response.js";
import { GenerateExternalPartyTopologyResponse } from "../../core/types/responses/generate-external-party-topology-response.js";
import { ClearPartyOnboardingFlagResponse } from "../../core/types/responses/clear-party-onboarding-flag-response.js";
import { ListAllResponse } from "../../core/types/responses/list-all-response.js";
import { ListAllV2Response } from "../../core/types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../../core/types/responses/list-available-stores-response.js";
import { ListConnectedSynchronizersResponse } from "../../core/types/responses/list-connected-synchronizers-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../../core/types/responses/list-decentralized-namespace-definition-response.js";
import { ListKeyOwnersResponse } from "../../core/types/responses/list-key-owners-response.js";
import { ListDarsResponse } from "../../core/types/responses/list-dars-response.js";
import { ListKnownPartiesResponse as SdkListKnownPartiesResponse } from "../../core/types/responses/list-known-parties-response.js";
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
import { ListPendingOperationsResponse } from "../../core/types/responses/list-pending-operations-response.js";
import { ListRegisteredSynchronizersResponse } from "../../core/types/responses/list-registered-synchronizers-response.js";
import { LookupReceivedAcsCommitmentsResponse } from "../../core/types/responses/lookup-received-acs-commitments-response.js";
import { LookupSentAcsCommitmentsResponse } from "../../core/types/responses/lookup-sent-acs-commitments-response.js";
import { LookupOffsetByTimeResponse } from "../../core/types/responses/lookup-offset-by-time-response.js";
import { OpenCommitmentResponse } from "../../core/types/responses/open-commitment-response.js";
import { ParticipantListPackagesResponse } from "../../core/types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../../core/types/responses/submit-command-response.js";
import { TopologyListPartiesResponse } from "../../core/types/responses/topology-list-parties-response.js";
import { TopologyListVettedPackagesResponse } from "../../core/types/responses/topology-list-vetted-packages-response.js";
import { TrafficControlStateResponse } from "../../core/types/responses/traffic-control-state-response.js";
import { NotSupportedError } from "../../core/errors/not-supported-error.js";
import { TransportError } from "../../core/errors/transport-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";
import {
    createGrpcOperations,
    GrpcOperations,
} from "./grpc-channel-factory.js";
import {
    mapGrpcSubmitCommand,
    mapGrpcSubmitCommandForTransactionRequest,
    mapGrpcSubmitCommandTransaction,
    mapGrpcSubmitCommandRequest,
} from "./mappers/commands-mapper.js";
import {
    mapGrpcExecuteSubmissionAndWaitRequest,
    mapGrpcInteractiveSubmitCommand,
    mapGrpcPrepareSubmissionRequest,
} from "./mappers/interactive-command-mapper.js";
import {
    mapGrpcQueryContracts,
    mapGrpcQueryContractsRequest,
} from "./mappers/contracts-mapper.js";
import {
} from "./mappers/event-query-mapper.js";
import {
    mapGrpcAllocateExternalPartyRequest,
    mapGrpcAllocateExternalPartyResponse,
    mapGrpcGenerateExternalPartyTopologyRequest,
    mapGrpcGenerateExternalPartyTopologyResponse,
} from "./mappers/external-party-management-mapper.js";
import {
} from "./mappers/identity-provider-config-mapper.js";
import {
    mapGrpcGetParticipantPackageContents,
    mapGrpcGetParticipantPackageContentsRequest,
    mapGrpcGetParticipantDar,
    mapGrpcGetParticipantDarContents,
    mapGrpcGetParticipantDarContentsRequest,
    mapGrpcGetParticipantDarRequest,
    mapGrpcGetParticipantPackageReferences,
    mapGrpcGetParticipantPackageReferencesRequest,
    mapGrpcListParticipantDars,
    mapGrpcListParticipantDarsRequest,
    mapGrpcParticipantListPackages,
    mapGrpcParticipantListPackagesRequest,
} from "./mappers/packages-mapper.js";
import {
} from "./mappers/participant-status-mapper.js";
import {
    mapGrpcCountInFlight,
    mapGrpcCountInFlightRequest,
    mapGrpcGetConfigForSlowCounterParticipants,
    mapGrpcGetConfigForSlowCounterParticipantsRequest,
    mapGrpcGetIntervalsBehindForCounterParticipants,
    mapGrpcGetIntervalsBehindForCounterParticipantsRequest,
    mapGrpcInspectCommitmentContracts,
    mapGrpcInspectCommitmentContractsRequest,
    mapGrpcLookupReceivedAcsCommitments,
    mapGrpcLookupReceivedAcsCommitmentsRequest,
    mapGrpcLookupOffsetByTime,
    mapGrpcLookupOffsetByTimeRequest,
    mapGrpcLookupSentAcsCommitments,
    mapGrpcLookupSentAcsCommitmentsRequest,
    mapGrpcOpenCommitment,
    mapGrpcOpenCommitmentRequest,
} from "./mappers/participant-inspection-mapper.js";
import {
    mapGrpcAddPartyAsyncRequest,
    mapGrpcAddPartyAsyncResponse,
    mapGrpcClearPartyOnboardingFlagRequest,
    mapGrpcClearPartyOnboardingFlagResponse,
    mapGrpcGetHighestOffsetByTimestamp,
    mapGrpcGetHighestOffsetByTimestampRequest,
} from "./mappers/participant-party-management-mapper.js";
import {
    mapGrpcListPendingOperations,
    mapGrpcListPendingOperationsRequest,
} from "./mappers/participant-repair-mapper.js";
import {
    mapGrpcGetNoWaitCommitmentsFrom,
    mapGrpcGetNoWaitCommitmentsFromRequest,
    mapGrpcGetParticipantPruningSchedule,
    mapGrpcGetParticipantPruningScheduleRequest,
    mapGrpcGetPruningSchedule,
    mapGrpcGetPruningScheduleRequest,
    mapGrpcGetSafePruningOffset,
    mapGrpcGetSafePruningOffsetRequest,
} from "./mappers/pruning-mapper.js";
import {
    mapGrpcGetSynchronizerId,
    mapGrpcGetSynchronizerIdRequest,
    mapGrpcListConnectedSynchronizers,
    mapGrpcListConnectedSynchronizersRequest,
    mapGrpcListRegisteredSynchronizers,
    mapGrpcListRegisteredSynchronizersRequest,
} from "./mappers/synchronizer-connectivity-mapper.js";
import {
    mapGrpcTrafficControlState,
    mapGrpcTrafficControlStateRequest,
} from "./mappers/traffic-control-mapper.js";
import { mapGrpcCreateParty, mapGrpcCreatePartyRequest, mapGrpcListParties, mapGrpcListPartiesRequest } from "./mappers/parties-mapper.js";
import type { GetParticipantIdRequest, GetParticipantIdResponse, GetPartiesRequest, GetPartiesResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import {
    mapGrpcListKeyOwnersRequest,
    mapGrpcListKeyOwnersResponse,
    mapGrpcTopologyListPartiesRequest,
    mapGrpcTopologyListPartiesResponse,
} from "./mappers/topology-aggregation-mapper.js";
import {
    mapGrpcGetResourceLimits,
    mapGrpcGetResourceLimitsRequest,
} from "./mappers/resource-management-mapper.js";
import {
} from "./mappers/state-read-mapper.js";
import {
    mapGrpcListAllRequest,
    mapGrpcListAllResponse,
    mapGrpcListAllV2Request,
    mapGrpcListAllV2Response,
    mapGrpcListAvailableStoresRequest,
    mapGrpcListAvailableStoresResponse,
    mapGrpcListDecentralizedNamespaceDefinitionRequest,
    mapGrpcListDecentralizedNamespaceDefinitionResponse,
    mapGrpcListLsuAnnouncementRequest,
    mapGrpcListLsuAnnouncementResponse,
    mapGrpcListLsuSequencerConnectionSuccessorRequest,
    mapGrpcListLsuSequencerConnectionSuccessorResponse,
    mapGrpcListMediatorSynchronizerStateRequest,
    mapGrpcListMediatorSynchronizerStateResponse,
    mapGrpcListNamespaceDelegationRequest,
    mapGrpcListNamespaceDelegationResponse,
    mapGrpcListOwnerToKeyMappingRequest,
    mapGrpcListOwnerToKeyMappingResponse,
    mapGrpcListParticipantSynchronizerPermissionRequest,
    mapGrpcListParticipantSynchronizerPermissionResponse,
    mapGrpcListPartyHostingLimitsRequest,
    mapGrpcListPartyHostingLimitsResponse,
    mapGrpcListPartyToKeyMappingRequest,
    mapGrpcListPartyToKeyMappingResponse,
    mapGrpcListPartyToParticipantRequest,
    mapGrpcListPartyToParticipantResponse,
    mapGrpcListSequencerSynchronizerStateRequest,
    mapGrpcListSequencerSynchronizerStateResponse,
    mapGrpcListSequencingParametersStateRequest,
    mapGrpcListSequencingParametersStateResponse,
    mapGrpcListSynchronizerParametersStateRequest,
    mapGrpcListSynchronizerParametersStateResponse,
    mapGrpcListSynchronizerTrustCertificateRequest,
    mapGrpcListSynchronizerTrustCertificateResponse,
    mapGrpcTopologyListVettedPackagesRequest,
    mapGrpcTopologyListVettedPackagesResponse,
} from "./mappers/topology-manager-read-mapper.js";
import {
    mapGrpcAddTopologyTransactionsRequest,
    mapGrpcAddTopologyTransactionsResponse,
    mapGrpcAuthorizeTopologyTransactionsRequest,
    mapGrpcAuthorizeTopologyTransactionsResponse,
    mapGrpcCreateTemporaryTopologyStoreRequest,
    mapGrpcCreateTemporaryTopologyStoreResponse,
    mapGrpcDropTemporaryTopologyStoreRequest,
    mapGrpcDropTemporaryTopologyStoreResponse,
    mapGrpcGenerateTopologyTransactionsRequest,
    mapGrpcGenerateTopologyTransactionsResponse,
    mapGrpcImportTopologySnapshotRequest,
    mapGrpcImportTopologySnapshotResponse,
    mapGrpcImportTopologySnapshotV2Request,
    mapGrpcImportTopologySnapshotV2Response,
    mapGrpcSignTopologyTransactionsRequest,
    mapGrpcSignTopologyTransactionsResponse,
} from "./mappers/topology-manager-write-mapper.js";
import type { HealthCheckRequest, HealthCheckResponse } from "./generated/canton/google/grpc/health/v1/health.js";
import { CommitmentChunkObserver } from "../../services/participant-inspection/commitment-chunk-observer.interface.js";
import { ContractObserver } from "../../services/contracts/contract-observer.interface.js";
import { TransactionObserver } from "../../services/events/transaction-observer.interface.js";
import type {
    GetCommandStatusRequest,
    GetCommandStatusResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";
import {
    GetIdentityProviderConfigResponse as ProtobufGetIdentityProviderConfigResponse,
    ListIdentityProviderConfigsResponse as ProtobufListIdentityProviderConfigsResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";
import type {
    ListKnownPackagesRequest,
    ListKnownPackagesResponse,
    UploadDarFileRequest,
    UploadDarFileResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/package_management_service.js";
import {
    GetPackageRequest,
    GetPackageResponse,
    GetPackageStatusRequest,
    GetPackageStatusResponse,
    ListPackagesRequest,
    ListPackagesResponse,
    ListVettedPackagesRequest,
    ListVettedPackagesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/package_service.js";
import {
    AllocateExternalPartyResponse as ProtobufAllocateExternalPartyResponse,
    AllocatePartyResponse,
    GenerateExternalPartyTopologyResponse as ProtobufGenerateExternalPartyTopologyResponse,
    ListKnownPartiesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/party_management_service.js";
import { GrantUserRightsResponse as ProtobufGrantUserRightsResponse } from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import type {
    GetUserRequest,
    GetUserResponse,
    ListUserRightsRequest,
    ListUserRightsResponse,
    ListUsersRequest,
    ListUsersResponse,
} from "./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";
import { GetLedgerApiVersionResponse } from "./generated/canton/com/daml/ledger/api/v2/version_service.js";
import type {
    GetContractRequest,
    GetContractResponse,
} from "./generated/canton/com/daml/ledger/api/v2/contract_service.js";
import {
    CompletionStreamResponse as ProtobufCompletionStreamResponse,
    GetCompletionsRequest,
} from "./generated/canton/com/daml/ledger/api/v2/command_completion_service.js";
import type {
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
} from "./generated/canton/com/daml/ledger/api/v2/event_query_service.js";
import type {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetConnectedSynchronizersRequest,
    GetConnectedSynchronizersResponse,
    GetLedgerEndRequest,
    GetLedgerEndResponse,
    GetLatestPrunedOffsetsRequest,
    GetLatestPrunedOffsetsResponse,
} from "./generated/canton/com/daml/ledger/api/v2/state_service.js";
import {
    GetUpdateResponse as ProtobufGetUpdateResponse,
    GetUpdatesPageResponse as ProtobufGetUpdatesPageResponse,
    GetUpdateByHashRequest,
    GetUpdateByIdRequest,
    GetUpdateByOffsetRequest,
    GetUpdatesRequest,
    GetUpdatesPageRequest,
    GetUpdatesResponse,
} from "./generated/canton/com/daml/ledger/api/v2/update_service.js";
import type {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";
import {
    GetDarContentsResponse as ProtobufGetParticipantDarContentsResponse,
    GetDarResponse as ProtobufGetParticipantDarResponse,
    GetPackageContentsResponse as ProtobufGetParticipantPackageContentsResponse,
    GetPackageReferencesResponse as ProtobufGetParticipantPackageReferencesResponse,
    ListDarsResponse as ProtobufParticipantListDarsResponse,
    ListPackagesResponse as ProtobufParticipantListPackagesResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";
import {
    CountInFlightResponse as ProtobufCountInFlightResponse,
    GetConfigForSlowCounterParticipantsResponse as ProtobufGetConfigForSlowCounterParticipantsResponse,
    GetIntervalsBehindForCounterParticipantsResponse as ProtobufGetIntervalsBehindForCounterParticipantsResponse,
    InspectCommitmentContractsResponse as ProtobufInspectCommitmentContractsResponse,
    LookupReceivedAcsCommitmentsResponse as ProtobufLookupReceivedAcsCommitmentsResponse,
    LookupOffsetByTimeResponse as ProtobufLookupOffsetByTimeResponse,
    LookupSentAcsCommitmentsResponse as ProtobufLookupSentAcsCommitmentsResponse,
    OpenCommitmentResponse as ProtobufOpenCommitmentResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_inspection_service.js";
import {
    AddPartyAsyncResponse as ProtobufAddPartyAsyncResponse,
    ClearPartyOnboardingFlagResponse as ProtobufClearPartyOnboardingFlagResponse,
    GetHighestOffsetByTimestampResponse as ProtobufGetHighestOffsetByTimestampResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import {
    ListPendingOperationsResponse as ProtobufListPendingOperationsResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";
import {
    GetSynchronizerIdResponse as ProtobufGetSynchronizerIdResponse,
    ListConnectedSynchronizersResponse as ProtobufListConnectedSynchronizersResponse,
    ListRegisteredSynchronizersResponse as ProtobufListRegisteredSynchronizersResponse,
} from "./generated/canton/com/digitalasset/canton/admin/participant/v30/synchronizer_connectivity_service.js";
import { GetSafePruningOffsetResponse as ProtobufGetSafePruningOffsetResponse } from "./generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";
import {
    GetNoWaitCommitmentsFromResponse as ProtobufGetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleResponse as ProtobufGetParticipantScheduleResponse,
    GetScheduleResponse as ProtobufGetScheduleResponse,
} from "./generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";
import { TrafficControlStateResponse as ProtobufTrafficControlStateResponse } from "./generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";
import { ParticipantStatusRequest, ParticipantStatusResponse as ProtobufParticipantStatusResponse } from "./generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";
import { GetResourceLimitsResponse as ProtobufGetResourceLimitsResponse } from "./generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";
import {
    ListKeyOwnersResponse as ProtobufListKeyOwnersResponse,
    ListPartiesResponse as ProtobufTopologyListPartiesResponse,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_aggregation_service.js";
import {
    ListAllResponse as ProtobufTopologyListAllResponse,
    ListAllV2Response as ProtobufTopologyListAllV2Response,
    ListAvailableStoresResponse as ProtobufListAvailableStoresResponse,
    ListDecentralizedNamespaceDefinitionResponse as ProtobufListDecentralizedNamespaceDefinitionResponse,
    ListLsuAnnouncementResponse as ProtobufListLsuAnnouncementResponse,
    ListLsuSequencerConnectionSuccessorResponse as ProtobufListLsuSequencerConnectionSuccessorResponse,
    ListMediatorSynchronizerStateResponse as ProtobufListMediatorSynchronizerStateResponse,
    ListNamespaceDelegationResponse as ProtobufListNamespaceDelegationResponse,
    ListOwnerToKeyMappingResponse as ProtobufListOwnerToKeyMappingResponse,
    ListParticipantSynchronizerPermissionResponse as ProtobufListParticipantSynchronizerPermissionResponse,
    ListPartyHostingLimitsResponse as ProtobufListPartyHostingLimitsResponse,
    ListPartyToKeyMappingResponse as ProtobufListPartyToKeyMappingResponse,
    ListPartyToParticipantResponse as ProtobufListPartyToParticipantResponse,
    ListSequencerSynchronizerStateResponse as ProtobufListSequencerSynchronizerStateResponse,
    ListSequencingParametersStateResponse as ProtobufListSequencingParametersStateResponse,
    ListSynchronizerParametersStateResponse as ProtobufListSynchronizerParametersStateResponse,
    ListSynchronizerTrustCertificateResponse as ProtobufListSynchronizerTrustCertificateResponse,
    ListVettedPackagesResponse as ProtobufTopologyListVettedPackagesResponse,
} from "./generated/canton/com/digitalasset/canton/topology/admin/v30/topology_manager_read_service.js";
import { ObjectDisposedError } from "../../core/errors/object-disposed-error.js";

export class GrpcTransport implements ITransport {
    private disposed = false;

    public readonly features = {
        supportsCommandSigning: true,
    };

    public constructor(private readonly operations: GrpcOperations) {}

    public async disposeAsync(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        await this.operations.disposeAsync?.();
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerApiVersionResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.getHealthAsync(options) as GetLedgerApiVersionResponse;

        return payload;
    }

    public async checkHealthAsync(
        request: HealthCheckRequest,
        options?: RequestOptions,
    ): Promise<HealthCheckResponse> {
        this.throwIfDisposed();

        return await this.operations.checkHealthAsync(
            request,
            options,
        ) as HealthCheckResponse;
    }

    public async allocatePartyAsync(
        request: AllocatePartyRequest,
        options?: RequestOptions,
    ): Promise<SdkAllocatePartyResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.createPartyAsync(
            mapGrpcCreatePartyRequest(request),
            options,
        );

        const response = mapGrpcCreateParty(
            payload as { identifier?: string } | AllocatePartyResponse,
        );

        return new SdkAllocatePartyResponse({
            party: response.party,
        });
    }

    public async listKnownPartiesAsync(
        request: ListKnownPartiesRequest,
        options?: RequestOptions,
    ): Promise<SdkListKnownPartiesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPartiesAsync(
            mapGrpcListPartiesRequest(request),
            options,
        );

        const response = mapGrpcListParties(payload as ListKnownPartiesResponse);

        return new SdkListKnownPartiesResponse({
            partyDetails: [...response.partyDetails],
            nextPageToken: response.nextPageToken,
        });
    }

    public async generateExternalPartyTopologyAsync(
        request: GenerateExternalPartyTopologyRequest,
        options?: RequestOptions,
    ): Promise<GenerateExternalPartyTopologyResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.generateExternalPartyTopologyAsync!(
            mapGrpcGenerateExternalPartyTopologyRequest(request),
            options,
        );

        return mapGrpcGenerateExternalPartyTopologyResponse(
            payload as ProtobufGenerateExternalPartyTopologyResponse,
        );
    }

    public async allocateExternalPartyAsync(
        request: AllocateExternalPartyRequest,
        options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.allocateExternalPartyAsync!(
            mapGrpcAllocateExternalPartyRequest(request),
            options,
        );

        return mapGrpcAllocateExternalPartyResponse(
            payload as ProtobufAllocateExternalPartyResponse,
        );
    }

    public async getParticipantIdAsync(
        request: GetParticipantIdRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantIdResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantIdAsync!(
            request,
            options,
        );

        return payload as GetParticipantIdResponse;
    }

    public async getPartiesAsync(
        request: GetPartiesRequest,
        options?: RequestOptions,
    ): Promise<GetPartiesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getPartiesAsync!(
            request,
            options,
        );

        return payload as GetPartiesResponse;
    }

    public async grantUserRightsAsync(
        request: import("./generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js").GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<ProtobufGrantUserRightsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.grantUserRightsAsync(
            request,
            options,
        );

        return payload as ProtobufGrantUserRightsResponse;
    }

    public async getCommandStatusAsync(
        request: GetCommandStatusRequest,
        options?: RequestOptions,
    ): Promise<GetCommandStatusResponse> {
        this.throwIfDisposed();

        return (await this.operations.getCommandStatusAsync!(
            request,
            options,
        )) as GetCommandStatusResponse;
    }

    public async getUserAsync(
        request: GetUserRequest,
        options?: RequestOptions,
    ): Promise<GetUserResponse> {
        this.throwIfDisposed();

        return (await this.operations.getUserAsync!(
            request,
            options,
        )) as GetUserResponse;
    }

    public async listUsersAsync(
        request: ListUsersRequest,
        options?: RequestOptions,
    ): Promise<ListUsersResponse> {
        this.throwIfDisposed();

        return (await this.operations.listUsersAsync!(
            request,
            options,
        )) as ListUsersResponse;
    }

    public async listUserRightsAsync(
        request: ListUserRightsRequest,
        options?: RequestOptions,
    ): Promise<ListUserRightsResponse> {
        this.throwIfDisposed();

        return (await this.operations.listUserRightsAsync!(
            request,
            options,
        )) as ListUserRightsResponse;
    }

    public async uploadDarFileAsync(
        request: UploadDarFileRequest,
        options?: RequestOptions,
    ): Promise<UploadDarFileResponse> {
        this.throwIfDisposed();

        return (await this.operations.uploadPackageAsync(
            request,
            options,
        )) as UploadDarFileResponse;
    }

    public async listPackagesAsync(
        request: ListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListPackagesResponse> {
        this.throwIfDisposed();

        return (await this.operations.listPackagesAsync!(
            request,
            options,
        )) as ListPackagesResponse;
    }

    public async listKnownPackagesAsync(
        request: ListKnownPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListKnownPackagesResponse> {
        this.throwIfDisposed();

        return (await this.operations.listKnownPackagesAsync!(
            request,
            options,
        )) as ListKnownPackagesResponse;
    }

    public async getIdentityProviderConfigAsync(
        request: import("./generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js").GetIdentityProviderConfigRequest,
        options?: RequestOptions,
    ): Promise<ProtobufGetIdentityProviderConfigResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getIdentityProviderConfigAsync!(
            request,
            options,
        );

        return payload as ProtobufGetIdentityProviderConfigResponse;
    }

    public async listIdentityProviderConfigsAsync(
        request: import("./generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js").ListIdentityProviderConfigsRequest,
        options?: RequestOptions,
    ): Promise<ProtobufListIdentityProviderConfigsResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.listIdentityProviderConfigsAsync!(
                request,
                options,
            );

        return payload as ProtobufListIdentityProviderConfigsResponse;
    }

    public async getPackageAsync(
        request: GetPackageRequest,
        options?: RequestOptions,
    ): Promise<GetPackageResponse> {
        this.throwIfDisposed();

        return (await this.operations.getPackageAsync!(
            request,
            options,
        )) as GetPackageResponse;
    }

    public async getPackageStatusAsync(
        request: GetPackageStatusRequest,
        options?: RequestOptions,
    ): Promise<GetPackageStatusResponse> {
        this.throwIfDisposed();

        return (await this.operations.getPackageStatusAsync!(
            request,
            options,
        )) as GetPackageStatusResponse;
    }

    public async listVettedPackagesAsync(
        request: ListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse> {
        this.throwIfDisposed();

        return (await this.operations.listVettedPackagesAsync!(
            request,
            options,
        )) as ListVettedPackagesResponse;
    }

    public async listParticipantPackagesAsync(
        request: ParticipantListPackagesRequest,
        options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listParticipantPackagesAsync!(
            mapGrpcParticipantListPackagesRequest(request),
            options,
        );

        return mapGrpcParticipantListPackages(
            payload as Partial<ProtobufParticipantListPackagesResponse>,
        );
    }

    public async getParticipantPackageContentsAsync(
        request: GetPackageContentsRequest,
        options?: RequestOptions,
    ): Promise<GetPackageContentsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantPackageContentsAsync!(
            mapGrpcGetParticipantPackageContentsRequest(request),
            options,
        );

        return mapGrpcGetParticipantPackageContents(
            payload as Partial<ProtobufGetParticipantPackageContentsResponse>,
        );
    }

    public async getParticipantPackageReferencesAsync(
        request: GetPackageReferencesRequest,
        options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantPackageReferencesAsync!(
            mapGrpcGetParticipantPackageReferencesRequest(request),
            options,
        );

        return mapGrpcGetParticipantPackageReferences(
            payload as Partial<ProtobufGetParticipantPackageReferencesResponse>,
        );
    }

    public async getParticipantDarAsync(
        request: GetDarRequest,
        options?: RequestOptions,
    ): Promise<GetDarResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantDarAsync!(
            mapGrpcGetParticipantDarRequest(request),
            options,
        );

        return mapGrpcGetParticipantDar(
            payload as Partial<ProtobufGetParticipantDarResponse>,
        );
    }

    public async listParticipantDarsAsync(
        request: ListDarsRequest,
        options?: RequestOptions,
    ): Promise<ListDarsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listParticipantDarsAsync!(
            mapGrpcListParticipantDarsRequest(request),
            options,
        );

        return mapGrpcListParticipantDars(
            payload as Partial<ProtobufParticipantListDarsResponse>,
        );
    }

    public async getParticipantDarContentsAsync(
        request: GetDarContentsRequest,
        options?: RequestOptions,
    ): Promise<GetDarContentsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantDarContentsAsync!(
            mapGrpcGetParticipantDarContentsRequest(request),
            options,
        );

        return mapGrpcGetParticipantDarContents(
            payload as Partial<ProtobufGetParticipantDarContentsResponse>,
        );
    }

    public async getParticipantStatusAsync(
        request: ParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<ProtobufParticipantStatusResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getParticipantStatusAsync!(
            request,
            options,
        );

        return payload as ProtobufParticipantStatusResponse;
    }

    public async lookupOffsetByTimeAsync(
        request: LookupOffsetByTimeRequest,
        options?: RequestOptions,
    ): Promise<LookupOffsetByTimeResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.lookupOffsetByTimeAsync!(
            mapGrpcLookupOffsetByTimeRequest(request),
            options,
        );

        return mapGrpcLookupOffsetByTime(
            payload as Partial<ProtobufLookupOffsetByTimeResponse>,
        );
    }

    public async openCommitmentAsync(
        request: OpenCommitmentRequest,
        observer: CommitmentChunkObserver<OpenCommitmentResponse>,
        options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        const payload = await this.operations.openCommitmentAsync!(
            mapGrpcOpenCommitmentRequest(request),
            options,
        );

        for (const item of payload as Partial<ProtobufOpenCommitmentResponse>[]) {
            await observer.nextAsync(mapGrpcOpenCommitment(item));
        }
    }

    public async inspectCommitmentContractsAsync(
        request: InspectCommitmentContractsRequest,
        observer: CommitmentChunkObserver<InspectCommitmentContractsResponse>,
        options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        const payload = await this.operations.inspectCommitmentContractsAsync!(
            mapGrpcInspectCommitmentContractsRequest(request),
            options,
        );

        for (
            const item of payload as Partial<ProtobufInspectCommitmentContractsResponse>[]
        ) {
            await observer.nextAsync(mapGrpcInspectCommitmentContracts(item));
        }
    }

    public async countInFlightAsync(
        request: CountInFlightRequest,
        options?: RequestOptions,
    ): Promise<CountInFlightResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.countInFlightAsync!(
            mapGrpcCountInFlightRequest(request),
            options,
        );

        return mapGrpcCountInFlight(
            payload as Partial<ProtobufCountInFlightResponse>,
        );
    }

    public async getConfigForSlowCounterParticipantsAsync(
        request: GetConfigForSlowCounterParticipantsRequest,
        options?: RequestOptions,
    ): Promise<GetConfigForSlowCounterParticipantsResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.getConfigForSlowCounterParticipantsAsync!(
                mapGrpcGetConfigForSlowCounterParticipantsRequest(request),
                options,
            );

        return mapGrpcGetConfigForSlowCounterParticipants(
            payload as Partial<ProtobufGetConfigForSlowCounterParticipantsResponse>,
        );
    }

    public async getIntervalsBehindForCounterParticipantsAsync(
        request: GetIntervalsBehindForCounterParticipantsRequest,
        options?: RequestOptions,
    ): Promise<GetIntervalsBehindForCounterParticipantsResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.getIntervalsBehindForCounterParticipantsAsync!(
                mapGrpcGetIntervalsBehindForCounterParticipantsRequest(request),
                options,
            );

        return mapGrpcGetIntervalsBehindForCounterParticipants(
            payload as Partial<ProtobufGetIntervalsBehindForCounterParticipantsResponse>,
        );
    }

    public async lookupSentAcsCommitmentsAsync(
        request: LookupSentAcsCommitmentsRequest,
        options?: RequestOptions,
    ): Promise<LookupSentAcsCommitmentsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.lookupSentAcsCommitmentsAsync!(
            mapGrpcLookupSentAcsCommitmentsRequest(request),
            options,
        );

        return mapGrpcLookupSentAcsCommitments(
            payload as Partial<ProtobufLookupSentAcsCommitmentsResponse>,
        );
    }

    public async lookupReceivedAcsCommitmentsAsync(
        request: LookupReceivedAcsCommitmentsRequest,
        options?: RequestOptions,
    ): Promise<LookupReceivedAcsCommitmentsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.lookupReceivedAcsCommitmentsAsync!(
            mapGrpcLookupReceivedAcsCommitmentsRequest(request),
            options,
        );

        return mapGrpcLookupReceivedAcsCommitments(
            payload as Partial<ProtobufLookupReceivedAcsCommitmentsResponse>,
        );
    }

    public async addPartyAsync(
        request: AddPartyAsyncRequest,
        options?: RequestOptions,
    ): Promise<AddPartyAsyncResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.addPartyAsync!(
            mapGrpcAddPartyAsyncRequest(request),
            options,
        );

        return mapGrpcAddPartyAsyncResponse(
            payload as Partial<ProtobufAddPartyAsyncResponse>,
        );
    }

    public async clearPartyOnboardingFlagAsync(
        request: ClearPartyOnboardingFlagRequest,
        options?: RequestOptions,
    ): Promise<ClearPartyOnboardingFlagResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.clearPartyOnboardingFlagAsync!(
            mapGrpcClearPartyOnboardingFlagRequest(request),
            options,
        );

        return mapGrpcClearPartyOnboardingFlagResponse(
            payload as Partial<ProtobufClearPartyOnboardingFlagResponse>,
        );
    }

    public async getHighestOffsetByTimestampAsync(
        request: GetHighestOffsetByTimestampRequest,
        options?: RequestOptions,
    ): Promise<GetHighestOffsetByTimestampResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getHighestOffsetByTimestampAsync!(
            mapGrpcGetHighestOffsetByTimestampRequest(request),
            options,
        );

        return mapGrpcGetHighestOffsetByTimestamp(
            payload as Partial<ProtobufGetHighestOffsetByTimestampResponse>,
        );
    }

    public async getSafePruningOffsetAsync(
        request: GetSafePruningOffsetRequest,
        options?: RequestOptions,
    ): Promise<GetSafePruningOffsetResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getSafePruningOffsetAsync!(
            mapGrpcGetSafePruningOffsetRequest(request),
            options,
        );

        return mapGrpcGetSafePruningOffset(
            payload as Partial<ProtobufGetSafePruningOffsetResponse>,
        );
    }

    public async getPruningScheduleAsync(
        request: GetPruningScheduleRequest,
        options?: RequestOptions,
    ): Promise<GetPruningScheduleResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getPruningScheduleAsync!(
            mapGrpcGetPruningScheduleRequest(request),
            options,
        );

        return mapGrpcGetPruningSchedule(
            payload as Partial<ProtobufGetScheduleResponse>,
        );
    }

    public async getParticipantPruningScheduleAsync(
        request: GetParticipantPruningScheduleRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantPruningScheduleResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.getParticipantPruningScheduleAsync!(
                mapGrpcGetParticipantPruningScheduleRequest(request),
                options,
            );

        return mapGrpcGetParticipantPruningSchedule(
            payload as Partial<ProtobufGetParticipantScheduleResponse>,
        );
    }

    public async getNoWaitCommitmentsFromAsync(
        request: GetNoWaitCommitmentsFromRequest,
        options?: RequestOptions,
    ): Promise<GetNoWaitCommitmentsFromResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getNoWaitCommitmentsFromAsync!(
            mapGrpcGetNoWaitCommitmentsFromRequest(request),
            options,
        );

        return mapGrpcGetNoWaitCommitmentsFrom(
            payload as Partial<ProtobufGetNoWaitCommitmentsFromResponse>,
        );
    }

    public async trafficControlStateAsync(
        request: TrafficControlStateRequest,
        options?: RequestOptions,
    ): Promise<TrafficControlStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.trafficControlStateAsync!(
            mapGrpcTrafficControlStateRequest(request),
            options,
        );

        return mapGrpcTrafficControlState(
            payload as Partial<ProtobufTrafficControlStateResponse>,
        );
    }

    public async listConnectedSynchronizersAsync(
        request: ListConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<ListConnectedSynchronizersResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listConnectedSynchronizersAsync!(
            mapGrpcListConnectedSynchronizersRequest(request),
            options,
        );

        return mapGrpcListConnectedSynchronizers(
            payload as Partial<ProtobufListConnectedSynchronizersResponse>,
        );
    }

    public async getSynchronizerIdAsync(
        request: GetSynchronizerIdRequest,
        options?: RequestOptions,
    ): Promise<GetSynchronizerIdResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getSynchronizerIdAsync!(
            mapGrpcGetSynchronizerIdRequest(request),
            options,
        );

        return mapGrpcGetSynchronizerId(
            payload as Partial<ProtobufGetSynchronizerIdResponse>,
        );
    }

    public async listRegisteredSynchronizersAsync(
        request: ListRegisteredSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<ListRegisteredSynchronizersResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listRegisteredSynchronizersAsync!(
            mapGrpcListRegisteredSynchronizersRequest(request),
            options,
        );

        return mapGrpcListRegisteredSynchronizers(
            payload as Partial<ProtobufListRegisteredSynchronizersResponse>,
        );
    }

    public async listPendingOperationsAsync(
        request: ListPendingOperationsRequest,
        options?: RequestOptions,
    ): Promise<ListPendingOperationsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPendingOperationsAsync!(
            mapGrpcListPendingOperationsRequest(request),
            options,
        );

        return mapGrpcListPendingOperations(
            payload as Partial<ProtobufListPendingOperationsResponse>,
        );
    }

    public async getResourceLimitsAsync(
        request: GetResourceLimitsRequest,
        options?: RequestOptions,
    ): Promise<GetResourceLimitsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.getResourceLimitsAsync!(
            mapGrpcGetResourceLimitsRequest(request),
            options,
        );

        return mapGrpcGetResourceLimits(
            payload as Partial<ProtobufGetResourceLimitsResponse>,
        );
    }

    public async getIdAsync(
        request: GetIdRequest,
        options?: RequestOptions,
    ): Promise<GetIdResponse> {
        this.throwIfDisposed();

        return await this.operations.getIdAsync!(request, options);
    }

    public async currentTimeAsync(
        request: CurrentTimeRequest,
        options?: RequestOptions,
    ): Promise<CurrentTimeResponse> {
        this.throwIfDisposed();

        return await this.operations.currentTimeAsync!(request, options);
    }

    public async getContractAsync(
        request: GetContractRequest,
        options?: RequestOptions,
    ): Promise<GetContractResponse> {
        this.throwIfDisposed();

        return await this.operations.getContractAsync!(request, options);
    }

    public async getEventsByContractIdAsync(
        request: GetEventsByContractIdRequest,
        options?: RequestOptions,
    ): Promise<GetEventsByContractIdResponse> {
        this.throwIfDisposed();

        return await this.operations.getEventsByContractIdAsync!(request, options);
    }

    public async listNamespaceDelegationAsync(
        request: ListNamespaceDelegationRequest,
        options?: RequestOptions,
    ): Promise<ListNamespaceDelegationResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listNamespaceDelegationAsync!(
            mapGrpcListNamespaceDelegationRequest(request),
            options,
        );

        return mapGrpcListNamespaceDelegationResponse(
            payload as Partial<ProtobufListNamespaceDelegationResponse>,
        );
    }

    public async listDecentralizedNamespaceDefinitionAsync(
        request: ListDecentralizedNamespaceDefinitionRequest,
        options?: RequestOptions,
    ): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.listDecentralizedNamespaceDefinitionAsync!(
                mapGrpcListDecentralizedNamespaceDefinitionRequest(request),
                options,
            );

        return mapGrpcListDecentralizedNamespaceDefinitionResponse(
            payload as Partial<ProtobufListDecentralizedNamespaceDefinitionResponse>,
        );
    }

    public async listOwnerToKeyMappingAsync(
        request: ListOwnerToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListOwnerToKeyMappingResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listOwnerToKeyMappingAsync!(
            mapGrpcListOwnerToKeyMappingRequest(request),
            options,
        );

        return mapGrpcListOwnerToKeyMappingResponse(
            payload as Partial<ProtobufListOwnerToKeyMappingResponse>,
        );
    }

    public async listPartyToKeyMappingAsync(
        request: ListPartyToKeyMappingRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToKeyMappingResponse> {
        this.throwIfDisposed();

        let payload: unknown;

        try {
            payload = await this.operations.listPartyToKeyMappingAsync!(
                mapGrpcListPartyToKeyMappingRequest(request),
                options,
            );
        } catch (error) {
            this.throwPartyTopologyReadCompatibilityError(
                error,
                "topologyManagerReadService.listPartyToKeyMappingAsync",
            );
        }

        return mapGrpcListPartyToKeyMappingResponse(
            payload as Partial<ProtobufListPartyToKeyMappingResponse>,
        );
    }

    public async listSynchronizerTrustCertificateAsync(
        request: ListSynchronizerTrustCertificateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerTrustCertificateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSynchronizerTrustCertificateAsync!(
            mapGrpcListSynchronizerTrustCertificateRequest(request),
            options,
        );

        return mapGrpcListSynchronizerTrustCertificateResponse(
            payload as Partial<ProtobufListSynchronizerTrustCertificateResponse>,
        );
    }

    public async listParticipantSynchronizerPermissionAsync(
        request: ListParticipantSynchronizerPermissionRequest,
        options?: RequestOptions,
    ): Promise<ListParticipantSynchronizerPermissionResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listParticipantSynchronizerPermissionAsync!(
            mapGrpcListParticipantSynchronizerPermissionRequest(request),
            options,
        );

        return mapGrpcListParticipantSynchronizerPermissionResponse(
            payload as Partial<ProtobufListParticipantSynchronizerPermissionResponse>,
        );
    }

    public async authorizeTopologyTransactionsAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.authorizeTopologyTransactionsAsync!(
            mapGrpcAuthorizeTopologyTransactionsRequest(request),
            options,
        );

        return mapGrpcAuthorizeTopologyTransactionsResponse(payload as any);
    }

    public async addTopologyTransactionsAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.addTopologyTransactionsAsync!(
            mapGrpcAddTopologyTransactionsRequest(request),
            options,
        );

        return mapGrpcAddTopologyTransactionsResponse(payload as any);
    }

    public async importTopologySnapshotAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.importTopologySnapshotAsync!(
            mapGrpcImportTopologySnapshotRequest(request),
            options,
        );

        return mapGrpcImportTopologySnapshotResponse(payload as any);
    }

    public async importTopologySnapshotV2Async(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.importTopologySnapshotV2Async!(
            mapGrpcImportTopologySnapshotV2Request(request),
            options,
        );

        return mapGrpcImportTopologySnapshotV2Response(payload as any);
    }

    public async signTopologyTransactionsAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.signTopologyTransactionsAsync!(
            mapGrpcSignTopologyTransactionsRequest(request),
            options,
        );

        return mapGrpcSignTopologyTransactionsResponse(payload as any);
    }

    public async generateTopologyTransactionsAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.generateTopologyTransactionsAsync!(
            mapGrpcGenerateTopologyTransactionsRequest(request),
            options,
        );

        return mapGrpcGenerateTopologyTransactionsResponse(payload as any);
    }

    public async createTemporaryTopologyStoreAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload =
            await this.operations.createTemporaryTopologyStoreAsync!(
                mapGrpcCreateTemporaryTopologyStoreRequest(request),
                options,
            );

        return mapGrpcCreateTemporaryTopologyStoreResponse(payload as any);
    }

    public async dropTemporaryTopologyStoreAsync(
        request: any,
        options?: RequestOptions,
    ): Promise<any> {
        this.throwIfDisposed();

        const payload = await this.operations.dropTemporaryTopologyStoreAsync!(
            mapGrpcDropTemporaryTopologyStoreRequest(request),
            options,
        );

        return mapGrpcDropTemporaryTopologyStoreResponse(payload as any);
    }

    public async listPartyHostingLimitsAsync(
        request: ListPartyHostingLimitsRequest,
        options?: RequestOptions,
    ): Promise<ListPartyHostingLimitsResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listPartyHostingLimitsAsync!(
            mapGrpcListPartyHostingLimitsRequest(request),
            options,
        );

        return mapGrpcListPartyHostingLimitsResponse(
            payload as Partial<ProtobufListPartyHostingLimitsResponse>,
        );
    }

    public async topologyListVettedPackagesAsync(
        request: TopologyListVettedPackagesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListVettedPackagesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.topologyListVettedPackagesAsync!(
            mapGrpcTopologyListVettedPackagesRequest(request),
            options,
        );

        return mapGrpcTopologyListVettedPackagesResponse(
            payload as Partial<ProtobufTopologyListVettedPackagesResponse>,
        );
    }

    public async listPartyToParticipantAsync(
        request: ListPartyToParticipantRequest,
        options?: RequestOptions,
    ): Promise<ListPartyToParticipantResponse> {
        this.throwIfDisposed();

        let payload: unknown;

        try {
            payload = await this.operations.listPartyToParticipantAsync!(
                mapGrpcListPartyToParticipantRequest(request),
                options,
            );
        } catch (error) {
            this.throwPartyTopologyReadCompatibilityError(
                error,
                "topologyManagerReadService.listPartyToParticipantAsync",
            );
        }

        return mapGrpcListPartyToParticipantResponse(
            payload as Partial<ProtobufListPartyToParticipantResponse>,
        );
    }

    public async listSynchronizerParametersStateAsync(
        request: ListSynchronizerParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSynchronizerParametersStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSynchronizerParametersStateAsync!(
            mapGrpcListSynchronizerParametersStateRequest(request),
            options,
        );

        return mapGrpcListSynchronizerParametersStateResponse(
            payload as Partial<ProtobufListSynchronizerParametersStateResponse>,
        );
    }

    public async listSequencingParametersStateAsync(
        request: ListSequencingParametersStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencingParametersStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSequencingParametersStateAsync!(
            mapGrpcListSequencingParametersStateRequest(request),
            options,
        );

        return mapGrpcListSequencingParametersStateResponse(
            payload as Partial<ProtobufListSequencingParametersStateResponse>,
        );
    }

    public async listMediatorSynchronizerStateAsync(
        request: ListMediatorSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListMediatorSynchronizerStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listMediatorSynchronizerStateAsync!(
            mapGrpcListMediatorSynchronizerStateRequest(request),
            options,
        );

        return mapGrpcListMediatorSynchronizerStateResponse(
            payload as Partial<ProtobufListMediatorSynchronizerStateResponse>,
        );
    }

    public async listSequencerSynchronizerStateAsync(
        request: ListSequencerSynchronizerStateRequest,
        options?: RequestOptions,
    ): Promise<ListSequencerSynchronizerStateResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listSequencerSynchronizerStateAsync!(
            mapGrpcListSequencerSynchronizerStateRequest(request),
            options,
        );

        return mapGrpcListSequencerSynchronizerStateResponse(
            payload as Partial<ProtobufListSequencerSynchronizerStateResponse>,
        );
    }

    public async listLsuAnnouncementAsync(
        request: ListLsuAnnouncementRequest,
        options?: RequestOptions,
    ): Promise<ListLsuAnnouncementResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listLsuAnnouncementAsync!(
            mapGrpcListLsuAnnouncementRequest(request),
            options,
        );

        return mapGrpcListLsuAnnouncementResponse(
            payload as Partial<ProtobufListLsuAnnouncementResponse>,
        );
    }

    public async listLsuSequencerConnectionSuccessorAsync(
        request: ListLsuSequencerConnectionSuccessorRequest,
        options?: RequestOptions,
    ): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        this.throwIfDisposed();

        const payload =
            await this.operations.listLsuSequencerConnectionSuccessorAsync!(
                mapGrpcListLsuSequencerConnectionSuccessorRequest(request),
                options,
            );

        return mapGrpcListLsuSequencerConnectionSuccessorResponse(
            payload as Partial<ProtobufListLsuSequencerConnectionSuccessorResponse>,
        );
    }

    public async listAvailableStoresAsync(
        request: ListAvailableStoresRequest,
        options?: RequestOptions,
    ): Promise<ListAvailableStoresResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listAvailableStoresAsync!(
            mapGrpcListAvailableStoresRequest(request),
            options,
        );

        return mapGrpcListAvailableStoresResponse(
            payload as Partial<ProtobufListAvailableStoresResponse>,
        );
    }

    public async listAllAsync(
        request: ListAllRequest,
        options?: RequestOptions,
    ): Promise<ListAllResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listAllAsync!(
            mapGrpcListAllRequest(request),
            options,
        );

        return mapGrpcListAllResponse(
            payload as Partial<ProtobufTopologyListAllResponse>,
        );
    }

    public async listAllV2Async(
        request: ListAllV2Request,
        options?: RequestOptions,
    ): Promise<ListAllV2Response> {
        this.throwIfDisposed();

        const payload = await this.operations.listAllV2Async!(
            mapGrpcListAllV2Request(request),
            options,
        );

        return mapGrpcListAllV2Response(
            payload as Partial<ProtobufTopologyListAllV2Response>,
        );
    }

    public async topologyListPartiesAsync(
        request: TopologyListPartiesRequest,
        options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.topologyListPartiesAsync!(
            mapGrpcTopologyListPartiesRequest(request),
            options,
        );

        return mapGrpcTopologyListPartiesResponse(
            payload as Partial<ProtobufTopologyListPartiesResponse>,
        );
    }

    public async listKeyOwnersAsync(
        request: ListKeyOwnersRequest,
        options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse> {
        this.throwIfDisposed();

        const payload = await this.operations.listKeyOwnersAsync!(
            mapGrpcListKeyOwnersRequest(request),
            options,
        );

        return mapGrpcListKeyOwnersResponse(
            payload as Partial<ProtobufListKeyOwnersResponse>,
        );
    }

    public async getActiveContractsPageAsync(
        request: GetActiveContractsPageRequest,
        options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        this.throwIfDisposed();

        return (await this.operations.getActiveContractsPageAsync!(
            request,
            options,
        )) as GetActiveContractsPageResponse;
    }

    public async getConnectedSynchronizersAsync(
        request: GetConnectedSynchronizersRequest,
        options?: RequestOptions,
    ): Promise<GetConnectedSynchronizersResponse> {
        this.throwIfDisposed();

        return (await this.operations.getConnectedSynchronizersAsync!(
            request,
            options,
        )) as GetConnectedSynchronizersResponse;
    }

    public async getLedgerEndAsync(
        request: GetLedgerEndRequest,
        options?: RequestOptions,
    ): Promise<GetLedgerEndResponse> {
        this.throwIfDisposed();

        return (await this.operations.getLedgerEndAsync!(
            request,
            options,
        )) as GetLedgerEndResponse;
    }

    public async getLatestPrunedOffsetsAsync(
        request: GetLatestPrunedOffsetsRequest,
        options?: RequestOptions,
    ): Promise<GetLatestPrunedOffsetsResponse> {
        this.throwIfDisposed();

        return (await this.operations.getLatestPrunedOffsetsAsync!(
            request,
            options,
        )) as GetLatestPrunedOffsetsResponse;
    }

    public async getActiveContractsAsync(
        _request: GetActiveContractsRequest,
        _observer: ContractObserver,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new NotSupportedError(
            "StateService.GetActiveContracts is not supported by gRPC transport yet",
        );
    }

    public getUpdatesAsync(
        request: GetUpdatesRequest,
        options?: RequestOptions,
    ): AsyncIterable<GetUpdatesResponse> {
        this.throwIfDisposed();
        return this.operations.getUpdatesAsync(request, options);
    }

    public async getUpdateByOffsetAsync(
        request: GetUpdateByOffsetRequest,
        options?: RequestOptions,
    ): Promise<ProtobufGetUpdateResponse> {
        this.throwIfDisposed();

        return await this.operations.getUpdateByOffsetAsync!(request, options) as ProtobufGetUpdateResponse;
    }

    public async getUpdateByIdAsync(
        request: GetUpdateByIdRequest,
        options?: RequestOptions,
    ): Promise<ProtobufGetUpdateResponse> {
        this.throwIfDisposed();

        return await this.operations.getUpdateByIdAsync!(request, options) as ProtobufGetUpdateResponse;
    }

    public async getUpdateByHashAsync(
        request: GetUpdateByHashRequest,
        options?: RequestOptions,
    ): Promise<ProtobufGetUpdateResponse> {
        this.throwIfDisposed();

        return await this.operations.getUpdateByHashAsync!(request, options) as ProtobufGetUpdateResponse;
    }

    public async getUpdatesPageAsync(
        request: GetUpdatesPageRequest,
        options?: RequestOptions,
    ): Promise<ProtobufGetUpdatesPageResponse> {
        this.throwIfDisposed();

        return await this.operations.getUpdatesPageAsync!(request, options) as ProtobufGetUpdatesPageResponse;
    }

    public getCompletionsAsync(
        request: GetCompletionsRequest,
        options?: RequestOptions,
    ): AsyncIterable<ProtobufCompletionStreamResponse> {
        this.throwIfDisposed();
        return this.operations.getCompletionsAsync!(request, options) as AsyncIterable<ProtobufCompletionStreamResponse>;
    }

    public async submitCommandAsync(
        request: SubmitCommandRequest,
        signer?: ICommandSigner | CommandSigners,
        options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        this.throwIfDisposed();

        if (!signer) {
            const payload = await this.operations.submitCommandAsync(
                mapGrpcSubmitCommandRequest(request),
                options,
            );

            return mapGrpcSubmitCommand(
                payload as { commandId?: string; transactionId?: string },
            );
        } else if (request.actAs.length !== 1 && !("signAsync" in signer)) {
            throw new ValidationError(
                "interactive gRPC command signing currently requires exactly one actAs party",
            );
        } else if (!this.operations.prepareSubmissionAsync) {
            throw new NotSupportedError(
                "interactive gRPC command signing is not available on this transport",
            );
        } else if (!this.operations.executeSubmissionAndWaitAsync) {
            throw new NotSupportedError(
                "interactive gRPC command signing is not available on this transport",
            );
        }

        const commandId = randomUUID();

        const submissionId = randomUUID();

        const prepared = await this.operations.prepareSubmissionAsync(
            mapGrpcPrepareSubmissionRequest(request, commandId),
            options,
        ) as {
            preparedTransaction?: {};
            preparedTransactionHash: Uint8Array;
            hashingSchemeVersion: number;
        };

        if (!prepared.preparedTransaction) {
            throw new ValidationError(
                "interactive prepare submission did not return a preparedTransaction",
            );
        }

        else if (prepared.preparedTransactionHash.length === 0) {
            throw new ValidationError(
                "interactive prepare submission did not return a preparedTransactionHash",
            );
        }

        const signerResults = await Promise.all(request.actAs.map(async (party) => {
            const partySigner: ICommandSigner | undefined = "signAsync" in signer ? signer as ICommandSigner : (signer as CommandSigners)[party];
            if (partySigner === undefined) throw new ValidationError(`interactive command signing requires a signer for ${party}`);
            return { party, result: await partySigner.signAsync(new SignCommandRequest({ payload: prepared.preparedTransactionHash, party, algorithmHint: "ed25519" })) };
        }));

        const executed = await this.operations.executeSubmissionAndWaitAsync(
            mapGrpcExecuteSubmissionAndWaitRequest({
                request,
                preparedTransaction: prepared.preparedTransaction,
                hashingSchemeVersion: prepared.hashingSchemeVersion,
                submissionId,
                signerResults,
            }),
            options,
        );

        return mapGrpcInteractiveSubmitCommand(
            executed as { updateId: string; completionOffset: string },
        );
    }

    public async submitCommandForTransactionAsync(request: SubmitCommandRequest, options?: RequestOptions): Promise<import("../../core/types/responses/submit-command-transaction-response.js").SubmitCommandTransactionResponse> {
        this.throwIfDisposed();
        if (!this.operations.submitCommandForTransactionAsync) throw new NotSupportedError("transaction-returning command submission is not available on this transport");
        return mapGrpcSubmitCommandTransaction(await this.operations.submitCommandForTransactionAsync(mapGrpcSubmitCommandForTransactionRequest(request), options) as never);
    }

    public async prepareCommandAsync(request: SubmitCommandRequest, options?: RequestOptions): Promise<PreparedCommandSubmission> {
        if (!this.operations.prepareSubmissionAsync) throw new NotSupportedError("interactive gRPC command signing is not available on this transport");
        const prepared = await this.operations.prepareSubmissionAsync(mapGrpcPrepareSubmissionRequest(request, randomUUID()), options) as { preparedTransaction?: unknown; preparedTransactionHash: Uint8Array; hashingSchemeVersion: number };
        if (!prepared.preparedTransaction || prepared.preparedTransactionHash.length === 0) throw new ValidationError("interactive prepare submission returned an incomplete result");
        return new PreparedCommandSubmission(request, prepared.preparedTransaction, prepared.preparedTransactionHash, prepared.hashingSchemeVersion);
    }

    public async executePreparedCommandAndWaitAsync(prepared: PreparedCommandSubmission, signatures: Readonly<Record<string, SignCommandResult>>, options?: RequestOptions): Promise<SubmitCommandResponse> {
        if (!this.operations.executeSubmissionAndWaitAsync) throw new NotSupportedError("interactive gRPC command signing is not available on this transport");
        const signerResults = prepared.request.actAs.map((party) => { const result = signatures[party]; if (!result) throw new ValidationError(`interactive command signing requires a signature for ${party}`); return { party, result }; });
        const result = await this.operations.executeSubmissionAndWaitAsync(mapGrpcExecuteSubmissionAndWaitRequest({ request: prepared.request, preparedTransaction: prepared.transaction as never, hashingSchemeVersion: prepared.hashingSchemeVersion as never, submissionId: randomUUID(), signerResults }), options);
        return mapGrpcInteractiveSubmitCommand(result as { updateId: string; completionOffset: string });
    }

    private throwIfDisposed(): void {
        if (this.disposed) {
            throw new ObjectDisposedError(
                "The client or transport has been disposed.",
            );
        }
    }

    private throwPartyTopologyReadCompatibilityError(
        error: unknown,
        sdkMethodName: string,
    ): never {
        if (!this.isProtobufDeserializationFailure(error)) {
            throw error;
        }

        const message =
            error instanceof Error ? error.message : String(error);

        throw new TransportError(
            `${sdkMethodName} failed while decoding a raw participant-admin party topology mapping response. `
            + "This usually indicates a Canton/protobuf compatibility mismatch on low-level topology read payloads. "
            + "For party-topology summary views, prefer topologyAggregationService.listPartiesAsync() "
            + "and topologyAggregationService.listKeyOwnersAsync(). "
            + `Original error: ${message}`,
        );
    }

    private isProtobufDeserializationFailure(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        return error.message.includes("PROTO_DESERIALIZATION_FAILURE")
            || error.message.includes(
                "Deserialization of protobuf message failed",
            );
    }
}

export function createDefaultGrpcTransport(
    options: CantonClientOptions,
    endpoint: string,
    grpcChannelSecurity: GrpcChannelSecurity,
): GrpcTransport {
    return new GrpcTransport(
        createGrpcOperations(options, endpoint, grpcChannelSecurity),
    );
}
