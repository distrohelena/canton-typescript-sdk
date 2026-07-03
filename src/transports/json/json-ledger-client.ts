import { CommandsClient } from "../../services/commands/commands-client.js";
import { CommandServiceClient } from "../../services/command/command-service-client.js";
import { ContractsClient } from "../../services/contracts/contracts-client.js";
import { EventsClient } from "../../services/events/events-client.js";
import { IJsonHttpClient } from "./json-http-client.js";
import { JsonTransport } from "./json-transport.js";

export class JsonLedgerClient {
    public readonly commands: CommandsClient;
    public readonly commandService: CommandServiceClient;
    public readonly contracts: ContractsClient;
    public readonly events: EventsClient;

    public constructor(httpClient: IJsonHttpClient) {
        const transport = new JsonTransport(httpClient);

        this.commands = new CommandsClient(transport);
        this.commandService = new CommandServiceClient(transport);
        this.contracts = new ContractsClient(transport);
        this.events = new EventsClient(transport);
    }
}
