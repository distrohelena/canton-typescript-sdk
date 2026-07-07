import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { TrafficControlStateRequest } from "../../core/types/requests/traffic-control-state-request.js";
import { TrafficControlStateResponse } from "../../core/types/responses/traffic-control-state-response.js";

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
