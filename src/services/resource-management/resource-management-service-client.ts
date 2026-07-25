import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetResourceLimitsRequest,
    GetResourceLimitsResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";

export class ResourceManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads participant-admin resource limits. Supported on gRPC; JSON rejects it. */
    public getResourceLimitsAsync(
        request: GetResourceLimitsRequest,
        options?: RequestOptions,
    ): Promise<GetResourceLimitsResponse> {
        return this.transport.getResourceLimitsAsync(request, options);
    }
}
