import { SignedTopologyTransaction } from "../topology/signed-topology-transaction.js";
import { TopologyDuration } from "../topology/topology-duration.js";
import { TopologyForceFlag } from "../topology/topology-force-flag.js";
import { TopologyStoreId } from "../topology/topology-store-id.js";

export class AddTopologyTransactionsRequest {
    public readonly transactions: SignedTopologyTransaction[];
    public readonly forceChanges: TopologyForceFlag[];
    public readonly store?: TopologyStoreId;
    public readonly waitToBecomeEffective?: TopologyDuration;

    public constructor(init: {
        transactions?: SignedTopologyTransaction[];
        forceChanges?: TopologyForceFlag[];
        store?: TopologyStoreId;
        waitToBecomeEffective?: TopologyDuration;
    } = {}) {
        this.transactions = [...(init.transactions ?? [])];
        this.forceChanges = [...(init.forceChanges ?? [])];
        this.store = init.store;
        this.waitToBecomeEffective = init.waitToBecomeEffective;
    }
}
