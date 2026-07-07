import { SignedTopologyTransaction } from "../topology/signed-topology-transaction.js";

export class SignTopologyTransactionsResponse {
    public readonly transactions: SignedTopologyTransaction[];

    public constructor(init: {
        transactions?: SignedTopologyTransaction[];
    } = {}) {
        this.transactions = [...(init.transactions ?? [])];
    }
}
