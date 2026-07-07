import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetCommandStatusRequest } from "../../core/types/requests/get-command-status-request.js";
import { GetCommandStatusResponse } from "../../core/types/responses/get-command-status-response.js";

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
