import { HealthStatusResponse } from "../../../core/types/responses/health-status-response.js";

export function mapGrpcHealth(payload: {
    status?: string;
    version?: string;
}): HealthStatusResponse {
    return new HealthStatusResponse({
        status: payload.status ?? "unknown",
        version: payload.version,
    });
}
