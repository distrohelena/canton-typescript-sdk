import { CantonClientOptions } from "./canton-client-options.js";
import { IAuthProvider } from "../core/auth/auth-provider.interface.js";
import { ITransport } from "../core/transports/transport.interface.js";
import { AllocateExternalPartyRequest } from "../core/types/requests/allocate-external-party-request.js";
import { AllocatePartyRequest } from "../core/types/requests/allocate-party-request.js";
import { AddPartyAsyncRequest } from "../core/types/requests/add-party-async-request.js";
import { AddTopologyTransactionsRequest } from "../core/types/requests/add-topology-transactions-request.js";
import { GetCompletionsRequest } from "../core/types/requests/get-completions-request.js";
import { GetConnectedSynchronizersRequest } from "../core/types/requests/get-connected-synchronizers-request.js";
import { CountInFlightRequest } from "../core/types/requests/count-in-flight-request.js";
import { CurrentTimeRequest } from "../core/types/requests/current-time-request.js";
import { ClearPartyOnboardingFlagRequest } from "../core/types/requests/clear-party-onboarding-flag-request.js";
import { GetDarContentsRequest } from "../core/types/requests/get-dar-contents-request.js";
import { GetDarRequest } from "../core/types/requests/get-dar-request.js";
import { GetActiveContractsPageRequest } from "../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../core/types/requests/get-active-contracts-request.js";
import { GetCommandStatusRequest } from "../core/types/requests/get-command-status-request.js";
import { GetContractRequest } from "../core/types/requests/get-contract-request.js";
import { GetEventsByContractIdRequest } from "../core/types/requests/get-events-by-contract-id-request.js";
import { GetConfigForSlowCounterParticipantsRequest } from "../core/types/requests/get-config-for-slow-counter-participants-request.js";
import { GetHighestOffsetByTimestampRequest } from "../core/types/requests/get-highest-offset-by-timestamp-request.js";
import { GrantUserRightsRequest } from "../core/types/requests/grant-user-rights-request.js";
import { AuthorizeTopologyTransactionsRequest } from "../core/types/requests/authorize-topology-transactions-request.js";
import { GetLedgerApiVersionRequest } from "../core/types/requests/get-ledger-api-version-request.js";
import { GetLatestPrunedOffsetsRequest } from "../core/types/requests/get-latest-pruned-offsets-request.js";
import { GetLedgerEndRequest } from "../core/types/requests/get-ledger-end-request.js";
import { GetPackageContentsRequest } from "../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../core/types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../core/types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../core/types/requests/get-package-status-request.js";
import { GetIdentityProviderConfigRequest } from "../core/types/requests/get-identity-provider-config-request.js";
import { GetIdRequest } from "../core/types/requests/get-id-request.js";
import { GetIntervalsBehindForCounterParticipantsRequest } from "../core/types/requests/get-intervals-behind-for-counter-participants-request.js";
import { InspectCommitmentContractsRequest } from "../core/types/requests/inspect-commitment-contracts-request.js";
import { GetNoWaitCommitmentsFromRequest } from "../core/types/requests/get-no-wait-commitments-from-request.js";
import { GetParticipantIdRequest } from "../core/types/requests/get-participant-id-request.js";
import { GetParticipantPruningScheduleRequest } from "../core/types/requests/get-participant-pruning-schedule-request.js";
import { GetParticipantStatusRequest } from "../core/types/requests/get-participant-status-request.js";
import { GetPartiesRequest } from "../core/types/requests/get-parties-request.js";
import { GetPruningScheduleRequest } from "../core/types/requests/get-pruning-schedule-request.js";
import { GetResourceLimitsRequest } from "../core/types/requests/get-resource-limits-request.js";
import { GetSafePruningOffsetRequest } from "../core/types/requests/get-safe-pruning-offset-request.js";
import { GetSynchronizerIdRequest } from "../core/types/requests/get-synchronizer-id-request.js";
import { GetUpdateByHashRequest } from "../core/types/requests/get-update-by-hash-request.js";
import { GetUpdateByIdRequest } from "../core/types/requests/get-update-by-id-request.js";
import { GetUpdateByOffsetRequest } from "../core/types/requests/get-update-by-offset-request.js";
import { GetUpdatesRequest } from "../core/types/requests/get-updates-request.js";
import { GetUpdatesPageRequest } from "../core/types/requests/get-updates-page-request.js";
import { GetUserRequest } from "../core/types/requests/get-user-request.js";
import { HealthCheckRequest } from "../core/types/requests/health-check-request.js";
import { CreateTemporaryTopologyStoreRequest } from "../core/types/requests/create-temporary-topology-store-request.js";
import { DropTemporaryTopologyStoreRequest } from "../core/types/requests/drop-temporary-topology-store-request.js";
import { GenerateTopologyTransactionsRequest } from "../core/types/requests/generate-topology-transactions-request.js";
import { GenerateExternalPartyTopologyRequest } from "../core/types/requests/generate-external-party-topology-request.js";
import { ImportTopologySnapshotRequest } from "../core/types/requests/import-topology-snapshot-request.js";
import { ImportTopologySnapshotV2Request } from "../core/types/requests/import-topology-snapshot-v2-request.js";
import { ListAllRequest } from "../core/types/requests/list-all-request.js";
import { ListAllV2Request } from "../core/types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../core/types/requests/list-available-stores-request.js";
import { ListConnectedSynchronizersRequest } from "../core/types/requests/list-connected-synchronizers-request.js";
import { ListRegisteredSynchronizersRequest } from "../core/types/requests/list-registered-synchronizers-request.js";
import { ListDecentralizedNamespaceDefinitionRequest } from "../core/types/requests/list-decentralized-namespace-definition-request.js";
import { ListKeyOwnersRequest } from "../core/types/requests/list-key-owners-request.js";
import { ListLsuAnnouncementRequest } from "../core/types/requests/list-lsu-announcement-request.js";
import { ListLsuSequencerConnectionSuccessorRequest } from "../core/types/requests/list-lsu-sequencer-connection-successor-request.js";
import { ListMediatorSynchronizerStateRequest } from "../core/types/requests/list-mediator-synchronizer-state-request.js";
import { ListNamespaceDelegationRequest } from "../core/types/requests/list-namespace-delegation-request.js";
import { ListOwnerToKeyMappingRequest } from "../core/types/requests/list-owner-to-key-mapping-request.js";
import { ListParticipantSynchronizerPermissionRequest } from "../core/types/requests/list-participant-synchronizer-permission-request.js";
import { ListPartyHostingLimitsRequest } from "../core/types/requests/list-party-hosting-limits-request.js";
import { ListPartyToKeyMappingRequest } from "../core/types/requests/list-party-to-key-mapping-request.js";
import { ListPartyToParticipantRequest } from "../core/types/requests/list-party-to-participant-request.js";
import { ListPackagesRequest } from "../core/types/requests/list-packages-request.js";
import { ListSequencerSynchronizerStateRequest } from "../core/types/requests/list-sequencer-synchronizer-state-request.js";
import { ListSequencingParametersStateRequest } from "../core/types/requests/list-sequencing-parameters-state-request.js";
import { ListSynchronizerParametersStateRequest } from "../core/types/requests/list-synchronizer-parameters-state-request.js";
import { ListSynchronizerTrustCertificateRequest } from "../core/types/requests/list-synchronizer-trust-certificate-request.js";
import { ListVettedPackagesRequest } from "../core/types/requests/list-vetted-packages-request.js";
import { ListKnownPartiesRequest } from "../core/types/requests/list-known-parties-request.js";
import { ListKnownPackagesRequest } from "../core/types/requests/list-known-packages-request.js";
import { ListDarsRequest } from "../core/types/requests/list-dars-request.js";
import { ListIdentityProviderConfigsRequest } from "../core/types/requests/list-identity-provider-configs-request.js";
import { ListPendingOperationsRequest } from "../core/types/requests/list-pending-operations-request.js";
import { ListUserRightsRequest } from "../core/types/requests/list-user-rights-request.js";
import { ListUsersRequest } from "../core/types/requests/list-users-request.js";
import { LookupReceivedAcsCommitmentsRequest } from "../core/types/requests/lookup-received-acs-commitments-request.js";
import { LookupSentAcsCommitmentsRequest } from "../core/types/requests/lookup-sent-acs-commitments-request.js";
import { LookupOffsetByTimeRequest } from "../core/types/requests/lookup-offset-by-time-request.js";
import { OpenCommitmentRequest } from "../core/types/requests/open-commitment-request.js";
import { ParticipantListPackagesRequest } from "../core/types/requests/participant-list-packages-request.js";
import { SubmitCommandRequest } from "../core/types/requests/submit-command-request.js";
import { SignTopologyTransactionsRequest } from "../core/types/requests/sign-topology-transactions-request.js";
import { TopologyListPartiesRequest } from "../core/types/requests/topology-list-parties-request.js";
import { TopologyListVettedPackagesRequest } from "../core/types/requests/topology-list-vetted-packages-request.js";
import { TrafficControlStateRequest } from "../core/types/requests/traffic-control-state-request.js";
import { UploadDarFileRequest } from "../core/types/requests/upload-dar-file-request.js";
import { SignCommandResult } from "../core/signing/sign-command-result.js";
import { AllocateExternalPartyResponse } from "../core/types/responses/allocate-external-party-response.js";
import { AllocatePartyResponse } from "../core/types/responses/allocate-party-response.js";
import { AddPartyAsyncResponse } from "../core/types/responses/add-party-async-response.js";
import { AddTopologyTransactionsResponse } from "../core/types/responses/add-topology-transactions-response.js";
import { AuthorizeTopologyTransactionsResponse } from "../core/types/responses/authorize-topology-transactions-response.js";
import { ClearPartyOnboardingFlagResponse } from "../core/types/responses/clear-party-onboarding-flag-response.js";
import { CountInFlightResponse } from "../core/types/responses/count-in-flight-response.js";
import { CreateTemporaryTopologyStoreResponse } from "../core/types/responses/create-temporary-topology-store-response.js";
import { DropTemporaryTopologyStoreResponse } from "../core/types/responses/drop-temporary-topology-store-response.js";
import { GenerateExternalPartyTopologyResponse } from "../core/types/responses/generate-external-party-topology-response.js";
import { GenerateTopologyTransactionsResponse } from "../core/types/responses/generate-topology-transactions-response.js";
import { GetPackageContentsResponse } from "../core/types/responses/get-package-contents-response.js";
import { GetConnectedSynchronizersResponse } from "../core/types/responses/get-connected-synchronizers-response.js";
import { CurrentTimeResponse } from "../core/types/responses/current-time-response.js";
import { GetDarContentsResponse } from "../core/types/responses/get-dar-contents-response.js";
import { GetDarResponse } from "../core/types/responses/get-dar-response.js";
import { GetCommandStatusResponse } from "../core/types/responses/get-command-status-response.js";
import { GetContractResponse } from "../core/types/responses/get-contract-response.js";
import { GetEventsByContractIdResponse } from "../core/types/responses/get-events-by-contract-id-response.js";
import { GetConfigForSlowCounterParticipantsResponse } from "../core/types/responses/get-config-for-slow-counter-participants-response.js";
import { GetHighestOffsetByTimestampResponse } from "../core/types/responses/get-highest-offset-by-timestamp-response.js";
import { GetPackageReferencesResponse } from "../core/types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../core/types/responses/get-package-status-response.js";
import { GetLatestPrunedOffsetsResponse } from "../core/types/responses/get-latest-pruned-offsets-response.js";
import { GetParticipantStatusResponse } from "../core/types/responses/get-participant-status-response.js";
import { GetActiveContractsPageResponse } from "../core/types/responses/get-active-contracts-page-response.js";
import { GetIdentityProviderConfigResponse } from "../core/types/responses/get-identity-provider-config-response.js";
import { GetIdResponse } from "../core/types/responses/get-id-response.js";
import { GetIntervalsBehindForCounterParticipantsResponse } from "../core/types/responses/get-intervals-behind-for-counter-participants-response.js";
import { InspectCommitmentContractsResponse } from "../core/types/responses/inspect-commitment-contracts-response.js";
import { GetNoWaitCommitmentsFromResponse } from "../core/types/responses/get-no-wait-commitments-from-response.js";
import { GetLedgerEndResponse } from "../core/types/responses/get-ledger-end-response.js";
import { GetLedgerApiVersionResponse } from "../core/types/responses/get-ledger-api-version-response.js";
import { GetParticipantIdResponse } from "../core/types/responses/get-participant-id-response.js";
import { GetParticipantPruningScheduleResponse } from "../core/types/responses/get-participant-pruning-schedule-response.js";
import { GetPartiesResponse } from "../core/types/responses/get-parties-response.js";
import { GetPruningScheduleResponse } from "../core/types/responses/get-pruning-schedule-response.js";
import { GetResourceLimitsResponse } from "../core/types/responses/get-resource-limits-response.js";
import { GetSafePruningOffsetResponse } from "../core/types/responses/get-safe-pruning-offset-response.js";
import { GetSynchronizerIdResponse } from "../core/types/responses/get-synchronizer-id-response.js";
import { GetUpdateByHashResponse } from "../core/types/responses/get-update-by-hash-response.js";
import { GetUpdateByIdResponse } from "../core/types/responses/get-update-by-id-response.js";
import { GetUpdateByOffsetResponse } from "../core/types/responses/get-update-by-offset-response.js";
import { GetUpdatesPageResponse } from "../core/types/responses/get-updates-page-response.js";
import { GetUserResponse } from "../core/types/responses/get-user-response.js";
import { GrantUserRightsResponse } from "../core/types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../core/types/responses/health-check-response.js";
import { ImportTopologySnapshotResponse } from "../core/types/responses/import-topology-snapshot-response.js";
import { ImportTopologySnapshotV2Response } from "../core/types/responses/import-topology-snapshot-v2-response.js";
import { ListAllResponse } from "../core/types/responses/list-all-response.js";
import { ListAllV2Response } from "../core/types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../core/types/responses/list-available-stores-response.js";
import { ListConnectedSynchronizersResponse } from "../core/types/responses/list-connected-synchronizers-response.js";
import { ListRegisteredSynchronizersResponse } from "../core/types/responses/list-registered-synchronizers-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../core/types/responses/list-decentralized-namespace-definition-response.js";
import { ListKeyOwnersResponse } from "../core/types/responses/list-key-owners-response.js";
import { ListLsuAnnouncementResponse } from "../core/types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../core/types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../core/types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../core/types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../core/types/responses/list-owner-to-key-mapping-response.js";
import { ListPackagesResponse } from "../core/types/responses/list-packages-response.js";
import { ListKnownPartiesResponse } from "../core/types/responses/list-known-parties-response.js";
import { ListDarsResponse } from "../core/types/responses/list-dars-response.js";
import { ListKnownPackagesResponse } from "../core/types/responses/list-known-packages-response.js";
import { ListIdentityProviderConfigsResponse } from "../core/types/responses/list-identity-provider-configs-response.js";
import { ListPendingOperationsResponse } from "../core/types/responses/list-pending-operations-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../core/types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../core/types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../core/types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../core/types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../core/types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../core/types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../core/types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../core/types/responses/list-synchronizer-trust-certificate-response.js";
import { ListUserRightsResponse } from "../core/types/responses/list-user-rights-response.js";
import { ListUsersResponse } from "../core/types/responses/list-users-response.js";
import { LookupReceivedAcsCommitmentsResponse } from "../core/types/responses/lookup-received-acs-commitments-response.js";
import { LookupSentAcsCommitmentsResponse } from "../core/types/responses/lookup-sent-acs-commitments-response.js";
import { LookupOffsetByTimeResponse } from "../core/types/responses/lookup-offset-by-time-response.js";
import { OpenCommitmentResponse } from "../core/types/responses/open-commitment-response.js";
import { TopologyListPartiesResponse } from "../core/types/responses/topology-list-parties-response.js";
import { ListVettedPackagesResponse } from "../core/types/responses/list-vetted-packages-response.js";
import { SignTopologyTransactionsResponse } from "../core/types/responses/sign-topology-transactions-response.js";
import { TopologyListVettedPackagesResponse } from "../core/types/responses/topology-list-vetted-packages-response.js";
import { TrafficControlStateResponse } from "../core/types/responses/traffic-control-state-response.js";
import { ParticipantListPackagesResponse } from "../core/types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../core/types/responses/upload-dar-file-response.js";
import { TransportError } from "../core/errors/transport-error.js";
import { ObjectDisposedError } from "../core/errors/object-disposed-error.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { RequestOptions } from "../core/types/request-options.js";
import { EndpointNotConfiguredError } from "../core/errors/endpoint-not-configured-error.js";
import { GrpcChannelSecurity } from "../core/types/grpc-channel-security.js";
import { CommandCompletionServiceClient } from "../services/command-completion/command-completion-service-client.js";
import { CommandInspectionServiceClient } from "../services/command-inspection/command-inspection-service-client.js";
import { CompletionObserver } from "../services/command-completion/completion-observer.interface.js";
import { CommitmentChunkObserver } from "../services/participant-inspection/commitment-chunk-observer.interface.js";
import { CommandServiceClient } from "../services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../services/contract/contract-service-client.js";
import { ContractObserver } from "../services/contracts/contract-observer.interface.js";
import { EventQueryServiceClient } from "../services/event-query/event-query-service-client.js";
import { HealthServiceClient } from "../services/health/health-service-client.js";
import { IdentityInitializationServiceClient } from "../services/identity-initialization/identity-initialization-service-client.js";
import { IdentityProviderConfigServiceClient } from "../services/identity-provider-config/identity-provider-config-service-client.js";
import { PackageManagementServiceClient } from "../services/package-management/package-management-service-client.js";
import { PackageServiceClient } from "../services/package/package-service-client.js";
import { ParticipantInspectionServiceClient } from "../services/participant-inspection/participant-inspection-service-client.js";
import { ParticipantPartyManagementServiceClient } from "../services/participant-party-management/participant-party-management-service-client.js";
import { ParticipantPackageServiceClient } from "../services/participant-package/participant-package-service-client.js";
import { ParticipantRepairServiceClient } from "../services/participant-repair/participant-repair-service-client.js";
import { ParticipantStatusServiceClient } from "../services/participant-status/participant-status-service-client.js";
import { PartyManagementServiceClient } from "../services/party-management/party-management-service-client.js";
import { PruningServiceClient } from "../services/pruning/pruning-service-client.js";
import { ResourceManagementServiceClient } from "../services/resource-management/resource-management-service-client.js";
import { StateServiceClient } from "../services/state/state-service-client.js";
import { TopologyAggregationServiceClient } from "../services/topology-aggregation/topology-aggregation-service-client.js";
import { TopologyManagerReadServiceClient } from "../services/topology-manager-read/topology-manager-read-service-client.js";
import { TopologyManagerWriteServiceClient } from "../services/topology-manager-write/topology-manager-write-service-client.js";
import { TrafficControlServiceClient } from "../services/traffic-control/traffic-control-service-client.js";
import { UpdateServiceClient } from "../services/update/update-service-client.js";
import { UserManagementServiceClient } from "../services/user-management/user-management-service-client.js";
import { VersionServiceClient } from "../services/version/version-service-client.js";
import { SynchronizerConnectivityServiceClient } from "../services/synchronizer-connectivity/synchronizer-connectivity-service-client.js";
import { createJsonTransport } from "../transports/json/json-transport-factory.js";
import { createGrpcTransport } from "../transports/grpc/grpc-transport-factory.js";
import { TransactionObserver } from "../services/events/transaction-observer.interface.js";

