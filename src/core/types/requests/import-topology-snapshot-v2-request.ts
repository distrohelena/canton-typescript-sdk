import { TopologyDuration } from "../topology/topology-duration.js";
import { TopologyStoreId } from "../topology/topology-store-id.js";

export class ImportTopologySnapshotV2Request {
    public readonly topologySnapshot: Uint8Array;
    public readonly store?: TopologyStoreId;
    public readonly waitToBecomeEffective?: TopologyDuration;

    public constructor(init: {
        topologySnapshot?: Uint8Array;
        store?: TopologyStoreId;
        waitToBecomeEffective?: TopologyDuration;
    } = {}) {
        this.topologySnapshot = new Uint8Array(init.topologySnapshot ?? []);
        this.store = init.store;
        this.waitToBecomeEffective = init.waitToBecomeEffective;
    }
}
