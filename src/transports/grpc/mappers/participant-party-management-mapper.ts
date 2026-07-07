import { GetHighestOffsetByTimestampRequest } from "../../../core/types/requests/get-highest-offset-by-timestamp-request.js";
import { GetHighestOffsetByTimestampResponse } from "../../../core/types/responses/get-highest-offset-by-timestamp-response.js";
import { GetHighestOffsetByTimestampRequest as GrpcGetHighestOffsetByTimestampRequest } from "../generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import { GetHighestOffsetByTimestampResponse as GrpcGetHighestOffsetByTimestampResponse } from "../generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";
import { mapGrpcTimestamp } from "./topology-common-mapper.js";

export function mapGrpcGetHighestOffsetByTimestampRequest(
    request: GetHighestOffsetByTimestampRequest,
): GrpcGetHighestOffsetByTimestampRequest {
    return {
        synchronizerId: request.synchronizerId,
        timestamp: mapGrpcTimestamp(request.timestamp),
        force: request.force,
    };
}

export function mapGrpcGetHighestOffsetByTimestamp(
    payload: Partial<GrpcGetHighestOffsetByTimestampResponse>,
): GetHighestOffsetByTimestampResponse {
    return new GetHighestOffsetByTimestampResponse({
        ledgerOffset: payload.ledgerOffset ?? "",
    });
}
