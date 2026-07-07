export interface CompletionObserver<TEvent = unknown> {
    nextAsync(event: TEvent): Promise<void>;
}
