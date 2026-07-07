export class PreparedTopologyTransaction {
    public readonly serializedTransaction: Uint8Array;
    public readonly transactionHash: Uint8Array;
    public readonly proposal: boolean;

    public constructor(init: {
        serializedTransaction?: Uint8Array;
        transactionHash?: Uint8Array;
        proposal?: boolean;
    } = {}) {
        this.serializedTransaction = new Uint8Array(
            init.serializedTransaction ?? [],
        );
        this.transactionHash = new Uint8Array(init.transactionHash ?? []);
        this.proposal = init.proposal ?? false;
    }
}
