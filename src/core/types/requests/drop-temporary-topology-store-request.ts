import { TopologyStoreTemporary } from "../topology/topology-store-id.js";

export class DropTemporaryTopologyStoreRequest {
    public readonly storeId?: TopologyStoreTemporary;

    public constructor(init: {
        storeId?: TopologyStoreTemporary;
    } = {}) {
        this.storeId = init.storeId;
    }
}
