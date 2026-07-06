import { CantonClientOptions } from "./canton-client-options.js";
import { IAuthProvider } from "../core/auth/auth-provider.interface.js";
import { ITransport } from "../core/transports/transport.interface.js";
import { AllocatePartyRequest } from "../core/types/requests/allocate-party-request.js";
import { GetActiveContractsPageRequest } from "../core/types/requests/get-active-contracts-page-request.js";
import { GetActiveContractsRequest } from "../core/types/requests/get-active-contracts-request.js";
import { GrantUserRightsRequest } from "../core/types/requests/grant-user-rights-request.js";
import { GetLedgerApiVersionRequest } from "../core/types/requests/get-ledger-api-version-request.js";
import { GetPackageContentsRequest } from "../core/types/requests/get-package-contents-request.js";
import { GetPackageReferencesRequest } from "../core/types/requests/get-package-references-request.js";
import { GetPackageRequest } from "../core/types/requests/get-package-request.js";
import { GetPackageStatusRequest } from "../core/types/requests/get-package-status-request.js";
import { GetParticipantStatusRequest } from "../core/types/requests/get-participant-status-request.js";
import { GetUpdatesRequest } from "../core/types/requests/get-updates-request.js";
import { HealthCheckRequest } from "../core/types/requests/health-check-request.js";
import { ListAllRequest } from "../core/types/requests/list-all-request.js";
import { ListAllV2Request } from "../core/types/requests/list-all-v2-request.js";
import { ListAvailableStoresRequest } from "../core/types/requests/list-available-stores-request.js";
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
import { ParticipantListPackagesRequest } from "../core/types/requests/participant-list-packages-request.js";
import { SubmitCommandRequest } from "../core/types/requests/submit-command-request.js";
import { TopologyListPartiesRequest } from "../core/types/requests/topology-list-parties-request.js";
import { TopologyListVettedPackagesRequest } from "../core/types/requests/topology-list-vetted-packages-request.js";
import { UploadDarFileRequest } from "../core/types/requests/upload-dar-file-request.js";
import { SignCommandResult } from "../core/signing/sign-command-result.js";
import { AllocatePartyResponse } from "../core/types/responses/allocate-party-response.js";
import { GetPackageContentsResponse } from "../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../core/types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../core/types/responses/get-package-status-response.js";
import { GetParticipantStatusResponse } from "../core/types/responses/get-participant-status-response.js";
import { GetActiveContractsPageResponse } from "../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../core/types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../core/types/responses/health-check-response.js";
import { ListAllResponse } from "../core/types/responses/list-all-response.js";
import { ListAllV2Response } from "../core/types/responses/list-all-v2-response.js";
import { ListAvailableStoresResponse } from "../core/types/responses/list-available-stores-response.js";
import { ListDecentralizedNamespaceDefinitionResponse } from "../core/types/responses/list-decentralized-namespace-definition-response.js";
import { ListKeyOwnersResponse } from "../core/types/responses/list-key-owners-response.js";
import { ListLsuAnnouncementResponse } from "../core/types/responses/list-lsu-announcement-response.js";
import { ListLsuSequencerConnectionSuccessorResponse } from "../core/types/responses/list-lsu-sequencer-connection-successor-response.js";
import { ListMediatorSynchronizerStateResponse } from "../core/types/responses/list-mediator-synchronizer-state-response.js";
import { ListNamespaceDelegationResponse } from "../core/types/responses/list-namespace-delegation-response.js";
import { ListOwnerToKeyMappingResponse } from "../core/types/responses/list-owner-to-key-mapping-response.js";
import { ListPackagesResponse } from "../core/types/responses/list-packages-response.js";
import { ListKnownPartiesResponse } from "../core/types/responses/list-known-parties-response.js";
import { ListParticipantSynchronizerPermissionResponse } from "../core/types/responses/list-participant-synchronizer-permission-response.js";
import { ListPartyHostingLimitsResponse } from "../core/types/responses/list-party-hosting-limits-response.js";
import { ListPartyToKeyMappingResponse } from "../core/types/responses/list-party-to-key-mapping-response.js";
import { ListPartyToParticipantResponse } from "../core/types/responses/list-party-to-participant-response.js";
import { ListSequencerSynchronizerStateResponse } from "../core/types/responses/list-sequencer-synchronizer-state-response.js";
import { ListSequencingParametersStateResponse } from "../core/types/responses/list-sequencing-parameters-state-response.js";
import { ListSynchronizerParametersStateResponse } from "../core/types/responses/list-synchronizer-parameters-state-response.js";
import { ListSynchronizerTrustCertificateResponse } from "../core/types/responses/list-synchronizer-trust-certificate-response.js";
import { TopologyListPartiesResponse } from "../core/types/responses/topology-list-parties-response.js";
import { ListVettedPackagesResponse } from "../core/types/responses/list-vetted-packages-response.js";
import { TopologyListVettedPackagesResponse } from "../core/types/responses/topology-list-vetted-packages-response.js";
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
import { CommandServiceClient } from "../services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../services/contract/contract-service-client.js";
import { ContractObserver } from "../services/contracts/contract-observer.interface.js";
import { EventQueryServiceClient } from "../services/event-query/event-query-service-client.js";
import { HealthServiceClient } from "../services/health/health-service-client.js";
import { PackageManagementServiceClient } from "../services/package-management/package-management-service-client.js";
import { PackageServiceClient } from "../services/package/package-service-client.js";
import { ParticipantPackageServiceClient } from "../services/participant-package/participant-package-service-client.js";
import { ParticipantStatusServiceClient } from "../services/participant-status/participant-status-service-client.js";
import { PartyManagementServiceClient } from "../services/party-management/party-management-service-client.js";
import { StateServiceClient } from "../services/state/state-service-client.js";
import { TopologyAggregationServiceClient } from "../services/topology-aggregation/topology-aggregation-service-client.js";
import { TopologyManagerReadServiceClient } from "../services/topology-manager-read/topology-manager-read-service-client.js";
import { UpdateServiceClient } from "../services/update/update-service-client.js";
import { UserManagementServiceClient } from "../services/user-management/user-management-service-client.js";
import { VersionServiceClient } from "../services/version/version-service-client.js";
import { createJsonTransport } from "../transports/json/json-transport-factory.js";
import { createGrpcTransport } from "../transports/grpc/grpc-transport-factory.js";
import { TransactionObserver } from "../services/events/transaction-observer.interface.js";

