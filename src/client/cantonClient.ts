import { NotSupportedError } from "../core/errors/notSupportedError.js";
import { TransportKind } from "../core/types/transportKind.js";
import { CommandsClient } from "../services/commands/commandsClient.js";
import { ContractsClient } from "../services/contracts/contractsClient.js";
import { EventsClient } from "../services/events/eventsClient.js";
import { PackagesClient } from "../services/packages/packagesClient.js";
import { PartiesClient } from "../services/parties/partiesClient.js";
import { SystemClient } from "../services/system/systemClient.js";
import { UsersClient } from "../services/users/usersClient.js";
import { CantonClientOptions } from "./cantonClientOptions.js";
import { createServiceRegistry } from "./serviceRegistry.js";

export class CantonClient {
  public readonly commands: CommandsClient;
  public readonly contracts: ContractsClient;
  public readonly events: EventsClient;
  public readonly parties: PartiesClient;
  public readonly users: UsersClient;
  public readonly packages: PackagesClient;
  public readonly system: SystemClient;

  public constructor(private readonly options: CantonClientOptions) {
    if (options.transportKind === TransportKind.json && options.commandSigner) {
      throw new NotSupportedError("commandSigner is only supported with grpc transport");
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
