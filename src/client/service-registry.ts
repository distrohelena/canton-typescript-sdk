import { CantonClientOptions } from "./canton-client-options.js";
import { ITransport } from "../core/transports/transport.interface.js";
import { CreatePartyRequest } from "../core/types/requests/create-party-request.js";
import { GrantUserRightsRequest } from "../core/types/requests/grant-user-rights-request.js";
import { QueryContractsRequest } from "../core/types/requests/query-contracts-request.js";
import { StreamTransactionsRequest } from "../core/types/requests/stream-transactions-request.js";
import { SubmitCommandRequest } from "../core/types/requests/submit-command-request.js";
import { UploadPackageRequest } from "../core/types/requests/upload-package-request.js";
import { ListPartiesRequest } from "../core/types/requests/list-parties-request.js";
import { SignCommandResult } from "../core/signing/sign-command-result.js";
import { CreatePartyResponse } from "../core/types/responses/create-party-response.js";
import { GrantUserRightsResponse } from "../core/types/responses/grant-user-rights-response.js";
import { HealthStatusResponse } from "../core/types/responses/health-status-response.js";
import { ListPartiesResponse } from "../core/types/responses/list-parties-response.js";
import { QueryContractsResponse } from "../core/types/responses/query-contracts-response.js";
import { SubmitCommandResponse } from "../core/types/responses/submit-command-response.js";
import { UploadPackageResponse } from "../core/types/responses/upload-package-response.js";
import { TransportError } from "../core/errors/transport-error.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { CommandsClient } from "../services/commands/commands-client.js";
import { ContractsClient } from "../services/contracts/contracts-client.js";
import { EventsClient } from "../services/events/events-client.js";
import { PackagesClient } from "../services/packages/packages-client.js";
import { PartiesClient } from "../services/parties/parties-client.js";
import { SystemClient } from "../services/system/system-client.js";
import { UsersClient } from "../services/users/users-client.js";
import { createJsonTransport } from "../transports/json/json-transport-factory.js";
import { createGrpcTransport } from "../transports/grpc/grpc-transport-factory.js";
import { TransactionObserver } from "../services/events/transaction-observer.interface.js";

export interface ServiceRegistry {
    readonly commands: CommandsClient;
    readonly contracts: ContractsClient;
    readonly events: EventsClient;
    readonly parties: PartiesClient;
    readonly users: UsersClient;
    readonly packages: PackagesClient;
    readonly system: SystemClient;
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

    public async createPartyAsync(
        _request: CreatePartyRequest,
    ): Promise<CreatePartyResponse> {
        throw new TransportError("party creation is not available yet");
    }

    public async listPartiesAsync(
        _request: ListPartiesRequest,
    ): Promise<ListPartiesResponse> {
        throw new TransportError("party listing is not available yet");
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

    public async queryContractsAsync(
        _request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        throw new TransportError("contract queries are not available yet");
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
        commands: new CommandsClient(transport, options.commandSigner),
        contracts: new ContractsClient(transport),
        events: new EventsClient(transport),
        parties: new PartiesClient(transport),
        users: new UsersClient(transport),
        packages: new PackagesClient(transport),
        system: new SystemClient(transport),
    };
}
