import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListSequencingParametersStateRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterSynchronizerId?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterSynchronizerId?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterSynchronizerId = init.filterSynchronizerId;
    }
}
