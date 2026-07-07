import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetUserRequest } from "../../core/types/requests/get-user-request.js";
import { GrantUserRightsRequest } from "../../core/types/requests/grant-user-rights-request.js";
import { ListUserRightsRequest } from "../../core/types/requests/list-user-rights-request.js";
import { ListUsersRequest } from "../../core/types/requests/list-users-request.js";
import { GetUserResponse } from "../../core/types/responses/get-user-response.js";
import { GrantUserRightsResponse } from "../../core/types/responses/grant-user-rights-response.js";
import { ListUserRightsResponse } from "../../core/types/responses/list-user-rights-response.js";
import { ListUsersResponse } from "../../core/types/responses/list-users-response.js";

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

    /** Reads a participant user. Supported on gRPC; JSON rejects it. */
    public getUserAsync(
        request: GetUserRequest,
        options?: RequestOptions,
    ): Promise<GetUserResponse> {
        return this.transport.getUserAsync(request, options);
    }

    /** Lists participant users. Supported on gRPC; JSON rejects it. */
    public listUsersAsync(
        request: ListUsersRequest,
        options?: RequestOptions,
    ): Promise<ListUsersResponse> {
        return this.transport.listUsersAsync(request, options);
    }

    /** Lists rights for a participant user. Supported on gRPC; JSON rejects it. */
    public listUserRightsAsync(
        request: ListUserRightsRequest,
        options?: RequestOptions,
    ): Promise<ListUserRightsResponse> {
        return this.transport.listUserRightsAsync(request, options);
    }
}
