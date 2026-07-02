import { CreatePartyRequest } from "../../core/types/requests/createPartyRequest.js";
import {
  GrantUserRightsRequest,
  UserRightAssignment
} from "../../core/types/requests/grantUserRightsRequest.js";
import { QueryContractsRequest } from "../../core/types/requests/queryContractsRequest.js";
import { StreamTransactionsRequest } from "../../core/types/requests/streamTransactionsRequest.js";
import { SubmitCommandRequest } from "../../core/types/requests/submitCommandRequest.js";
import { UploadPackageRequest } from "../../core/types/requests/uploadPackageRequest.js";
import { SignCommandResult } from "../../core/signing/signCommandResult.js";
import { CreatePartyResponse } from "../../core/types/responses/createPartyResponse.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grantUserRightsResponse.js";
import { HealthStatusResponse } from "../../core/types/responses/healthStatusResponse.js";
import { QueryContractsResponse } from "../../core/types/responses/queryContractsResponse.js";
import { SubmitCommandResponse } from "../../core/types/responses/submitCommandResponse.js";
import { UploadPackageResponse } from "../../core/types/responses/uploadPackageResponse.js";
import { NotSupportedError } from "../../core/errors/notSupportedError.js";
import { ITransport } from "../../core/transports/iTransport.js";
import { mapJsonSubmitCommand } from "./mappers/commandsMapper.js";
import { mapJsonUploadPackage } from "./mappers/packagesMapper.js";
import { mapJsonCreateParty } from "./mappers/partiesMapper.js";
import { mapJsonQueryContracts } from "./mappers/contractsMapper.js";
import { mapJsonTransactionEvents } from "./mappers/eventsMapper.js";
import { mapJsonHealth } from "./mappers/systemMapper.js";
import { mapJsonGrantRights } from "./mappers/usersMapper.js";
import { IJsonHttpClient } from "./jsonHttpClient.js";
import { TransactionObserver } from "../../services/events/transactionObserver.js";

export class JsonTransport implements ITransport {
  public readonly features = {
    supportsCommandSigning: false
  };

  public constructor(private readonly httpClient: IJsonHttpClient) {}

  public async getHealthAsync(): Promise<HealthStatusResponse> {
    const payload = await this.httpClient.getAsync("/livez");
    return mapJsonHealth(payload as { status?: string; version?: string });
  }

  public async createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse> {
    const payload = await this.httpClient.postAsync("/v1/parties/allocate", {
      identifierHint: request.partyIdHint,
      displayName: request.displayName
    });

    return mapJsonCreateParty(
      payload as { result?: { identifier?: string }; identifier?: string }
    );
  }

  public async grantUserRightsAsync(
    request: GrantUserRightsRequest
  ): Promise<GrantUserRightsResponse> {
    const payload = await this.httpClient.postAsync("/v1/user/rights/grant", {
      userId: request.userId,
      rights: request.rights.map((right: UserRightAssignment) => ({
        type: right.type,
        party: right.party
      }))
    });

    return mapJsonGrantRights(
      payload as { result?: Array<{ type: string; party?: string }> }
    );
  }

  public async uploadPackageAsync(
    request: UploadPackageRequest
  ): Promise<UploadPackageResponse> {
    const payload = await this.httpClient.postAsync("/v1/packages", {
      format: request.format,
      bytes: Array.from(request.bytes)
    });

    return mapJsonUploadPackage(
      payload as { result?: { packageId?: string }; packageId?: string }
    );
  }

  public async queryContractsAsync(
    request: QueryContractsRequest
  ): Promise<QueryContractsResponse> {
    const payload = await this.httpClient.postAsync("/v1/query", {
      templateIds: [request.templateId]
    });

    return mapJsonQueryContracts(payload as { result?: unknown[] });
  }

  public async streamTransactionsAsync(
    _request: StreamTransactionsRequest,
    observer: TransactionObserver
  ): Promise<void> {
    const payload = await this.httpClient.postAsync("/v1/stream/query", {});
    const events = mapJsonTransactionEvents(payload as { events?: unknown[] });

    for (const event of events) {
      await observer.nextAsync(event);
    }
  }

  public async submitCommandAsync(
    request: SubmitCommandRequest,
    signed?: SignCommandResult
  ): Promise<SubmitCommandResponse> {
    if (signed) {
      throw new NotSupportedError("command signing is not supported by json transport");
    }

    const payload = await this.httpClient.postAsync("/v1/create", {
      applicationId: request.applicationId,
      actAs: request.actAs
    });

    return mapJsonSubmitCommand(
      payload as {
        result?: { commandId?: string; transactionId?: string };
        commandId?: string;
        transactionId?: string;
      }
    );
  }
}
