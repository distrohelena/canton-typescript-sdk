import { TopologyTransactionSignature } from "./topology-transaction-signature.js";

export class MultiTopologyTransactionSignature {
    public readonly transactionHashes: Uint8Array[];
    public readonly signatures: TopologyTransactionSignature[];

    public constructor(init: {
        transactionHashes?: Uint8Array[];
        signatures?: TopologyTransactionSignature[];
    } = {}) {
        this.transactionHashes = (init.transactionHashes ?? []).map(
            (value) => new Uint8Array(value),
        );
        this.signatures = [...(init.signatures ?? [])];
    }
}
