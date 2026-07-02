import { CommandsClient } from "../../services/commands/commandsClient.js";
import { ContractsClient } from "../../services/contracts/contractsClient.js";
import { EventsClient } from "../../services/events/eventsClient.js";
import { IJsonHttpClient } from "./jsonHttpClient.js";
import { JsonTransport } from "./jsonTransport.js";

export class JsonLedgerClient {
  public readonly commands: CommandsClient;
  public readonly contracts: ContractsClient;
  public readonly events: EventsClient;

  public constructor(httpClient: IJsonHttpClient) {
    const transport = new JsonTransport(httpClient);
    this.commands = new CommandsClient(transport);
    this.contracts = new ContractsClient(transport);
    this.events = new EventsClient(transport);
  }
}