export interface ServiceRegistry {
    readonly transport: ITransport;
    readonly versionService: VersionServiceClient;
    readonly healthService: HealthServiceClient;
    readonly partyManagementService: PartyManagementServiceClient;
    readonly userManagementService: UserManagementServiceClient;
    readonly commandInspectionService: CommandInspectionServiceClient;
    readonly identityProviderConfigService: IdentityProviderConfigServiceClient;
    readonly packageService: PackageServiceClient;
    readonly packageManagementService: PackageManagementServiceClient;
    readonly participantPackageService: ParticipantPackageServiceClient;
    readonly participantInspectionService: ParticipantInspectionServiceClient;
    readonly participantPartyManagementService: ParticipantPartyManagementServiceClient;
    readonly participantRepairService: ParticipantRepairServiceClient;
    readonly participantStatusService: ParticipantStatusServiceClient;
    readonly pruningService: PruningServiceClient;
    readonly resourceManagementService: ResourceManagementServiceClient;
    readonly identityInitializationService: IdentityInitializationServiceClient;
    readonly synchronizerConnectivityService: SynchronizerConnectivityServiceClient;
    readonly topologyManagerReadService: TopologyManagerReadServiceClient;
    readonly topologyManagerWriteService: TopologyManagerWriteServiceClient;
    readonly trafficControlService: TrafficControlServiceClient;
    readonly topologyAggregationService: TopologyAggregationServiceClient;
    readonly commandService: CommandServiceClient;
    readonly commandSubmissionService: CommandSubmissionServiceClient;
    readonly commandCompletionService: CommandCompletionServiceClient;
    readonly stateService: StateServiceClient;
    readonly updateService: UpdateServiceClient;
    readonly eventQueryService: EventQueryServiceClient;
    readonly contractService: ContractServiceClient;
}

