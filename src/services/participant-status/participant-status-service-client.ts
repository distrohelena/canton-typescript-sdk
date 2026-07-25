import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type { ParticipantStatusRequest, ParticipantStatusResponse } from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.js";

export class ParticipantStatusServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads participant admin status. Supported on gRPC; JSON rejects it. */
    public getParticipantStatusAsync(
        request: ParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<ParticipantStatusResponse> {
        return this.transport.getParticipantStatusAsync(request, options);
    }
}
