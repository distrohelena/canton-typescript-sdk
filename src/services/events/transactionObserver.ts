export interface TransactionObserver<TEvent = unknown> {
  nextAsync(event: TEvent): Promise<void>;
}
