import { CurrentTimeRequest } from "../../../core/types/requests/current-time-request.js";
import { GetIdRequest } from "../../../core/types/requests/get-id-request.js";
import { CurrentTimeResponse } from "../../../core/types/responses/current-time-response.js";
import { GetIdResponse } from "../../../core/types/responses/get-id-response.js";
import { CurrentTimeResponse as GrpcCurrentTimeResponse } from "../generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";
import { GetIdResponse as GrpcGetIdResponse } from "../generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";

export function mapGrpcGetIdRequest(
    _request: GetIdRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcGetId(
    payload: Partial<GrpcGetIdResponse>,
): GetIdResponse {
    return new GetIdResponse({
        initialized: payload.initialized,
        uniqueIdentifier: payload.uniqueIdentifier || undefined,
    });
}

export function mapGrpcCurrentTimeRequest(
    _request: CurrentTimeRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcCurrentTime(
    payload: Partial<GrpcCurrentTimeResponse>,
): CurrentTimeResponse {
    return new CurrentTimeResponse({
        currentTime: payload.currentTime ?? "0",
    });
}
