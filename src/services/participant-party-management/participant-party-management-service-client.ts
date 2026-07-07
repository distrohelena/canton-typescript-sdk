import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetHighestOffsetByTimestampRequest } from "../../core/types/requests/get-highest-offset-by-timestamp-request.js";
import { GetHighestOffsetByTimestampResponse } from "../../core/types/responses/get-highest-offset-by-timestamp-response.js";

export class ParticipantPartyManagementServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads the highest participant ledger offset before or at a timestamp. Supported on gRPC; JSON rejects it. */
    public getHighestOffsetByTimestampAsync(
        request: GetHighestOffsetByTimestampRequest,
        options?: RequestOptions,
    ): Promise<GetHighestOffsetByTimestampResponse> {
        return this.transport.getHighestOffsetByTimestampAsync(request, options);
    }
}
