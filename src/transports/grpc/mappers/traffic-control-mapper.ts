import { TrafficState } from "../../../core/types/traffic-state.js";
import { TrafficControlStateRequest } from "../../../core/types/requests/traffic-control-state-request.js";
import { TrafficControlStateResponse } from "../../../core/types/responses/traffic-control-state-response.js";
import {
    TrafficControlStateRequest as GrpcTrafficControlStateRequest,
    TrafficControlStateResponse as GrpcTrafficControlStateResponse,
    TrafficState as GrpcTrafficState,
} from "../generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";

export function mapGrpcTrafficControlStateRequest(
    request: TrafficControlStateRequest,
): GrpcTrafficControlStateRequest {
    return {
        synchronizerId: request.synchronizerId,
    };
}

export function mapGrpcTrafficControlState(
    payload?: Partial<GrpcTrafficControlStateResponse>,
): TrafficControlStateResponse {
    return new TrafficControlStateResponse({
        trafficState: mapGrpcTrafficState(payload?.trafficState),
    });
}

function mapGrpcTrafficState(
    payload?: Partial<GrpcTrafficState>,
): TrafficState | undefined {
    if (payload === undefined) {
        return undefined;
    }

    return new TrafficState({
        extraTrafficPurchased: payload.extraTrafficPurchased,
        extraTrafficConsumed: payload.extraTrafficConsumed,
        baseTrafficRemainder: payload.baseTrafficRemainder,
        lastConsumedCost: payload.lastConsumedCost,
        timestamp: payload.timestamp,
        serial: payload.serial,
    });
}
