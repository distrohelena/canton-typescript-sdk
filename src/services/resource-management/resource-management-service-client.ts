import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetResourceLimitsRequest } from "../../core/types/requests/get-resource-limits-request.js";
import { GetResourceLimitsResponse } from "../../core/types/responses/get-resource-limits-response.js";

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
