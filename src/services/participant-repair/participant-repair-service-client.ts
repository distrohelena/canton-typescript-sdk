import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { ListPendingOperationsRequest } from "../../core/types/requests/list-pending-operations-request.js";
import { ListPendingOperationsResponse } from "../../core/types/responses/list-pending-operations-response.js";

export class ParticipantRepairServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Lists participant repair pending operations. Supported on gRPC; JSON rejects it. */
    public listPendingOperationsAsync(
        request: ListPendingOperationsRequest,
        options?: RequestOptions,
    ): Promise<ListPendingOperationsResponse> {
        return this.transport.listPendingOperationsAsync(request, options);
    }
}
