import { TransportError } from "../../core/errors/transport-error.js";
import { ITransport } from "../../core/transports/transport.interface.js";
import { HealthStatusResponse } from "../../core/types/responses/health-status-response.js";

export class VersionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads the ledger API version. Placeholder until transport alignment lands. */
    public async getLedgerApiVersionAsync(): Promise<HealthStatusResponse> {
        throw new TransportError(
            "VersionService.GetLedgerApiVersion is not available yet",
        );
    }
}
