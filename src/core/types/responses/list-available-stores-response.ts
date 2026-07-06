import { TopologyStoreId } from "../topology/topology-store-id.js";

export class ListAvailableStoresResponse {
    public readonly storeIds: TopologyStoreId[];

    public constructor(init: {
        storeIds: TopologyStoreId[];
    }) {
        this.storeIds = [...init.storeIds];
    }
}
