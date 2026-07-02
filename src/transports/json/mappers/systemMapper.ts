import { HealthStatusResponse } from "../../../core/types/responses/healthStatusResponse.js";

export function mapJsonHealth(payload: {
  status?: string;
  version?: string;
}): HealthStatusResponse {
  return new HealthStatusResponse({
    status: payload.status ?? "unknown",
    version: payload.version
  });
}
