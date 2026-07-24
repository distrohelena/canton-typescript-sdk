/** Result of a gRPC command submission that waited for its transaction. */
export class SubmitCommandTransactionResponse {
    public constructor(
        public readonly transactionId: string,
        public readonly events: readonly unknown[],
        public readonly transaction: unknown,
    ) {}
}
