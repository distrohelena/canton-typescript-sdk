import { CantonClientOptions } from "./canton-client-options.js";
import { ITransport } from "../core/transports/transport.interface.js";
import { CreatePartyRequest } from "../core/types/requests/create-party-request.js";
import { AllocatePartyRequest } from "../core/types/requests/allocate-party-request.js";
import { GrantUserRightsRequest } from "../core/types/requests/grant-user-rights-request.js";
import { GetLedgerApiVersionRequest } from "../core/types/requests/get-ledger-api-version-request.js";
import { ListKnownPartiesRequest } from "../core/types/requests/list-known-parties-request.js";
import { QueryContractsRequest } from "../core/types/requests/query-contracts-request.js";
import { StreamQueryRequest } from "../core/types/requests/stream-query-request.js";
import { StreamTransactionsRequest } from "../core/types/requests/stream-transactions-request.js";
import { SubmitCommandRequest } from "../core/types/requests/submit-command-request.js";
import { UploadDarFileRequest } from "../core/types/requests/upload-dar-file-request.js";
import { UploadPackageRequest } from "../core/types/requests/upload-package-request.js";
import { ListPartiesRequest } from "../core/types/requests/list-parties-request.js";
import { SignCommandResult } from "../core/signing/sign-command-result.js";
import { AllocatePartyResponse } from "../core/types/responses/allocate-party-response.js";
import { CreatePartyResponse } from "../core/types/responses/create-party-response.js";
import { GetLedgerApiVersionResponse } from "../core/types/responses/get-ledger-api-version-response.js";
import { GrantUserRightsResponse } from "../core/types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../core/types/responses/health-status-response.js";
import { ListKnownPartiesResponse } from "../core/types/responses/list-known-parties-response.js";
import { ListPartiesResponse } from "../core/types/responses/list-parties-response.js";
import { QueryContractsResponse } from "../core/types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../core/types/responses/submit-command-response.js";
import { UploadDarFileResponse } from "../core/types/responses/upload-dar-file-response.js";
import { UploadPackageResponse } from "../core/types/responses/upload-package-response.js";
import { TransportError } from "../core/errors/transport-error.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { CommandCompletionServiceClient } from "../services/command-completion/command-completion-service-client.js";
import { CommandServiceClient } from "../services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../services/contract/contract-service-client.js";
import { ContractObserver } from "../services/contracts/contract-observer.interface.js";
import { EventQueryServiceClient } from "../services/event-query/event-query-service-client.js";
import { PackageManagementServiceClient } from "../services/package-management/package-management-service-client.js";
import { PartyManagementServiceClient } from "../services/party-management/party-management-service-client.js";
import { StateServiceClient } from "../services/state/state-service-client.js";
import { UpdateServiceClient } from "../services/update/update-service-client.js";
import { UserManagementServiceClient } from "../services/user-management/user-management-service-client.js";
import { VersionServiceClient } from "../services/version/version-service-client.js";
import { createJsonTransport } from "../transports/json/json-transport-factory.js";
import { createGrpcTransport } from "../transports/grpc/grpc-transport-factory.js";
import { TransactionObserver } from "../services/events/transaction-observer.interface.js";

export interface ServiceRegistry {
    readonly versionService: VersionServiceClient;
    readonly partyManagementService: PartyManagementServiceClient;
    readonly userManagementService: UserManagementServiceClient;
    readonly packageManagementService: PackageManagementServiceClient;
    readonly commandService: CommandServiceClient;
    readonly commandSubmissionService: CommandSubmissionServiceClient;
    readonly commandCompletionService: CommandCompletionServiceClient;
    readonly stateService: StateServiceClient;
    readonly updateService: UpdateServiceClient;
    readonly eventQueryService: EventQueryServiceClient;
    readonly contractService: ContractServiceClient;
}

class PlaceholderTransport implements ITransport {
    public readonly features;

    public constructor(options: CantonClientOptions) {
        this.features = {
            supportsCommandSigning:
                options.transportKind === TransportKind.grpc,
        };
    }

    public async getHealthAsync(): Promise<HealthStatusResponse> {
        throw new TransportError(
            "transport health checks are not available yet",
        );
    }

    public async getLedgerApiVersionAsync(
        _request?: GetLedgerApiVersionRequest,
    ): Promise<GetLedgerApiVersionResponse> {
        throw new TransportError("ledger api version is not available yet");
    }

    public async createPartyAsync(
        _request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        throw new TransportError("party creation is not available yet");
    }

    public async allocatePartyAsync(
        _request: AllocatePartyRequest,
    ): Promise<AllocatePartyResponse> {
        throw new TransportError("party allocation is not available yet");
    }

    public async listPartiesAsync(
        _request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        throw new TransportError("party listing is not available yet");
    }

    public async listKnownPartiesAsync(
        _request: ListKnownPartiesRequest,
    ): Promise<ListKnownPartiesResponse> {
        throw new TransportError("known party listing is not available yet");
    }

    public async grantUserRightsAsync(
        _request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse> {
        throw new TransportError("user rights management is not available yet");
    }

    public async uploadPackageAsync(
        _request: UploadPackageRequest,
    ): Promise<UploadPackageResponse> {
        throw new TransportError("package upload is not available yet");
    }

    public async uploadDarFileAsync(
        _request: UploadDarFileRequest,
    ): Promise<UploadDarFileResponse> {
        throw new TransportError("dar upload is not available yet");
    }

    public async queryContractsAsync(
        _request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        throw new TransportError("contract queries are not available yet");
    }

    public async streamQueryAsync(
        _request: StreamQueryRequest,
        _observer: ContractObserver,
    ): Promise<void> {
        throw new TransportError("contract query streaming is not available yet");
    }

    public async streamTransactionsAsync(
        _request: StreamTransactionsRequest,
        _observer: TransactionObserver,
    ): Promise<void> {
        throw new TransportError("transaction streaming is not available yet");
    }

    public async submitCommandAsync(
        _request: SubmitCommandRequest,
        _signed?: SignCommandResult,
    ): Promise<SubmitCommandResponse> {
        throw new TransportError("command submission is not available yet");
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
        versionService: new VersionServiceClient(transport),
        partyManagementService: new PartyManagementServiceClient(transport),
        userManagementService: new UserManagementServiceClient(transport),
        packageManagementService: new PackageManagementServiceClient(
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
