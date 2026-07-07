import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { CurrentTimeRequest } from "../../core/types/requests/current-time-request.js";
import { GetIdRequest } from "../../core/types/requests/get-id-request.js";
import { CurrentTimeResponse } from "../../core/types/responses/current-time-response.js";
import { GetIdResponse } from "../../core/types/responses/get-id-response.js";

export class IdentityInitializationServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads the topology identity initialization id. Supported on gRPC; JSON rejects it. */
    public getIdAsync(
        request: GetIdRequest,
        options?: RequestOptions,
    ): Promise<GetIdResponse> {
        return this.transport.getIdAsync(request, options);
    }

    /** Reads the topology identity initialization current time. Supported on gRPC; JSON rejects it. */
    public currentTimeAsync(
        request: CurrentTimeRequest,
        options?: RequestOptions,
    ): Promise<CurrentTimeResponse> {
        return this.transport.currentTimeAsync(request, options);
    }
}