class PlaceholderTransport implements ITransport {
    private disposed = false;

    public readonly features;

    public constructor(options: CantonClientOptions) {
        this.features = {
            supportsCommandSigning:
                options.transportKind === TransportKind.grpc,
        };
    }

    public async disposeAsync(): Promise<void> {
        this.disposed = true;
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
        _options?: RequestOptions,
    ): Promise<GetLedgerApiVersionResponse> {
        this.throwIfDisposed();

        throw new TransportError("ledger api version is not available yet");
    }

    public async checkHealthAsync(
        _request: HealthCheckRequest,
        _options?: RequestOptions,
    ): Promise<HealthCheckResponse> {
        this.throwIfDisposed();

        throw new TransportError("gRPC health checks are not available yet");
    }

    public async allocatePartyAsync(
        _request: AllocatePartyRequest,
        _options?: RequestOptions,
    ): Promise<AllocatePartyResponse> {
        this.throwIfDisposed();

        throw new TransportError("party allocation is not available yet");
    }

    public async generateExternalPartyTopologyAsync(
        _request: GenerateExternalPartyTopologyRequest,
        _options?: RequestOptions,
    ): Promise<GenerateExternalPartyTopologyResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "external party topology generation is not available yet",
        );
    }

    public async allocateExternalPartyAsync(
        _request: AllocateExternalPartyRequest,
        _options?: RequestOptions,
    ): Promise<AllocateExternalPartyResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "external party allocation is not available yet",
        );
    }

    public async listKnownPartiesAsync(
        _request: ListKnownPartiesRequest,
        _options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse> {
        this.throwIfDisposed();

        throw new TransportError("known party listing is not available yet");
    }

    public async getParticipantIdAsync(
        _request: GetParticipantIdRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantIdResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant id reads are not available yet");
    }

    public async getPartiesAsync(
        _request: GetPartiesRequest,
        _options?: RequestOptions,
    ): Promise<GetPartiesResponse> {
        this.throwIfDisposed();

        throw new TransportError("party detail reads are not available yet");
    }

    public async grantUserRightsAsync(
        _request: GrantUserRightsRequest,
        _options?: RequestOptions,
    ): Promise<GrantUserRightsResponse> {
        this.throwIfDisposed();

        throw new TransportError("user rights management is not available yet");
    }

    public async getCommandStatusAsync(
        _request: GetCommandStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetCommandStatusResponse> {
        this.throwIfDisposed();

        throw new TransportError("command inspection reads are not available yet");
    }

    public async getUserAsync(
        _request: GetUserRequest,
        _options?: RequestOptions,
    ): Promise<GetUserResponse> {
        this.throwIfDisposed();

        throw new TransportError("user reads are not available yet");
    }

    public async listUsersAsync(
        _request: ListUsersRequest,
        _options?: RequestOptions,
    ): Promise<ListUsersResponse> {
        this.throwIfDisposed();

        throw new TransportError("user listing is not available yet");
    }

    public async listUserRightsAsync(
        _request: ListUserRightsRequest,
        _options?: RequestOptions,
    ): Promise<ListUserRightsResponse> {
        this.throwIfDisposed();

        throw new TransportError("user rights reads are not available yet");
    }

    public async uploadDarFileAsync(
        _request: UploadDarFileRequest,
        _options?: RequestOptions,
    ): Promise<UploadDarFileResponse> {
        this.throwIfDisposed();

        throw new TransportError("dar upload is not available yet");
    }

    public async listKnownPackagesAsync(
        _request: ListKnownPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ListKnownPackagesResponse> {
        this.throwIfDisposed();

        throw new TransportError("known package listing is not available yet");
    }

    public async getIdentityProviderConfigAsync(
        _request: GetIdentityProviderConfigRequest,
        _options?: RequestOptions,
    ): Promise<GetIdentityProviderConfigResponse> {
        this.throwIfDisposed();

        throw new TransportError("identity provider config reads are not available yet");
    }

    public async listIdentityProviderConfigsAsync(
        _request: ListIdentityProviderConfigsRequest,
        _options?: RequestOptions,
    ): Promise<ListIdentityProviderConfigsResponse> {
        this.throwIfDisposed();

        throw new TransportError("identity provider config listing is not available yet");
    }

    public async listPackagesAsync(
        _request: ListPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ListPackagesResponse> {
        this.throwIfDisposed();

        throw new TransportError("ledger package listing is not available yet");
    }

    public async getPackageAsync(
        _request: GetPackageRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageResponse> {
        this.throwIfDisposed();

        throw new TransportError("ledger package reads are not available yet");
    }

    public async getPackageStatusAsync(
        _request: GetPackageStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageStatusResponse> {
        this.throwIfDisposed();

        throw new TransportError("ledger package status is not available yet");
    }

    public async listVettedPackagesAsync(
        _request: ListVettedPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ListVettedPackagesResponse> {
        this.throwIfDisposed();

        throw new TransportError("vetted package reads are not available yet");
    }

    public async listParticipantPackagesAsync(
        _request: ParticipantListPackagesRequest,
        _options?: RequestOptions,
    ): Promise<ParticipantListPackagesResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant package listing is not available yet");
    }

    public async getParticipantPackageContentsAsync(
        _request: GetPackageContentsRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageContentsResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant package contents are not available yet");
    }

    public async getParticipantPackageReferencesAsync(
        _request: GetPackageReferencesRequest,
        _options?: RequestOptions,
    ): Promise<GetPackageReferencesResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant package references are not available yet");
    }

    public async getParticipantDarAsync(
        _request: GetDarRequest,
        _options?: RequestOptions,
    ): Promise<GetDarResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant dar reads are not available yet");
    }

    public async listParticipantDarsAsync(
        _request: ListDarsRequest,
        _options?: RequestOptions,
    ): Promise<ListDarsResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant dar listing is not available yet");
    }

    public async getParticipantDarContentsAsync(
        _request: GetDarContentsRequest,
        _options?: RequestOptions,
    ): Promise<GetDarContentsResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant dar contents are not available yet");
    }

    public async getParticipantStatusAsync(
        _request: GetParticipantStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant status is not available yet");
    }

    public async lookupOffsetByTimeAsync(
        _request: LookupOffsetByTimeRequest,
        _options?: RequestOptions,
    ): Promise<LookupOffsetByTimeResponse> {
        this.throwIfDisposed();

        throw new TransportError("lookup offset by time is not available yet");
    }

    public async openCommitmentAsync(
        _request: OpenCommitmentRequest,
        _observer: CommitmentChunkObserver<OpenCommitmentResponse>,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new TransportError("open commitment inspection is not available yet");
    }

    public async inspectCommitmentContractsAsync(
        _request: InspectCommitmentContractsRequest,
        _observer: CommitmentChunkObserver<InspectCommitmentContractsResponse>,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new TransportError("commitment contract inspection is not available yet");
    }

    public async countInFlightAsync(
        _request: CountInFlightRequest,
        _options?: RequestOptions,
    ): Promise<CountInFlightResponse> {
        this.throwIfDisposed();

        throw new TransportError("count in flight is not available yet");
    }

    public async getConfigForSlowCounterParticipantsAsync(
        _request: GetConfigForSlowCounterParticipantsRequest,
        _options?: RequestOptions,
    ): Promise<GetConfigForSlowCounterParticipantsResponse> {
        this.throwIfDisposed();

        throw new TransportError("slow counter participant config is not available yet");
    }

    public async getIntervalsBehindForCounterParticipantsAsync(
        _request: GetIntervalsBehindForCounterParticipantsRequest,
        _options?: RequestOptions,
    ): Promise<GetIntervalsBehindForCounterParticipantsResponse> {
        this.throwIfDisposed();

        throw new TransportError("intervals behind for counter participants is not available yet");
    }

    public async lookupSentAcsCommitmentsAsync(
        _request: LookupSentAcsCommitmentsRequest,
        _options?: RequestOptions,
    ): Promise<LookupSentAcsCommitmentsResponse> {
        this.throwIfDisposed();

        throw new TransportError("sent ACS commitment inspection is not available yet");
    }

    public async lookupReceivedAcsCommitmentsAsync(
        _request: LookupReceivedAcsCommitmentsRequest,
        _options?: RequestOptions,
    ): Promise<LookupReceivedAcsCommitmentsResponse> {
        this.throwIfDisposed();

        throw new TransportError("received ACS commitment inspection is not available yet");
    }

    public async addPartyAsync(
        _request: AddPartyAsyncRequest,
        _options?: RequestOptions,
    ): Promise<AddPartyAsyncResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant party replication is not available yet");
    }

    public async clearPartyOnboardingFlagAsync(
        _request: ClearPartyOnboardingFlagRequest,
        _options?: RequestOptions,
    ): Promise<ClearPartyOnboardingFlagResponse> {
        this.throwIfDisposed();

        throw new TransportError("party onboarding flag clearing is not available yet");
    }

    public async getHighestOffsetByTimestampAsync(
        _request: GetHighestOffsetByTimestampRequest,
        _options?: RequestOptions,
    ): Promise<GetHighestOffsetByTimestampResponse> {
        this.throwIfDisposed();

        throw new TransportError("highest offset by timestamp is not available yet");
    }

    public async getSafePruningOffsetAsync(
        _request: GetSafePruningOffsetRequest,
        _options?: RequestOptions,
    ): Promise<GetSafePruningOffsetResponse> {
        this.throwIfDisposed();

        throw new TransportError("safe pruning offset is not available yet");
    }

    public async getPruningScheduleAsync(
        _request: GetPruningScheduleRequest,
        _options?: RequestOptions,
    ): Promise<GetPruningScheduleResponse> {
        this.throwIfDisposed();

        throw new TransportError("pruning schedule is not available yet");
    }

    public async getParticipantPruningScheduleAsync(
        _request: GetParticipantPruningScheduleRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantPruningScheduleResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant pruning schedule is not available yet");
    }

    public async getNoWaitCommitmentsFromAsync(
        _request: GetNoWaitCommitmentsFromRequest,
        _options?: RequestOptions,
    ): Promise<GetNoWaitCommitmentsFromResponse> {
        this.throwIfDisposed();

        throw new TransportError("no-wait commitments configuration is not available yet");
    }

    public async trafficControlStateAsync(
        _request: TrafficControlStateRequest,
        _options?: RequestOptions,
    ): Promise<TrafficControlStateResponse> {
        this.throwIfDisposed();

        throw new TransportError("traffic control state is not available yet");
    }

    public async listConnectedSynchronizersAsync(
        _request: ListConnectedSynchronizersRequest,
        _options?: RequestOptions,
    ): Promise<ListConnectedSynchronizersResponse> {
        this.throwIfDisposed();

        throw new TransportError("list connected synchronizers is not available yet");
    }

    public async getSynchronizerIdAsync(
        _request: GetSynchronizerIdRequest,
        _options?: RequestOptions,
    ): Promise<GetSynchronizerIdResponse> {
        this.throwIfDisposed();

        throw new TransportError("get synchronizer id is not available yet");
    }

    public async listRegisteredSynchronizersAsync(
        _request: ListRegisteredSynchronizersRequest,
        _options?: RequestOptions,
    ): Promise<ListRegisteredSynchronizersResponse> {
        this.throwIfDisposed();

        throw new TransportError("registered synchronizer listing is not available yet");
    }

    public async listPendingOperationsAsync(
        _request: ListPendingOperationsRequest,
        _options?: RequestOptions,
    ): Promise<ListPendingOperationsResponse> {
        this.throwIfDisposed();

        throw new TransportError("pending operation listing is not available yet");
    }

    public async getResourceLimitsAsync(
        _request: GetResourceLimitsRequest,
        _options?: RequestOptions,
    ): Promise<GetResourceLimitsResponse> {
        this.throwIfDisposed();

        throw new TransportError("resource limits are not available yet");
    }

    public async getIdAsync(
        _request: GetIdRequest,
        _options?: RequestOptions,
    ): Promise<GetIdResponse> {
        this.throwIfDisposed();

        throw new TransportError("identity initialization id is not available yet");
    }

    public async currentTimeAsync(
        _request: CurrentTimeRequest,
        _options?: RequestOptions,
    ): Promise<CurrentTimeResponse> {
        this.throwIfDisposed();

        throw new TransportError("identity initialization current time is not available yet");
    }

    public async getContractAsync(
        _request: GetContractRequest,
        _options?: RequestOptions,
    ): Promise<GetContractResponse> {
        this.throwIfDisposed();

        throw new TransportError("contract reads are not available yet");
    }

    public async getEventsByContractIdAsync(
        _request: GetEventsByContractIdRequest,
        _options?: RequestOptions,
    ): Promise<GetEventsByContractIdResponse> {
        this.throwIfDisposed();

        throw new TransportError("event query reads are not available yet");
    }

    public async listNamespaceDelegationAsync(
        _request: ListNamespaceDelegationRequest,
        _options?: RequestOptions,
    ): Promise<ListNamespaceDelegationResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology namespace delegations are not available yet");
    }

    public async listDecentralizedNamespaceDefinitionAsync(
        _request: ListDecentralizedNamespaceDefinitionRequest,
        _options?: RequestOptions,
    ): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology decentralized namespaces are not available yet");
    }

    public async listOwnerToKeyMappingAsync(
        _request: ListOwnerToKeyMappingRequest,
        _options?: RequestOptions,
    ): Promise<ListOwnerToKeyMappingResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology owner-to-key mappings are not available yet");
    }

    public async listPartyToKeyMappingAsync(
        _request: ListPartyToKeyMappingRequest,
        _options?: RequestOptions,
    ): Promise<ListPartyToKeyMappingResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology party-to-key mappings are not available yet");
    }

    public async listSynchronizerTrustCertificateAsync(
        _request: ListSynchronizerTrustCertificateRequest,
        _options?: RequestOptions,
    ): Promise<ListSynchronizerTrustCertificateResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology synchronizer trust certificates are not available yet");
    }

    public async listParticipantSynchronizerPermissionAsync(
        _request: ListParticipantSynchronizerPermissionRequest,
        _options?: RequestOptions,
    ): Promise<ListParticipantSynchronizerPermissionResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology participant synchronizer permissions are not available yet");
    }

    public async authorizeTopologyTransactionsAsync(
        _request: AuthorizeTopologyTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<AuthorizeTopologyTransactionsResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology transaction authorization is not available yet");
    }

    public async addTopologyTransactionsAsync(
        _request: AddTopologyTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<AddTopologyTransactionsResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology transaction writes are not available yet");
    }

    public async importTopologySnapshotAsync(
        _request: ImportTopologySnapshotRequest,
        _options?: RequestOptions,
    ): Promise<ImportTopologySnapshotResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology snapshot import is not available yet");
    }

    public async importTopologySnapshotV2Async(
        _request: ImportTopologySnapshotV2Request,
        _options?: RequestOptions,
    ): Promise<ImportTopologySnapshotV2Response> {
        this.throwIfDisposed();

        throw new TransportError("topology snapshot import v2 is not available yet");
    }

    public async signTopologyTransactionsAsync(
        _request: SignTopologyTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<SignTopologyTransactionsResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology transaction signing is not available yet");
    }

    public async generateTopologyTransactionsAsync(
        _request: GenerateTopologyTransactionsRequest,
        _options?: RequestOptions,
    ): Promise<GenerateTopologyTransactionsResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology transaction generation is not available yet");
    }

    public async createTemporaryTopologyStoreAsync(
        _request: CreateTemporaryTopologyStoreRequest,
        _options?: RequestOptions,
    ): Promise<CreateTemporaryTopologyStoreResponse> {
        this.throwIfDisposed();

        throw new TransportError("temporary topology stores are not available yet");
    }

    public async dropTemporaryTopologyStoreAsync(
        _request: DropTemporaryTopologyStoreRequest,
        _options?: RequestOptions,
    ): Promise<DropTemporaryTopologyStoreResponse> {
        this.throwIfDisposed();

        throw new TransportError("temporary topology store deletion is not available yet");
    }

    public async listPartyHostingLimitsAsync(
        _request: ListPartyHostingLimitsRequest,
        _options?: RequestOptions,
    ): Promise<ListPartyHostingLimitsResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology party hosting limits are not available yet");
    }

    public async topologyListVettedPackagesAsync(
        _request: TopologyListVettedPackagesRequest,
        _options?: RequestOptions,
    ): Promise<TopologyListVettedPackagesResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology vetted packages are not available yet");
    }

    public async listPartyToParticipantAsync(
        _request: ListPartyToParticipantRequest,
        _options?: RequestOptions,
    ): Promise<ListPartyToParticipantResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology party-to-participant mappings are not available yet");
    }

    public async listSynchronizerParametersStateAsync(
        _request: ListSynchronizerParametersStateRequest,
        _options?: RequestOptions,
    ): Promise<ListSynchronizerParametersStateResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology synchronizer parameters are not available yet");
    }

    public async listSequencingParametersStateAsync(
        _request: ListSequencingParametersStateRequest,
        _options?: RequestOptions,
    ): Promise<ListSequencingParametersStateResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology sequencing parameters are not available yet");
    }

    public async listMediatorSynchronizerStateAsync(
        _request: ListMediatorSynchronizerStateRequest,
        _options?: RequestOptions,
    ): Promise<ListMediatorSynchronizerStateResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology mediator synchronizer state is not available yet");
    }

    public async listSequencerSynchronizerStateAsync(
        _request: ListSequencerSynchronizerStateRequest,
        _options?: RequestOptions,
    ): Promise<ListSequencerSynchronizerStateResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology sequencer synchronizer state is not available yet");
    }

    public async listLsuAnnouncementAsync(
        _request: ListLsuAnnouncementRequest,
        _options?: RequestOptions,
    ): Promise<ListLsuAnnouncementResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology lsu announcements are not available yet");
    }

    public async listLsuSequencerConnectionSuccessorAsync(
        _request: ListLsuSequencerConnectionSuccessorRequest,
        _options?: RequestOptions,
    ): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology lsu sequencer connection successors are not available yet");
    }

    public async listAvailableStoresAsync(
        _request: ListAvailableStoresRequest,
        _options?: RequestOptions,
    ): Promise<ListAvailableStoresResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology stores are not available yet");
    }

    public async listAllAsync(
        _request: ListAllRequest,
        _options?: RequestOptions,
    ): Promise<ListAllResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology list-all is not available yet");
    }

    public async listAllV2Async(
        _request: ListAllV2Request,
        _options?: RequestOptions,
    ): Promise<ListAllV2Response> {
        this.throwIfDisposed();

        throw new TransportError("topology list-all-v2 is not available yet");
    }

    public async topologyListPartiesAsync(
        _request: TopologyListPartiesRequest,
        _options?: RequestOptions,
    ): Promise<TopologyListPartiesResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology list parties is not available yet");
    }

    public async listKeyOwnersAsync(
        _request: ListKeyOwnersRequest,
        _options?: RequestOptions,
    ): Promise<ListKeyOwnersResponse> {
        this.throwIfDisposed();

        throw new TransportError("topology key owners are not available yet");
    }

    public async getActiveContractsPageAsync(
        _request: GetActiveContractsPageRequest,
        _options?: RequestOptions,
    ): Promise<GetActiveContractsPageResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "StateService.GetActiveContractsPage is not available yet",
        );
    }

    public async getConnectedSynchronizersAsync(
        _request: GetConnectedSynchronizersRequest,
        _options?: RequestOptions,
    ): Promise<GetConnectedSynchronizersResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "StateService.GetConnectedSynchronizers is not available yet",
        );
    }

    public async getLedgerEndAsync(
        _request: GetLedgerEndRequest,
        _options?: RequestOptions,
    ): Promise<GetLedgerEndResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "StateService.GetLedgerEnd is not available yet",
        );
    }

    public async getLatestPrunedOffsetsAsync(
        _request: GetLatestPrunedOffsetsRequest,
        _options?: RequestOptions,
    ): Promise<GetLatestPrunedOffsetsResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "StateService.GetLatestPrunedOffsets is not available yet",
        );
    }

    public async getActiveContractsAsync(
        _request: GetActiveContractsRequest,
        _observer: ContractObserver,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new TransportError(
            "StateService.GetActiveContracts is not available yet",
        );
    }

    public async getUpdatesAsync(
        _request: GetUpdatesRequest,
        _observer: TransactionObserver,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new TransportError("UpdateService.GetUpdates is not available yet");
    }

    public async getUpdateByOffsetAsync(
        _request: GetUpdateByOffsetRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdateByOffsetResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "UpdateService.GetUpdateByOffset is not available yet",
        );
    }

    public async getUpdateByIdAsync(
        _request: GetUpdateByIdRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdateByIdResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "UpdateService.GetUpdateById is not available yet",
        );
    }

    public async getUpdateByHashAsync(
        _request: GetUpdateByHashRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdateByHashResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "UpdateService.GetUpdateByHash is not available yet",
        );
    }

    public async getUpdatesPageAsync(
        _request: GetUpdatesPageRequest,
        _options?: RequestOptions,
    ): Promise<GetUpdatesPageResponse> {
        this.throwIfDisposed();

        throw new TransportError(
            "UpdateService.GetUpdatesPage is not available yet",
        );
    }

    public async getCompletionsAsync(
        _request: GetCompletionsRequest,
        _observer: CompletionObserver,
        _options?: RequestOptions,
    ): Promise<void> {
        this.throwIfDisposed();

        throw new TransportError(
            "CommandCompletionService.GetCompletions is not available yet",
        );
    }

    public async submitCommandAsync(
        _request: SubmitCommandRequest,
        _signed?: SignCommandResult,
        _options?: RequestOptions,
    ): Promise<SubmitCommandResponse> {
        this.throwIfDisposed();

        throw new TransportError("command submission is not available yet");
    }

    private throwIfDisposed(): void {
        if (this.disposed) {
            throw new ObjectDisposedError(
                "The client or transport has been disposed.",
            );
        }
    }
}

