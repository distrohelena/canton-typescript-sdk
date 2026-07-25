import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    CurrentTimeRequest,
    CurrentTimeResponse,
    GetIdRequest,
    GetIdResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/topology/admin/v30/initialization_service.js";

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
