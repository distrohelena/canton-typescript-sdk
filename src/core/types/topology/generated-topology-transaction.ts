export class GeneratedTopologyTransaction {
    public readonly serializedTransaction: Uint8Array;
    public readonly transactionHash: Uint8Array;

    public constructor(init: {
        serializedTransaction?: Uint8Array;
        transactionHash?: Uint8Array;
    } = {}) {
        this.serializedTransaction = new Uint8Array(
            init.serializedTransaction ?? [],
        );
        this.transactionHash = new Uint8Array(init.transactionHash ?? []);
    }
}
