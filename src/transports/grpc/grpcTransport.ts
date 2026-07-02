import { CreatePartyRequest } from "../../core/types/requests/createPartyRequest.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grantUserRightsRequest.js";
import { UploadPackageRequest } from "../../core/types/requests/uploadPackageRequest.js";
import { CreatePartyResponse } from "../../core/types/responses/createPartyResponse.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grantUserRightsResponse.js";
import { HealthStatusResponse } from "../../core/types/responses/healthStatusResponse.js";
import { UploadPackageResponse } from "../../core/types/responses/uploadPackageResponse.js";
import { ITransport } from "../../core/transports/iTransport.js";
import { createGrpcOperations, GrpcOperations } from "./grpcChannelFactory.js";
import { mapGrpcUploadPackage, mapGrpcUploadPackageRequest } from "./mappers/packagesMapper.js";
import { mapGrpcCreateParty, mapGrpcCreatePartyRequest } from "./mappers/partiesMapper.js";
import { mapGrpcHealth } from "./mappers/systemMapper.js";
import {
  mapGrpcGrantUserRights,
  mapGrpcGrantUserRightsRequest
} from "./mappers/usersMapper.js";

export class GrpcTransport implements ITransport {
  public readonly features = {
    supportsCommandSigning: true
  };

  public constructor(private readonly operations: GrpcOperations) {}

  public async getHealthAsync(): Promise<HealthStatusResponse> {
    const payload = await this.operations.getHealthAsync();
    return mapGrpcHealth(payload as { status?: string; version?: string });
  }

  public async createPartyAsync(request: CreatePartyRequest): Promise<CreatePartyResponse> {
    const payload = await this.operations.createPartyAsync(
      mapGrpcCreatePartyRequest(request)
    );
    return mapGrpcCreateParty(payload as { identifier?: string });
  }

  public async grantUserRightsAsync(
    request: GrantUserRightsRequest
  ): Promise<GrantUserRightsResponse> {
    const payload = await this.operations.grantUserRightsAsync(
      mapGrpcGrantUserRightsRequest(request)
    );
    return mapGrpcGrantUserRights(
      payload as { rights?: Array<{ type: string; party?: string }> }
    );
  }

  public async uploadPackageAsync(
    request: UploadPackageRequest
  ): Promise<UploadPackageResponse> {
    const payload = await this.operations.uploadPackageAsync(
      mapGrpcUploadPackageRequest(request)
    );
    return mapGrpcUploadPackage(payload as { packageId?: string });
  }
}

export function createDefaultGrpcTransport(endpoint: string): GrpcTransport {
  return new GrpcTransport(createGrpcOperations(endpoint));
}