class MissingEndpointTransport implements ITransport {
    public readonly features;

    public constructor(
        private readonly serviceName: string,
        private readonly surfaceName:
            | "ledger"
            | "ledger admin"
            | "participant admin",
        transportKind: TransportKind,
    ) {
        this.features = {
            supportsCommandSigning: transportKind === TransportKind.grpc,
        };
    }

    public async disposeAsync(): Promise<void> {
        return;
    }

    public async getLedgerApiVersionAsync(): Promise<GetLedgerApiVersionResponse> {
        this.throwMissingEndpoint();
    }

    public async checkHealthAsync(): Promise<HealthCheckResponse> {
        this.throwMissingEndpoint();
    }

    public async allocatePartyAsync(): Promise<AllocatePartyResponse> {
        this.throwMissingEndpoint();
    }

    public async generateExternalPartyTopologyAsync(): Promise<GenerateExternalPartyTopologyResponse> {
        this.throwMissingEndpoint();
    }

    public async allocateExternalPartyAsync(): Promise<AllocateExternalPartyResponse> {
        this.throwMissingEndpoint();
    }

    public async listKnownPartiesAsync(): Promise<ListKnownPartiesResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantIdAsync(): Promise<GetParticipantIdResponse> {
        this.throwMissingEndpoint();
    }

