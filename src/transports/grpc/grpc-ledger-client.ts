import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { CommandServiceClient } from "../../services/command/command-service-client.js";
import { CommandCompletionServiceClient } from "../../services/command-completion/command-completion-service-client.js";
import { CommandSubmissionServiceClient } from "../../services/command-submission/command-submission-service-client.js";
import { ContractServiceClient } from "../../services/contract/contract-service-client.js";
import { EventQueryServiceClient } from "../../services/event-query/event-query-service-client.js";
import { PackageManagementServiceClient } from "../../services/package-management/package-management-service-client.js";
import { PartyManagementServiceClient } from "../../services/party-management/party-management-service-client.js";
import { StateServiceClient } from "../../services/state/state-service-client.js";
import { UpdateServiceClient } from "../../services/update/update-service-client.js";
import { UserManagementServiceClient } from "../../services/user-management/user-management-service-client.js";
import { VersionServiceClient } from "../../services/version/version-service-client.js";
import { GrpcOperations } from "./grpc-channel-factory.js";
import { GrpcTransport } from "./grpc-transport.js";

export class GrpcLedgerClient {
    public readonly versionService: VersionServiceClient;
    public readonly partyManagementService: PartyManagementServiceClient;
    public readonly userManagementService: UserManagementServiceClient;
    public readonly packageManagementService: PackageManagementServiceClient;
    public readonly commandService: CommandServiceClient;
    public readonly commandSubmissionService: CommandSubmissionServiceClient;
    public readonly commandCompletionService: CommandCompletionServiceClient;
    public readonly stateService: StateServiceClient;
    public readonly updateService: UpdateServiceClient;
    public readonly eventQueryService: EventQueryServiceClient;
    public readonly contractService: ContractServiceClient;

    public constructor(operations: GrpcOperations, signer?: ICommandSigner) {
        const transport = new GrpcTransport(operations);

        this.versionService = new VersionServiceClient(transport);
        this.partyManagementService = new PartyManagementServiceClient(transport);
        this.userManagementService = new UserManagementServiceClient(transport);
        this.packageManagementService = new PackageManagementServiceClient(
            transport,
        );
        this.commandService = new CommandServiceClient(transport, signer);
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
