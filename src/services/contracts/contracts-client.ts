import { ITransport } from "../../core/transports/transport.interface.js";
import { QueryContractsRequest } from "../../core/types/requests/query-contracts-request.js";
import { QueryContractsResponse } from "../../core/types/responses/query-contracts-response.js";

export class ContractsClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Queries contracts. Supported on JSON and gRPC. */
    public queryAsync(
        request: QueryContractsRequest,
    ): Promise<QueryContractsResponse> {
        return this.transport.queryContractsAsync(request);
    }
}
