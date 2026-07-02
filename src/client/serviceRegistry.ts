import { CantonClientOptions } from "./cantonClientOptions.js";
import { ITransport } from "../core/transports/iTransport.js";
import { TransportKind } from "../core/types/transportKind.js";
import { CommandsClient } from "../services/commands/commandsClient.js";
import { ContractsClient } from "../services/contracts/contractsClient.js";
import { EventsClient } from "../services/events/eventsClient.js";
import { PackagesClient } from "../services/packages/packagesClient.js";
import { PartiesClient } from "../services/parties/partiesClient.js";
import { SystemClient } from "../services/system/systemClient.js";
import { UsersClient } from "../services/users/usersClient.js";

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
      supportsCommandSigning: options.transportKind === TransportKind.grpc
    };
  }
}

export function createServiceRegistry(options: CantonClientOptions): ServiceRegistry {
  const transport = new PlaceholderTransport(options);

  return {
    commands: new CommandsClient(transport),
    contracts: new ContractsClient(transport),
    events: new EventsClient(transport),
    parties: new PartiesClient(transport),
    users: new UsersClient(transport),
    packages: new PackagesClient(transport),
    system: new SystemClient(transport)
  };
}
