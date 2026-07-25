import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    TrafficControlStateRequest,
    TrafficControlStateResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/traffic_control_service.js";

export class TrafficControlServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads participant traffic control state. Supported on gRPC; JSON rejects it. */
    public trafficControlStateAsync(
        request: TrafficControlStateRequest,
        options?: RequestOptions,
    ): Promise<TrafficControlStateResponse> {
        return this.transport.trafficControlStateAsync(request, options);
    }
}
