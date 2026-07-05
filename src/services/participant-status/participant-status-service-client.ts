import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetParticipantStatusRequest } from "../../core/types/requests/get-participant-status-request.js";
import { GetParticipantStatusResponse } from "../../core/types/responses/get-participant-status-response.js";

export class ParticipantStatusServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads participant admin status. Supported on gRPC; JSON rejects it. */
    public getParticipantStatusAsync(
        request: GetParticipantStatusRequest,
        options?: RequestOptions,
    ): Promise<GetParticipantStatusResponse> {
        return this.transport.getParticipantStatusAsync(request, options);
    }
}
