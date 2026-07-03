import { ITransport } from "../../core/transports/transport.interface.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";

export class UsersClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    public grantRightsAsync(
        request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse> {
        return this.transport.grantUserRightsAsync(request);
    }
}
