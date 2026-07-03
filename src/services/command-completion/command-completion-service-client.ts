import { ITransport } from "../../core/transports/transport.interface.js";

export class CommandCompletionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }
}
