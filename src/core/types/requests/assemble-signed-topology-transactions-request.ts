import { ExternalTopologySignature } from "../topology/external-topology-signature.js";
import { PreparedTopologyTransaction } from "../topology/prepared-topology-transaction.js";

export class AssembleSignedTopologyTransactionsRequest {
    public readonly preparedTransactions: PreparedTopologyTransaction[];
    public readonly signatures: ExternalTopologySignature[];

    public constructor(init: {
        preparedTransactions?: PreparedTopologyTransaction[];
        signatures?: ExternalTopologySignature[];
    } = {}) {
        this.preparedTransactions = [...(init.preparedTransactions ?? [])];
        this.signatures = [...(init.signatures ?? [])];
    }
}
