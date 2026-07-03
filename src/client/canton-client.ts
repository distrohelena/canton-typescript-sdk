import { NotSupportedError } from "../core/errors/not-supported-error.js";
import { TransportKind } from "../core/types/transport-kind.js";
import { CommandsClient } from "../services/commands/commands-client.js";
import { ContractsClient } from "../services/contracts/contracts-client.js";
import { EventsClient } from "../services/events/events-client.js";
import { PackagesClient } from "../services/packages/packages-client.js";
import { PartiesClient } from "../services/parties/parties-client.js";
import { SystemClient } from "../services/system/system-client.js";
import { UsersClient } from "../services/users/users-client.js";
import { CantonClientOptions } from "./canton-client-options.js";
import { createServiceRegistry } from "./service-registry.js";

export class CantonClient {
    public readonly commands: CommandsClient;
    public readonly contracts: ContractsClient;
    public readonly events: EventsClient;
    public readonly parties: PartiesClient;
    public readonly users: UsersClient;
    public readonly packages: PackagesClient;
    public readonly system: SystemClient;

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

        this.commands = services.commands;
        this.contracts = services.contracts;
        this.events = services.events;
        this.parties = services.parties;
        this.users = services.users;
        this.packages = services.packages;
        this.system = services.system;
    }
}
