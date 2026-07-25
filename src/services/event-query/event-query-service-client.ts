import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";

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
