import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { HealthCheckRequest } from "../../core/types/requests/health-check-request.js";
import { HealthCheckResponse } from "../../core/types/responses/health-check-response.js";

export class HealthServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Checks gRPC health. Supported on gRPC; JSON rejects it. */
    public checkAsync(
        request: HealthCheckRequest,
        options?: RequestOptions,
    ): Promise<HealthCheckResponse> {
        return this.transport.checkHealthAsync(request, options);
    }
}