    public async getPartiesAsync(): Promise<GetPartiesResponse> {
        this.throwMissingEndpoint();
    }

    public async grantUserRightsAsync(): Promise<GrantUserRightsResponse> {
        this.throwMissingEndpoint();
    }

    public async getCommandStatusAsync(): Promise<GetCommandStatusResponse> {
        this.throwMissingEndpoint();
    }

    public async getUserAsync(): Promise<GetUserResponse> {
        this.throwMissingEndpoint();
    }

    public async listUsersAsync(): Promise<ListUsersResponse> {
        this.throwMissingEndpoint();
    }

    public async listUserRightsAsync(): Promise<ListUserRightsResponse> {
        this.throwMissingEndpoint();
    }

    public async uploadDarFileAsync(): Promise<UploadDarFileResponse> {
        this.throwMissingEndpoint();
    }

    public async listKnownPackagesAsync(): Promise<ListKnownPackagesResponse> {
        this.throwMissingEndpoint();
    }

    public async getIdentityProviderConfigAsync(): Promise<GetIdentityProviderConfigResponse> {
        this.throwMissingEndpoint();
    }

    public async listIdentityProviderConfigsAsync(): Promise<ListIdentityProviderConfigsResponse> {
        this.throwMissingEndpoint();
    }

    public async listPackagesAsync(): Promise<ListPackagesResponse> {
        this.throwMissingEndpoint();
    }

