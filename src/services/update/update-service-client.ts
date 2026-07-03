import { ITransport } from "../../core/transports/transport.interface.js";
import { GetUpdatesRequest } from "../../core/types/requests/get-updates-request.js";
import { TransactionObserver } from "../events/transaction-observer.interface.js";

export class UpdateServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads ledger updates. gRPC-backed; JSON currently rejects it. */
    public getUpdatesAsync(
        request: GetUpdatesRequest,
        observer: TransactionObserver,
    ): Promise<void> {
        return this.transport.getUpdatesAsync(request, observer);
    }
}
