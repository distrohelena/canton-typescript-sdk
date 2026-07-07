import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetEventsByContractIdRequest } from "../../core/types/requests/get-events-by-contract-id-request.js";
import { GetEventsByContractIdResponse } from "../../core/types/responses/get-events-by-contract-id-response.js";

export class EventQueryServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads lifecycle events for a contract id. Supported on gRPC; JSON rejects it. */
    public getEventsByContractIdAsync(
        request: GetEventsByContractIdRequest,
        options?: RequestOptions,
    ): Promise<GetEventsByContractIdResponse> {
        return this.transport.getEventsByContractIdAsync(request, options);
    }
}
