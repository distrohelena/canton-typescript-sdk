import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type {
    GetCommandStatusRequest,
    GetCommandStatusResponse,
} from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/command_inspection_service.js";

export class CommandInspectionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads ledger-admin command status records. Supported on gRPC; JSON rejects it. */
    public getCommandStatusAsync(
        request: GetCommandStatusRequest,
        options?: RequestOptions,
    ): Promise<GetCommandStatusResponse> {
        return this.transport.getCommandStatusAsync(request, options);
    }
}
