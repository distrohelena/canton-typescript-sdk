import { ITransport } from "../../core/transports/transport.interface.js";
import { GetLedgerApiVersionRequest } from "../../core/types/requests/get-ledger-api-version-request.js";
import { GetLedgerApiVersionResponse } from "../../core/types/responses/get-ledger-api-version-response.js";

export class VersionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads the ledger API version. Supported on JSON and gRPC. */
    public getLedgerApiVersionAsync(
        request?: GetLedgerApiVersionRequest,
    ): Promise<GetLedgerApiVersionResponse> {
        return this.transport.getLedgerApiVersionAsync(request);
    }
}
