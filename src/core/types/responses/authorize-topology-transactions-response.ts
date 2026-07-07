import { SignedTopologyTransaction } from "../topology/signed-topology-transaction.js";

export class AuthorizeTopologyTransactionsResponse {
    public readonly transaction?: SignedTopologyTransaction;

    public constructor(init: {
        transaction?: SignedTopologyTransaction;
    } = {}) {
        this.transaction = init.transaction;
    }
}
