import { TopologyTransactions } from "../topology/topology-transactions.js";

export class ListAllResponse {
    public readonly result?: TopologyTransactions;

    public constructor(init: {
        result?: TopologyTransactions;
    } = {}) {
        this.result = init.result;
    }
}
