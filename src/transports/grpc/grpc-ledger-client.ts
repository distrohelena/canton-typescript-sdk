import { ICommandSigner } from "../../core/signing/command-signer.interface.js";
import { CommandsClient } from "../../services/commands/commands-client.js";
import { CommandServiceClient } from "../../services/command/command-service-client.js";
import { ContractsClient } from "../../services/contracts/contracts-client.js";
import { EventsClient } from "../../services/events/events-client.js";
import { GrpcOperations } from "./grpc-channel-factory.js";
import { GrpcTransport } from "./grpc-transport.js";

export class GrpcLedgerClient {
    public readonly commands: CommandsClient;
    public readonly commandService: CommandServiceClient;
    public readonly contracts: ContractsClient;
    public readonly events: EventsClient;

    public constructor(operations: GrpcOperations, signer?: ICommandSigner) {
        const transport = new GrpcTransport(operations);

        this.commands = new CommandsClient(transport, signer);
        this.commandService = new CommandServiceClient(transport, signer);
        this.contracts = new ContractsClient(transport);
        this.events = new EventsClient(transport);
    }
}