    public async getPackageAsync(): Promise<GetPackageResponse> {
        this.throwMissingEndpoint();
    }

    public async getPackageStatusAsync(): Promise<GetPackageStatusResponse> {
        this.throwMissingEndpoint();
    }

    public async listVettedPackagesAsync(): Promise<ListVettedPackagesResponse> {
        this.throwMissingEndpoint();
    }

    public async listParticipantPackagesAsync(): Promise<ParticipantListPackagesResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantPackageContentsAsync(): Promise<GetPackageContentsResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantPackageReferencesAsync(): Promise<GetPackageReferencesResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantDarAsync(): Promise<GetDarResponse> {
        this.throwMissingEndpoint();
    }

    public async listParticipantDarsAsync(): Promise<ListDarsResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantDarContentsAsync(): Promise<GetDarContentsResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantStatusAsync(): Promise<GetParticipantStatusResponse> {
        this.throwMissingEndpoint();
    }

    public async lookupOffsetByTimeAsync(): Promise<LookupOffsetByTimeResponse> {
        this.throwMissingEndpoint();
    }

    public async openCommitmentAsync(): Promise<void> {
        this.throwMissingEndpoint();
    }

    public async inspectCommitmentContractsAsync(): Promise<void> {
        this.throwMissingEndpoint();
    }

    public async countInFlightAsync(): Promise<CountInFlightResponse> {
        this.throwMissingEndpoint();
    }

    public async getConfigForSlowCounterParticipantsAsync(): Promise<GetConfigForSlowCounterParticipantsResponse> {
        this.throwMissingEndpoint();
    }

    public async getIntervalsBehindForCounterParticipantsAsync(): Promise<GetIntervalsBehindForCounterParticipantsResponse> {
        this.throwMissingEndpoint();
    }

    public async lookupSentAcsCommitmentsAsync(): Promise<LookupSentAcsCommitmentsResponse> {
        this.throwMissingEndpoint();
    }

    public async lookupReceivedAcsCommitmentsAsync(): Promise<LookupReceivedAcsCommitmentsResponse> {
        this.throwMissingEndpoint();
    }

    public async addPartyAsync(): Promise<AddPartyAsyncResponse> {
        this.throwMissingEndpoint();
    }

    public async clearPartyOnboardingFlagAsync(): Promise<ClearPartyOnboardingFlagResponse> {
        this.throwMissingEndpoint();
    }

    public async getHighestOffsetByTimestampAsync(): Promise<GetHighestOffsetByTimestampResponse> {
        this.throwMissingEndpoint();
    }

    public async getSafePruningOffsetAsync(): Promise<GetSafePruningOffsetResponse> {
        this.throwMissingEndpoint();
    }

    public async getPruningScheduleAsync(): Promise<GetPruningScheduleResponse> {
        this.throwMissingEndpoint();
    }

    public async getParticipantPruningScheduleAsync(): Promise<GetParticipantPruningScheduleResponse> {
        this.throwMissingEndpoint();
    }

    public async getNoWaitCommitmentsFromAsync(): Promise<GetNoWaitCommitmentsFromResponse> {
        this.throwMissingEndpoint();
    }

    public async trafficControlStateAsync(): Promise<TrafficControlStateResponse> {
        this.throwMissingEndpoint();
    }

    public async listConnectedSynchronizersAsync(): Promise<ListConnectedSynchronizersResponse> {
        this.throwMissingEndpoint();
    }

    public async getSynchronizerIdAsync(): Promise<GetSynchronizerIdResponse> {
        this.throwMissingEndpoint();
    }

    public async listRegisteredSynchronizersAsync(): Promise<ListRegisteredSynchronizersResponse> {
        this.throwMissingEndpoint();
    }

    public async listPendingOperationsAsync(): Promise<ListPendingOperationsResponse> {
        this.throwMissingEndpoint();
    }

    public async getResourceLimitsAsync(): Promise<GetResourceLimitsResponse> {
        this.throwMissingEndpoint();
    }

    public async getIdAsync(): Promise<GetIdResponse> {
        this.throwMissingEndpoint();
    }

    public async currentTimeAsync(): Promise<CurrentTimeResponse> {
        this.throwMissingEndpoint();
    }

    public async getContractAsync(): Promise<GetContractResponse> {
        this.throwMissingEndpoint();
    }

    public async getEventsByContractIdAsync(): Promise<GetEventsByContractIdResponse> {
        this.throwMissingEndpoint();
    }

    public async listNamespaceDelegationAsync(): Promise<ListNamespaceDelegationResponse> {
        this.throwMissingEndpoint();
    }

    public async listDecentralizedNamespaceDefinitionAsync(): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        this.throwMissingEndpoint();
    }

    public async listOwnerToKeyMappingAsync(): Promise<ListOwnerToKeyMappingResponse> {
        this.throwMissingEndpoint();
    }

    public async listPartyToKeyMappingAsync(): Promise<ListPartyToKeyMappingResponse> {
        this.throwMissingEndpoint();
    }

    public async listSynchronizerTrustCertificateAsync(): Promise<ListSynchronizerTrustCertificateResponse> {
        this.throwMissingEndpoint();
    }

    public async listParticipantSynchronizerPermissionAsync(): Promise<ListParticipantSynchronizerPermissionResponse> {
        this.throwMissingEndpoint();
    }

    public async authorizeTopologyTransactionsAsync(): Promise<AuthorizeTopologyTransactionsResponse> {
        this.throwMissingEndpoint();
    }

    public async addTopologyTransactionsAsync(): Promise<AddTopologyTransactionsResponse> {
        this.throwMissingEndpoint();
    }

    public async importTopologySnapshotAsync(): Promise<ImportTopologySnapshotResponse> {
        this.throwMissingEndpoint();
    }

    public async importTopologySnapshotV2Async(): Promise<ImportTopologySnapshotV2Response> {
        this.throwMissingEndpoint();
    }

    public async signTopologyTransactionsAsync(): Promise<SignTopologyTransactionsResponse> {
        this.throwMissingEndpoint();
    }

    public async generateTopologyTransactionsAsync(): Promise<GenerateTopologyTransactionsResponse> {
        this.throwMissingEndpoint();
    }

    public async createTemporaryTopologyStoreAsync(): Promise<CreateTemporaryTopologyStoreResponse> {
        this.throwMissingEndpoint();
    }

    public async dropTemporaryTopologyStoreAsync(): Promise<DropTemporaryTopologyStoreResponse> {
        this.throwMissingEndpoint();
    }

    public async listPartyHostingLimitsAsync(): Promise<ListPartyHostingLimitsResponse> {
        this.throwMissingEndpoint();
    }

    public async topologyListVettedPackagesAsync(): Promise<TopologyListVettedPackagesResponse> {
        this.throwMissingEndpoint();
    }

    public async listPartyToParticipantAsync(): Promise<ListPartyToParticipantResponse> {
        this.throwMissingEndpoint();
    }

    public async listSynchronizerParametersStateAsync(): Promise<ListSynchronizerParametersStateResponse> {
        this.throwMissingEndpoint();
    }

    public async listSequencingParametersStateAsync(): Promise<ListSequencingParametersStateResponse> {
        this.throwMissingEndpoint();
    }

    public async listMediatorSynchronizerStateAsync(): Promise<ListMediatorSynchronizerStateResponse> {
        this.throwMissingEndpoint();
    }

    public async listSequencerSynchronizerStateAsync(): Promise<ListSequencerSynchronizerStateResponse> {
        this.throwMissingEndpoint();
    }

    public async listLsuAnnouncementAsync(): Promise<ListLsuAnnouncementResponse> {
        this.throwMissingEndpoint();
    }

    public async listLsuSequencerConnectionSuccessorAsync(): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        this.throwMissingEndpoint();
    }

    public async listAvailableStoresAsync(): Promise<ListAvailableStoresResponse> {
        this.throwMissingEndpoint();
    }

    public async listAllAsync(): Promise<ListAllResponse> {
        this.throwMissingEndpoint();
    }

    public async listAllV2Async(): Promise<ListAllV2Response> {
        this.throwMissingEndpoint();
    }

    public async topologyListPartiesAsync(): Promise<TopologyListPartiesResponse> {
        this.throwMissingEndpoint();
    }

    public async listKeyOwnersAsync(): Promise<ListKeyOwnersResponse> {
        this.throwMissingEndpoint();
    }

    public async getActiveContractsPageAsync(): Promise<GetActiveContractsPageResponse> {
        this.throwMissingEndpoint();
    }

    public async getConnectedSynchronizersAsync(): Promise<GetConnectedSynchronizersResponse> {
        this.throwMissingEndpoint();
    }

    public async getLedgerEndAsync(): Promise<GetLedgerEndResponse> {
        this.throwMissingEndpoint();
    }

    public async getLatestPrunedOffsetsAsync(): Promise<GetLatestPrunedOffsetsResponse> {
        this.throwMissingEndpoint();
    }

    public async getActiveContractsAsync(): Promise<void> {
        this.throwMissingEndpoint();
    }

    public async getUpdatesAsync(): Promise<void> {
        this.throwMissingEndpoint();
    }

    public async getUpdateByOffsetAsync(): Promise<GetUpdateByOffsetResponse> {
        this.throwMissingEndpoint();
    }

    public async getUpdateByIdAsync(): Promise<GetUpdateByIdResponse> {
        this.throwMissingEndpoint();
    }

    public async getUpdateByHashAsync(): Promise<GetUpdateByHashResponse> {
        this.throwMissingEndpoint();
    }

    public async getUpdatesPageAsync(): Promise<GetUpdatesPageResponse> {
        this.throwMissingEndpoint();
    }

    public async getCompletionsAsync(): Promise<void> {
        this.throwMissingEndpoint();
    }

    public async submitCommandAsync(): Promise<SubmitCommandResponse> {
        this.throwMissingEndpoint();
    }

    private throwMissingEndpoint(): never {
        throw new EndpointNotConfiguredError(
            `The ${this.surfaceName} endpoint is not configured for ${this.serviceName}.`,
        );
    }
}

