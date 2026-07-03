import { ITransport } from "../../core/transports/transport.interface.js";

export class EventQueryServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }
}
