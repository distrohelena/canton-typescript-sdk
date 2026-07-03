import { HealthCheckStatus } from "../../../core/types/health-check-status.js";
import { HealthCheckResponse } from "../../../core/types/responses/health-check-response.js";
import { HealthCheckResponse_ServingStatus } from "../generated/canton/google/grpc/health/v1/health.js";

export function mapGrpcHealthCheckResponse(payload: {
    status: HealthCheckResponse_ServingStatus;
}): HealthCheckResponse {
    return new HealthCheckResponse({
        status: mapGrpcHealthStatus(payload.status),
    });
}

function mapGrpcHealthStatus(
    status: HealthCheckResponse_ServingStatus,
): HealthCheckStatus {
    switch (status) {
        case HealthCheckResponse_ServingStatus.SERVING:
            return HealthCheckStatus.serving;
        case HealthCheckResponse_ServingStatus.NOT_SERVING:
            return HealthCheckStatus.notServing;
        case HealthCheckResponse_ServingStatus.SERVICE_UNKNOWN:
            return HealthCheckStatus.serviceUnknown;
        case HealthCheckResponse_ServingStatus.UNKNOWN:
        default:
            return HealthCheckStatus.unknown;
    }
}