export interface ServiceRegistry {
    readonly transport: ITransport;
    readonly versionService: VersionServiceClient;
    readonly healthService: HealthServiceClient;
    readonly partyManagementService: PartyManagementServiceClient;
    readonly userManagementService: UserManagementServiceClient;
    readonly packageService: PackageServiceClient;
    readonly packageManagementService: PackageManagementServiceClient;
    readonly participantPackageService: ParticipantPackageServiceClient;
    readonly participantStatusService: ParticipantStatusServiceClient;
    readonly topologyManagerReadService: TopologyManagerReadServiceClient;
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

    public async listKnownPartiesAsync(
        _request: ListKnownPartiesRequest,
        _options?: RequestOptions,
    ): Promise<ListKnownPartiesResponse> {
        this.throwIfDisposed();

        throw new TransportError("known party listing is not available yet");
    }

    public async grantUserRightsAsync(
        _request: GrantUserRightsRequest,
        _options?: RequestOptions,
    ): Promise<GrantUserRightsResponse> {
        this.throwIfDisposed();

        throw new TransportError("user rights management is not available yet");
    }

    public async uploadDarFileAsync(
        _request: UploadDarFileRequest,
        _options?: RequestOptions,
    ): Promise<UploadDarFileResponse> {
        this.throwIfDisposed();

        throw new TransportError("dar upload is not available yet");
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

    public async getParticipantStatusAsync(
        _request: GetParticipantStatusRequest,
        _options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse> {
        this.throwIfDisposed();

        throw new TransportError("participant status is not available yet");
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

    public async listKnownPartiesAsync(): Promise<ListKnownPartiesResponse> {
        this.throwMissingEndpoint();
    }

    public async grantUserRightsAsync(): Promise<GrantUserRightsResponse> {
        this.throwMissingEndpoint();
    }

    public async uploadDarFileAsync(): Promise<UploadDarFileResponse> {
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

    public async getParticipantStatusAsync(): Promise<GetParticipantStatusResponse> {
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

    public async getActiveContractsAsync(): Promise<void> {
        this.throwMissingEndpoint();
    }

    public async getUpdatesAsync(): Promise<void> {
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

    public async listKnownPartiesAsync(): Promise<ListKnownPartiesResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async grantUserRightsAsync(): Promise<GrantUserRightsResponse> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async uploadDarFileAsync(): Promise<UploadDarFileResponse> {
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

    public async getParticipantStatusAsync(): Promise<GetParticipantStatusResponse> {
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

    public async getActiveContractsAsync(): Promise<void> {
        throw new TransportError("Composite transport does not forward service calls.");
    }

    public async getUpdatesAsync(): Promise<void> {
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

    const participantPackageTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "participantPackageService",
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

    const topologyManagerReadTransport =
        participantAdminTransport
        ?? createMissingParticipantAdminTransport(
            options,
            "topologyManagerReadService",
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
        packageService: new PackageServiceClient(packageTransport),
        packageManagementService: new PackageManagementServiceClient(
            packageManagementTransport,
        ),
        participantPackageService: new ParticipantPackageServiceClient(
            participantPackageTransport,
        ),
        participantStatusService: new ParticipantStatusServiceClient(
            participantStatusTransport,
        ),
        topologyManagerReadService: new TopologyManagerReadServiceClient(
            topologyManagerReadTransport,
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
