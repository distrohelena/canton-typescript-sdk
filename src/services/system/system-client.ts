import { ITransport } from "../../core/transports/transport.interface.js";
import { HealthStatusResponse } from "../../core/types/responses/health-status-response.js";

export class SystemClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Gets participant health. Supported on JSON and gRPC. */
    public getHealthAsync(): Promise<HealthStatusResponse> {
        return this.transport.getHealthAsync();
    }
}
