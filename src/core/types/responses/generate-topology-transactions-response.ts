import { GeneratedTopologyTransaction } from "../topology/generated-topology-transaction.js";

export class GenerateTopologyTransactionsResponse {
    public readonly generatedTransactions: GeneratedTopologyTransaction[];

    public constructor(init: {
        generatedTransactions?: GeneratedTopologyTransaction[];
    } = {}) {
        this.generatedTransactions = [...(init.generatedTransactions ?? [])];
    }
}
