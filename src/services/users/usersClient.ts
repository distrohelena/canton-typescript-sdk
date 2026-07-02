import { ITransport } from "../../core/transports/iTransport.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grantUserRightsRequest.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grantUserRightsResponse.js";

export class UsersClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }

  public grantRightsAsync(
    request: GrantUserRightsRequest
  ): Promise<GrantUserRightsResponse> {
    return this.transport.grantUserRightsAsync(request);
  }
}
