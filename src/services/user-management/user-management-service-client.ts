import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetUserRequest,
    GetUserResponse,
    GrantUserRightsRequest,
    GrantUserRightsResponse,
    ListUserRightsRequest,
    ListUserRightsResponse,
    ListUsersRequest,
    ListUsersResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/user_management_service.js";

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
