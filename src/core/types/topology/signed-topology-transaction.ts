import { MultiTopologyTransactionSignature } from "./multi-topology-transaction-signature.js";
import { TopologyTransactionSignature } from "./topology-transaction-signature.js";

export class SignedTopologyTransaction {
    public readonly transaction: Uint8Array;
    public readonly signatures: TopologyTransactionSignature[];
    public readonly proposal: boolean;
    public readonly multiTransactionSignatures: MultiTopologyTransactionSignature[];

    public constructor(init: {
        transaction?: Uint8Array;
        signatures?: TopologyTransactionSignature[];
        proposal?: boolean;
        multiTransactionSignatures?: MultiTopologyTransactionSignature[];
    } = {}) {
        this.transaction = new Uint8Array(init.transaction ?? []);
        this.signatures = [...(init.signatures ?? [])];
        this.proposal = init.proposal ?? false;
        this.multiTransactionSignatures = [
            ...(init.multiTransactionSignatures ?? []),
        ];
    }
}
