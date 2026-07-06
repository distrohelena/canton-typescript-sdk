import { NotSupportedError } from "../core/errors/not-supported-error.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { CommandCompletionServiceClient } from "../services/command-completion/command-completion-service-client.js";
import { CommandServiceClient } from "../services/command/command-service-client.js";
import { CommandSubmissionServiceClient } from "../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../services/contract/contract-service-client.js";
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
import { CantonClientOptions } from "./canton-client-options.js";
import { createServiceRegistry } from "./service-registry.js";

export class CantonClient {
    private readonly transport;
    private disposed = false;

    public readonly versionService: VersionServiceClient;
    public readonly healthService: HealthServiceClient;
    public readonly partyManagementService: PartyManagementServiceClient;
    public readonly userManagementService: UserManagementServiceClient;
    public readonly packageService: PackageServiceClient;
    public readonly packageManagementService: PackageManagementServiceClient;
    public readonly participantPackageService: ParticipantPackageServiceClient;
    public readonly participantStatusService: ParticipantStatusServiceClient;
    public readonly topologyManagerReadService: TopologyManagerReadServiceClient;
    public readonly topologyAggregationService: TopologyAggregationServiceClient;
    public readonly commandService: CommandServiceClient;
    public readonly commandSubmissionService: CommandSubmissionServiceClient;
    public readonly commandCompletionService: CommandCompletionServiceClient;
    public readonly stateService: StateServiceClient;
    public readonly updateService: UpdateServiceClient;
    public readonly eventQueryService: EventQueryServiceClient;
    public readonly contractService: ContractServiceClient;

    public constructor(private readonly options: CantonClientOptions) {
        if (
            options.transportKind === TransportKind.json &&
            options.commandSigner
        ) {
            throw new NotSupportedError(
                "commandSigner is only supported with grpc transport",
            );
        }

        const services = createServiceRegistry(options);

        this.transport = services.transport;

        this.versionService = services.versionService;
        this.healthService = services.healthService;
        this.partyManagementService = services.partyManagementService;
        this.userManagementService = services.userManagementService;
        this.packageService = services.packageService;
        this.packageManagementService = services.packageManagementService;
        this.participantPackageService = services.participantPackageService;
        this.participantStatusService = services.participantStatusService;
        this.topologyManagerReadService = services.topologyManagerReadService;
        this.topologyAggregationService = services.topologyAggregationService;
        this.commandService = services.commandService;
        this.commandSubmissionService = services.commandSubmissionService;
        this.commandCompletionService = services.commandCompletionService;
        this.stateService = services.stateService;
        this.updateService = services.updateService;
        this.eventQueryService = services.eventQueryService;
        this.contractService = services.contractService;
    }

    /** Disposes transport-owned resources for this client instance. */
    public async disposeAsync(): Promise<void> {
        if (this.disposed) {
            return;
        }

        this.disposed = true;
        await this.transport.disposeAsync();
    }
}
