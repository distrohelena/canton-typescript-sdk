import { SignedTopologyTransaction } from "../topology/signed-topology-transaction.js";
import { TopologyForceFlag } from "../topology/topology-force-flag.js";
import { TopologyStoreId } from "../topology/topology-store-id.js";

export class SignTopologyTransactionsRequest {
    public readonly transactions: SignedTopologyTransaction[];
    public readonly signedBy: string[];
    public readonly store?: TopologyStoreId;
    public readonly forceFlags: TopologyForceFlag[];

    public constructor(init: {
        transactions?: SignedTopologyTransaction[];
        signedBy?: string[];
        store?: TopologyStoreId;
        forceFlags?: TopologyForceFlag[];
    } = {}) {
        this.transactions = [...(init.transactions ?? [])];
        this.signedBy = [...(init.signedBy ?? [])];
        this.store = init.store;
        this.forceFlags = [...(init.forceFlags ?? [])];
    }
}