class CompositeTransport implements ITransport {
    public readonly features;

    public constructor(private readonly transports: readonly ITransport[]) {
        this.features = {
            supportsCommandSigning: transports.some(
                (transport) => transport.features.supportsCommandSigning,
            ),
        };
    }

    public async disposeAsync(): Promise<void> {
        await Promise.all(this.transports.map((transport) => transport.disposeAsync()));
    }

    public async getLedgerApiVersionAsync(): Promise<GetLedgerApiVersionResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async checkHealthAsync(): Promise<HealthCheckResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async allocatePartyAsync(): Promise<AllocatePartyResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async generateExternalPartyTopologyAsync(): Promise<GenerateExternalPartyTopologyResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async allocateExternalPartyAsync(): Promise<AllocateExternalPartyResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listKnownPartiesAsync(): Promise<ListKnownPartiesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantIdAsync(): Promise<GetParticipantIdResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getPartiesAsync(): Promise<GetPartiesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async grantUserRightsAsync(): Promise<GrantUserRightsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getCommandStatusAsync(): Promise<GetCommandStatusResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUserAsync(): Promise<GetUserResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listUsersAsync(): Promise<ListUsersResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listUserRightsAsync(): Promise<ListUserRightsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async uploadDarFileAsync(): Promise<UploadDarFileResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listKnownPackagesAsync(): Promise<ListKnownPackagesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getIdentityProviderConfigAsync(): Promise<GetIdentityProviderConfigResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listIdentityProviderConfigsAsync(): Promise<ListIdentityProviderConfigsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listPackagesAsync(): Promise<ListPackagesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getPackageAsync(): Promise<GetPackageResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getPackageStatusAsync(): Promise<GetPackageStatusResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listVettedPackagesAsync(): Promise<ListVettedPackagesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listParticipantPackagesAsync(): Promise<ParticipantListPackagesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantPackageContentsAsync(): Promise<GetPackageContentsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantPackageReferencesAsync(): Promise<GetPackageReferencesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantDarAsync(): Promise<GetDarResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listParticipantDarsAsync(): Promise<ListDarsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantDarContentsAsync(): Promise<GetDarContentsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantStatusAsync(): Promise<GetParticipantStatusResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async lookupOffsetByTimeAsync(): Promise<LookupOffsetByTimeResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async openCommitmentAsync(): Promise<void> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async inspectCommitmentContractsAsync(): Promise<void> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async countInFlightAsync(): Promise<CountInFlightResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getConfigForSlowCounterParticipantsAsync(): Promise<GetConfigForSlowCounterParticipantsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getIntervalsBehindForCounterParticipantsAsync(): Promise<GetIntervalsBehindForCounterParticipantsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async lookupSentAcsCommitmentsAsync(): Promise<LookupSentAcsCommitmentsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async lookupReceivedAcsCommitmentsAsync(): Promise<LookupReceivedAcsCommitmentsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async addPartyAsync(): Promise<AddPartyAsyncResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async clearPartyOnboardingFlagAsync(): Promise<ClearPartyOnboardingFlagResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getHighestOffsetByTimestampAsync(): Promise<GetHighestOffsetByTimestampResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getSafePruningOffsetAsync(): Promise<GetSafePruningOffsetResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getPruningScheduleAsync(): Promise<GetPruningScheduleResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getParticipantPruningScheduleAsync(): Promise<GetParticipantPruningScheduleResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getNoWaitCommitmentsFromAsync(): Promise<GetNoWaitCommitmentsFromResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async trafficControlStateAsync(): Promise<TrafficControlStateResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listConnectedSynchronizersAsync(): Promise<ListConnectedSynchronizersResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getSynchronizerIdAsync(): Promise<GetSynchronizerIdResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listRegisteredSynchronizersAsync(): Promise<ListRegisteredSynchronizersResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listPendingOperationsAsync(): Promise<ListPendingOperationsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getResourceLimitsAsync(): Promise<GetResourceLimitsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getIdAsync(): Promise<GetIdResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async currentTimeAsync(): Promise<CurrentTimeResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getContractAsync(): Promise<GetContractResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getEventsByContractIdAsync(): Promise<GetEventsByContractIdResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listNamespaceDelegationAsync(): Promise<ListNamespaceDelegationResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listDecentralizedNamespaceDefinitionAsync(): Promise<ListDecentralizedNamespaceDefinitionResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listOwnerToKeyMappingAsync(): Promise<ListOwnerToKeyMappingResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listPartyToKeyMappingAsync(): Promise<ListPartyToKeyMappingResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listSynchronizerTrustCertificateAsync(): Promise<ListSynchronizerTrustCertificateResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listParticipantSynchronizerPermissionAsync(): Promise<ListParticipantSynchronizerPermissionResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async authorizeTopologyTransactionsAsync(): Promise<AuthorizeTopologyTransactionsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async addTopologyTransactionsAsync(): Promise<AddTopologyTransactionsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async importTopologySnapshotAsync(): Promise<ImportTopologySnapshotResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async importTopologySnapshotV2Async(): Promise<ImportTopologySnapshotV2Response> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async signTopologyTransactionsAsync(): Promise<SignTopologyTransactionsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async generateTopologyTransactionsAsync(): Promise<GenerateTopologyTransactionsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async createTemporaryTopologyStoreAsync(): Promise<CreateTemporaryTopologyStoreResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async dropTemporaryTopologyStoreAsync(): Promise<DropTemporaryTopologyStoreResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listPartyHostingLimitsAsync(): Promise<ListPartyHostingLimitsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async topologyListVettedPackagesAsync(): Promise<TopologyListVettedPackagesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listPartyToParticipantAsync(): Promise<ListPartyToParticipantResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listSynchronizerParametersStateAsync(): Promise<ListSynchronizerParametersStateResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listSequencingParametersStateAsync(): Promise<ListSequencingParametersStateResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listMediatorSynchronizerStateAsync(): Promise<ListMediatorSynchronizerStateResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listSequencerSynchronizerStateAsync(): Promise<ListSequencerSynchronizerStateResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listLsuAnnouncementAsync(): Promise<ListLsuAnnouncementResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listLsuSequencerConnectionSuccessorAsync(): Promise<ListLsuSequencerConnectionSuccessorResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listAvailableStoresAsync(): Promise<ListAvailableStoresResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listAllAsync(): Promise<ListAllResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listAllV2Async(): Promise<ListAllV2Response> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async topologyListPartiesAsync(): Promise<TopologyListPartiesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async listKeyOwnersAsync(): Promise<ListKeyOwnersResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getActiveContractsPageAsync(): Promise<GetActiveContractsPageResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getConnectedSynchronizersAsync(): Promise<GetConnectedSynchronizersResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getLedgerEndAsync(): Promise<GetLedgerEndResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getLatestPrunedOffsetsAsync(): Promise<GetLatestPrunedOffsetsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getActiveContractsAsync(): Promise<void> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUpdatesAsync(): Promise<void> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUpdateByOffsetAsync(): Promise<GetUpdateByOffsetResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUpdateByIdAsync(): Promise<GetUpdateByIdResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUpdateByHashAsync(): Promise<GetUpdateByHashResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUpdatesPageAsync(): Promise<GetUpdatesPageResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getCompletionsAsync(): Promise<void> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async submitCommandAsync(): Promise<SubmitCommandResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }
}

