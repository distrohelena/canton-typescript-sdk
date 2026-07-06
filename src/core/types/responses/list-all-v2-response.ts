import { TopologyTransactions } from "../topology/topology-transactions.js";

export class ListAllV2Response {
    public readonly result?: TopologyTransactions;

    public constructor(init: {
        result?: TopologyTransactions;
    } = {}) {
        this.result = init.result;
    }
}
