import { ITransport } from "../../core/transports/transport.interface.js";

export class CommandSubmissionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }
}
