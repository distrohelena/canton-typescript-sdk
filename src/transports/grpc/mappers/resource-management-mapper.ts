import { ResourceLimits } from "../../../core/types/resource-limits.js";
import { GetResourceLimitsRequest } from "../../../core/types/requests/get-resource-limits-request.js";
import { GetResourceLimitsResponse } from "../../../core/types/responses/get-resource-limits-response.js";
import { GetResourceLimitsResponse as GrpcGetResourceLimitsResponse } from "../generated/canton/com/digitalasset/canton/admin/participant/v30/resource_management_service.js";

export function mapGrpcGetResourceLimitsRequest(
    _request: GetResourceLimitsRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcGetResourceLimits(
    payload: Partial<GrpcGetResourceLimitsResponse>,
): GetResourceLimitsResponse {
    return new GetResourceLimitsResponse({
        currentLimits:
            payload.currentLimits === undefined
                ? undefined
                : new ResourceLimits({
                    maxInflightValidationRequests:
                        payload.currentLimits.maxInflightValidationRequests,
                    maxSubmissionRate:
                        payload.currentLimits.maxSubmissionRate,
                    maxSubmissionBurstFactor:
                        payload.currentLimits.maxSubmissionBurstFactor,
                }),
    });
}