function createTransportForEndpoint(
    options: CantonClientOptions,
    endpoint: string,
    grpcChannelSecurity?: GrpcChannelSecurity,
    authProvider?: IAuthProvider,
): ITransport {
    return options.transportKind === TransportKind.json
        ? createJsonTransport(options, endpoint, authProvider)
        : options.transportKind === TransportKind.grpc
          ? createGrpcTransport(
                options,
                endpoint,
                grpcChannelSecurity ?? options.grpcChannelSecurity,
            )
          : new PlaceholderTransport(options);
}

function createLedgerTransport(
    options: CantonClientOptions,
): ITransport {
    return options.ledgerEndpoint === undefined
        ? new MissingEndpointTransport(
            "versionService",
            "ledger",
            options.transportKind,
        )
        : createTransportForEndpoint(
            options,
            options.ledgerEndpoint,
            options.ledgerGrpcChannelSecurity
                ?? options.grpcChannelSecurity
                ?? GrpcChannelSecurity.tls,
            options.ledgerAuthProvider,
        );
}

function createLedgerAdminTransport(
    options: CantonClientOptions,
): ITransport {
    return options.ledgerAdminEndpoint === undefined
        ? new MissingEndpointTransport(
            "partyManagementService",
            "ledger admin",
            options.transportKind,
        )
        : createTransportForEndpoint(
            options,
            options.ledgerAdminEndpoint,
            options.ledgerAdminGrpcChannelSecurity
                ?? options.grpcChannelSecurity
                ?? GrpcChannelSecurity.tls,
            options.ledgerAdminAuthProvider,
        );
}

function createParticipantAdminTransport(
    options: CantonClientOptions,
): ITransport {
    return options.participantAdminEndpoint === undefined
        ? new MissingEndpointTransport(
            "participantPackageService",
            "participant admin",
            options.transportKind,
        )
        : createTransportForEndpoint(
            options,
            options.participantAdminEndpoint,
            options.participantAdminGrpcChannelSecurity
                ?? options.grpcChannelSecurity
                ?? GrpcChannelSecurity.tls,
            options.participantAdminAuthProvider,
        );
}

function createMissingLedgerTransport(
    options: CantonClientOptions,
    serviceName: string,
): ITransport {
    return new MissingEndpointTransport(
        serviceName,
        "ledger",
        options.transportKind,
    );
}

function createMissingLedgerAdminTransport(
    options: CantonClientOptions,
    serviceName: string,
): ITransport {
    return new MissingEndpointTransport(
        serviceName,
        "ledger admin",
        options.transportKind,
    );
}

function createMissingParticipantAdminTransport(
    options: CantonClientOptions,
    serviceName: string,
): ITransport {
    return new MissingEndpointTransport(
        serviceName,
        "participant admin",
        options.transportKind,
    );
}

export function createServiceRegistry(
    options: CantonClientOptions,
): ServiceRegistry {
    const ledgerTransport =
        options.ledgerEndpoint === undefined
            ? undefined
            : createLedgerTransport(options);

    const ledgerAdminTransport =
        options.ledgerAdminEndpoint === undefined
            ? undefined
            : createLedgerAdminTransport(options);

    const participantAdminTransport =
        options.participantAdminEndpoint === undefined
            ? undefined
            : createParticipantAdminTransport(options);

    const versionTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "versionService");

    const healthTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "healthService");

    const packageTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "packageService");

    const commandTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "commandService");

    const commandSubmissionTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "commandSubmissionService");

    const commandCompletionTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "commandCompletionService");

    const stateTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "stateService");

    const updateTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "updateService");

    const eventQueryTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "eventQueryService");

    const contractTransport =
        ledgerTransport
        ?? createMissingLedgerTransport(options, "contractService");

    const partyManagementTransport =
        ledgerAdminTransport
        ?? createMissingLedgerAdminTransport(options, "partyManagementService");

    const userManagementTransport =
        ledgerAdminTransport
        ?? createMissingLedgerAdminTransport(options, "userManagementService");

    const commandInspectionTransport =
        ledgerAdminTransport
        ?? createMissingLedgerAdminTransport(
            options,
            "commandInspectionService",
        );

    const identityProviderConfigTransport =
        ledgerAdminTransport
        ?? createMissingLedgerAdminTransport(
            options,
            "identityProviderConfigService",
        );

    const participantPackageTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "participantPackageService",
        );

    const participantInspectionTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "participantInspectionService",
        );

    const participantPartyManagementTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "participantPartyManagementService",
        );

    const participantRepairTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "participantRepairService",
        );

    const packageManagementTransport =
        ledgerAdminTransport
        ?? createMissingLedgerAdminTransport(
            options,
            "packageManagementService",
        );

    const participantStatusTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "participantStatusService",
        );

    const pruningTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "pruningService",
        );

    const resourceManagementTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "resourceManagementService",
        );

    const identityInitializationTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "identityInitializationService",
        );

    const synchronizerConnectivityTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "synchronizerConnectivityService",
        );

    const trafficControlTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "trafficControlService",
        );

    const topologyManagerReadTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "topologyManagerReadService",
        );

    const topologyManagerWriteTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "topologyManagerWriteService",
        );

    const topologyAggregationTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "topologyAggregationService",
        );

    const transport = new CompositeTransport(
        [
            ledgerTransport,
            ledgerAdminTransport,
            participantAdminTransport,
        ].filter((item): item is ITransport => item !== undefined),
    );

    return {
        transport,
        versionService: new VersionServiceClient(versionTransport),
        healthService: new HealthServiceClient(healthTransport),
        partyManagementService: new PartyManagementServiceClient(
            partyManagementTransport,
        ),
        userManagementService: new UserManagementServiceClient(
            userManagementTransport,
        ),
        commandInspectionService: new CommandInspectionServiceClient(
            commandInspectionTransport,
        ),
        identityProviderConfigService: new IdentityProviderConfigServiceClient(
            identityProviderConfigTransport,
        ),
        packageService: new PackageServiceClient(packageTransport),
        packageManagementService: new PackageManagementServiceClient(
            packageManagementTransport,
        ),
        participantPackageService: new ParticipantPackageServiceClient(
            participantPackageTransport,
        ),
        participantInspectionService: new ParticipantInspectionServiceClient(
            participantInspectionTransport,
        ),
        participantPartyManagementService:
            new ParticipantPartyManagementServiceClient(
                participantPartyManagementTransport,
            ),
        participantRepairService: new ParticipantRepairServiceClient(
            participantRepairTransport,
        ),
        participantStatusService: new ParticipantStatusServiceClient(
            participantStatusTransport,
        ),
        pruningService: new PruningServiceClient(
            pruningTransport,
        ),
        resourceManagementService: new ResourceManagementServiceClient(
            resourceManagementTransport,
        ),
        identityInitializationService: new IdentityInitializationServiceClient(
            identityInitializationTransport,
        ),
        synchronizerConnectivityService:
            new SynchronizerConnectivityServiceClient(
                synchronizerConnectivityTransport,
            ),
        topologyManagerReadService: new TopologyManagerReadServiceClient(
            topologyManagerReadTransport,
        ),
        topologyManagerWriteService: new TopologyManagerWriteServiceClient(
            topologyManagerWriteTransport,
        ),
        trafficControlService: new TrafficControlServiceClient(
            trafficControlTransport,
        ),
        topologyAggregationService: new TopologyAggregationServiceClient(
            topologyAggregationTransport,
        ),
        commandService: new CommandServiceClient(
            commandTransport,
            options.commandSigner,
        ),
        commandSubmissionService: new CommandSubmissionServiceClient(
            commandSubmissionTransport,
        ),
        commandCompletionService: new CommandCompletionServiceClient(
            commandCompletionTransport,
        ),
        stateService: new StateServiceClient(stateTransport),
        updateService: new UpdateServiceClient(updateTransport),
        eventQueryService: new EventQueryServiceClient(eventQueryTransport),
        contractService: new ContractServiceClient(contractTransport),
    };
}
