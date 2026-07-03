import { ITransport } from "../../core/transports/transport.interface.js";

export class ContractServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }
}
