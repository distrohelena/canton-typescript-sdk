import { CantonClientOptions } from "./canton-client-options.js";
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
import { GetUpdatesRequest } from "../core/types/requests/get-updates-request.js";
import { HealthCheckRequest } from "../core/types/requests/health-check-request.js";
import { ListPackagesRequest } from "../core/types/requests/list-packages-request.js";
import { ListVettedPackagesRequest } from "../core/types/requests/list-vetted-packages-request.js";
import { ListKnownPartiesRequest } from "../core/types/requests/list-known-parties-request.js";
import { ParticipantListPackagesRequest } from "../core/types/requests/participant-list-packages-request.js";
import { SubmitCommandRequest } from "../core/types/requests/submit-command-request.js";
import { UploadDarFileRequest } from "../core/types/requests/upload-dar-file-request.js";
import { SignCommandResult } from "../core/signing/sign-command-result.js";
import { AllocatePartyResponse } from "../core/types/responses/allocate-party-response.js";
import { GetPackageContentsResponse } from "../core/types/responses/get-package-contents-response.js";
import { GetPackageReferencesResponse } from "../core/types/responses/get-package-references-response.js";
import { GetPackageResponse } from "../core/types/responses/get-package-response.js";
import { GetPackageStatusResponse } from "../core/types/responses/get-package-status-response.js";
import { GetActiveContractsPageResponse } from "../core/types/responses/get-active-contracts-page-response.js";
import { GetLedgerApiVersionResponse } from "../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../core/types/responses/grant-user-rights-response.js";
import { HealthCheckResponse } from "../core/types/responses/health-check-response.js";
import { ListPackagesResponse } from "../core/types/responses/list-packages-response.js";
import { ListKnownPartiesResponse } from "../core/types/responses/list-known-parties-response.js";
import { ListVettedPackagesResponse } from "../core/types/responses/list-vetted-packages-response.js";
import { ParticipantListPackagesResponse } from "../core/types/responses/participant-list-packages-response.js";
import { SubmitCommandResponse } from "../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../core/types/responses/upload-dar-file-response.js";
import { TransportError } from "../core/errors/transport-error.js";
import { ObjectDisposedError } from "../core/errors/object-disposed-error.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { RequestOptions } from "../core/types/request-options.js";
import { CommandCompletionServiceClient } from "../services/command-completion/command-completion-service-client.js";
import { CommandServiceClient } from "../services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../services/contract/contract-service-client.js";
import { ContractObserver } from "../services/contracts/contract-observer.interface.js";
import { EventQueryServiceClient } from "../services/event-query/event-query-service-client.js";
import { HealthServiceClient } from "../services/health/health-service-client.js";
import { PackageServiceClient } from "../services/package/package-service-client.js";
import { ParticipantPackageServiceClient } from "../services/participant-package/participant-package-service-client.js";
import { PartyManagementServiceClient } from "../services/party-management/party-management-service-client.js";
import { StateServiceClient } from "../services/state/state-service-client.js";
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
    readonly participantPackageService: ParticipantPackageServiceClient;
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

export function createServiceRegistry(
    options: CantonClientOptions,
): ServiceRegistry {
    const transport =
        options.transportKind === TransportKind.json
            ? createJsonTransport(options)
            : options.transportKind === TransportKind.grpc
              ? createGrpcTransport(options)
              : new PlaceholderTransport(options);

    return {
        transport,
        versionService: new VersionServiceClient(transport),
        healthService: new HealthServiceClient(transport),
        partyManagementService: new PartyManagementServiceClient(transport),
        userManagementService: new UserManagementServiceClient(transport),
        packageService: new PackageServiceClient(transport),
        participantPackageService: new ParticipantPackageServiceClient(
            transport,
        ),
        commandService: new CommandServiceClient(
            transport,
            options.commandSigner,
        ),
        commandSubmissionService: new CommandSubmissionServiceClient(
            transport,
        ),
        commandCompletionService: new CommandCompletionServiceClient(
            transport,
        ),
        stateService: new StateServiceClient(transport),
        updateService: new UpdateServiceClient(transport),
        eventQueryService: new EventQueryServiceClient(transport),
        contractService: new ContractServiceClient(transport),
    };
}
