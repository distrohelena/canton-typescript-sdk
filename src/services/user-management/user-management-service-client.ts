import { TransportError } from "../../core/errors/transport-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";

export class UserManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Grants user rights. Placeholder until transport alignment lands. */
    public async grantUserRightsAsync(
        _request: GrantUserRightsRequest,
    ): Promise<GrantUserRightsResponse> {
        throw new TransportError(
            "UserManagementService.GrantUserRights is not available yet",
        );
    }
}
