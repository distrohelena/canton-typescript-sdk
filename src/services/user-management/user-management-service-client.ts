import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";

export class UserManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Grants user rights. Supported on JSON and gRPC. */
    public grantUserRightsAsync(
        request: GrantUserRightsRequest,
        options?: RequestOptions,
    ): Promise<GrantUserRightsResponse> {
        return this.transport.grantUserRightsAsync(request, options);
    }
}
