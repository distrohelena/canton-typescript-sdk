import { CantonClientOptions } from "./cantonClientOptions.js";
import { ITransport } from "../core/transports/iTransport.js";
import { CreatePartyRequest } from "../core/types/requests/createPartyRequest.js";
import { GrantUserRightsRequest } from "../core/types/requests/grantUserRightsRequest.js";
import { UploadPackageRequest } from "../core/types/requests/uploadPackageRequest.js";
import { CreatePartyResponse } from "../core/types/responses/createPartyResponse.js";
import { GrantUserRightsResponse } from "../core/types/responses/grantUserRightsResponse.js";
import { HealthStatusResponse } from "../core/types/responses/healthStatusResponse.js";
import { UploadPackageResponse } from "../core/types/responses/uploadPackageResponse.js";
import { TransportError } from "../core/errors/transportError.js";
import { TransportKind } from "../core/types/transportKind.js";
import { CommandsClient } from "../services/commands/commandsClient.js";
import { ContractsClient } from "../services/contracts/contractsClient.js";
import { EventsClient } from "../services/events/eventsClient.js";
import { PackagesClient } from "../services/packages/packagesClient.js";
import { PartiesClient } from "../services/parties/partiesClient.js";
import { SystemClient } from "../services/system/systemClient.js";
import { UsersClient } from "../services/users/usersClient.js";
import { createJsonTransport } from "../transports/json/jsonTransportFactory.js";

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

  public async getHealthAsync(): Promise<HealthStatusResponse> {
    throw new TransportError("transport health checks are not available yet");
  }

  public async createPartyAsync(_request: CreatePartyRequest): Promise<CreatePartyResponse> {
    throw new TransportError("party creation is not available yet");
  }

  public async grantUserRightsAsync(
    _request: GrantUserRightsRequest
  ): Promise<GrantUserRightsResponse> {
    throw new TransportError("user rights management is not available yet");
  }

  public async uploadPackageAsync(
    _request: UploadPackageRequest
  ): Promise<UploadPackageResponse> {
    throw new TransportError("package upload is not available yet");
  }
}

export function createServiceRegistry(options: CantonClientOptions): ServiceRegistry {
  const transport =
    options.transportKind === TransportKind.json
      ? createJsonTransport(options)
      : new PlaceholderTransport(options);

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
