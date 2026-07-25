import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    ListPendingOperationsRequest,
    ListPendingOperationsResponse,
} from "../../transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_repair_service.js";

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
