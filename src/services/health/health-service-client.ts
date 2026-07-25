import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type { HealthCheckRequest, HealthCheckResponse } from "../../transports/grpc/generated/canton/google/grpc/health/v1/health.js";

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
