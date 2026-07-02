import { ITransport } from "../../core/transports/iTransport.js";
import { StreamTransactionsRequest } from "../../core/types/requests/streamTransactionsRequest.js";
import { TransactionObserver } from "./transactionObserver.js";

export class EventsClient {
  public constructor(private readonly transport: ITransport) {
    void this.transport;
  }

  public streamTransactionsAsync(
    request: StreamTransactionsRequest,
    observer: TransactionObserver
  ): Promise<void> {
    return this.transport.streamTransactionsAsync(request, observer);
  }
}
