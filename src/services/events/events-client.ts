import { ITransport } from "../../core/transports/transport.interface.js";
import { StreamTransactionsRequest } from "../../core/types/requests/stream-transactions-request.js";
import { TransactionObserver } from "./transaction-observer.interface.js";

export class EventsClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /**
     * Streams ledger update events.
     * True streaming support is gRPC-only; JSON only exposes query-stream semantics.
     */
    public streamTransactionsAsync(
        request: StreamTransactionsRequest,
        observer: TransactionObserver,
    ): Promise<void> {
        return this.transport.streamTransactionsAsync(request, observer);
    }
}
