import { ICommandSigner } from "../../core/signing/iCommandSigner.js";
import { CommandsClient } from "../../services/commands/commandsClient.js";
import { ContractsClient } from "../../services/contracts/contractsClient.js";
import { EventsClient } from "../../services/events/eventsClient.js";
import { GrpcOperations } from "./grpcChannelFactory.js";
import { GrpcTransport } from "./grpcTransport.js";

export class GrpcLedgerClient {
  public readonly commands: CommandsClient;
  public readonly contracts: ContractsClient;
  public readonly events: EventsClient;

  public constructor(operations: GrpcOperations, signer?: ICommandSigner) {
    const transport = new GrpcTransport(operations);
    this.commands = new CommandsClient(transport, signer);
    this.contracts = new ContractsClient(transport);
    this.events = new EventsClient(transport);
  }
}
