import { CommandServiceClient } from "../../services/command/command-service-client.js";
import { CommandCompletionServiceClient } from "../../services/command-completion/command-completion-service-client.js";
import { CommandSubmissionServiceClient } from "../../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../../services/contract/contract-service-client.js";
import { EventQueryServiceClient } from "../../services/event-query/event-query-service-client.js";
import { HealthServiceClient } from "../../services/health/health-service-client.js";
import { PackageServiceClient } from "../../services/package/package-service-client.js";
import { ParticipantPackageServiceClient } from "../../services/participant-package/participant-package-service-client.js";
import { PartyManagementServiceClient } from "../../services/party-management/party-management-service-client.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { UpdateServiceClient } from "../../services/update/update-service-client.js";
import { UserManagementServiceClient } from "../../services/user-management/user-management-service-client.js";
import { VersionServiceClient } from "../../services/version/version-service-client.js";
import { IJsonHttpClient } from "./json-http-client.js";
import { JsonTransport } from "./json-transport.js";

export class JsonLedgerClient {
    public readonly versionService: VersionServiceClient;
    public readonly healthService: HealthServiceClient;
    public readonly partyManagementService: PartyManagementServiceClient;
    public readonly userManagementService: UserManagementServiceClient;
    public readonly packageService: PackageServiceClient;
    public readonly participantPackageService: ParticipantPackageServiceClient;
    public readonly commandService: CommandServiceClient;
    public readonly commandSubmissionService: CommandSubmissionServiceClient;
    public readonly commandCompletionService: CommandCompletionServiceClient;
    public readonly stateService: StateServiceClient;
    public readonly updateService: UpdateServiceClient;
    public readonly eventQueryService: EventQueryServiceClient;
    public readonly contractService: ContractServiceClient;

    public constructor(httpClient: IJsonHttpClient) {
        const transport = new JsonTransport(httpClient);

        this.versionService = new VersionServiceClient(transport);
        this.healthService = new HealthServiceClient(transport);
        this.partyManagementService = new PartyManagementServiceClient(transport);
        this.userManagementService = new UserManagementServiceClient(transport);
        this.packageService = new PackageServiceClient(transport);
        this.participantPackageService = new ParticipantPackageServiceClient(
            transport,
        );
        this.commandService = new CommandServiceClient(transport);
        this.commandSubmissionService = new CommandSubmissionServiceClient(
            transport,
        );
        this.commandCompletionService = new CommandCompletionServiceClient(
            transport,
        );
        this.stateService = new StateServiceClient(transport);
        this.updateService = new UpdateServiceClient(transport);
        this.eventQueryService = new EventQueryServiceClient(transport);
        this.contractService = new ContractServiceClient(transport);
    }
}
