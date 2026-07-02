import { CreatePartyRequest } from "../../core/types/requests/createPartyRequest.js";
import {
  GrantUserRightsRequest,
  UserRightAssignment
} from "../../core/types/requests/grantUserRightsRequest.js";
import { UploadPackageRequest } from "../../core/types/requests/uploadPackageRequest.js";
import { CreatePartyResponse } from "../../core/types/responses/createPartyResponse.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grantUserRightsResponse.js";
import { HealthStatusResponse } from "../../core/types/responses/healthStatusResponse.js";
import { UploadPackageResponse } from "../../core/types/responses/uploadPackageResponse.js";
import { ITransport } from "../../core/transports/iTransport.js";
import { mapJsonUploadPackage } from "./mappers/packagesMapper.js";
import { mapJsonCreateParty } from "./mappers/partiesMapper.js";
import { mapJsonHealth } from "./mappers/systemMapper.js";
import { mapJsonGrantRights } from "./mappers/usersMapper.js";
import { IJsonHttpClient } from "./jsonHttpClient.js";

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
}
