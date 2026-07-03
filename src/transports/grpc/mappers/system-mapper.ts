import { HealthStatusResponse } from "../../../core/types/responses/health-status-response.js";
import { GetLedgerApiVersionResponse } from "../generated/canton/com/daml/ledger/api/v2/version_service.js";

export function mapGrpcHealth(payload: {
    status?: string;
    version?: string;
} | GetLedgerApiVersionResponse): HealthStatusResponse {
    return new HealthStatusResponse({
        status: "status" in payload ? (payload.status ?? "healthy") : "healthy",
        version: payload.version,
    });
}
