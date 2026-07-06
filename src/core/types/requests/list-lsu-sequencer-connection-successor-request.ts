import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListLsuSequencerConnectionSuccessorRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterSequencerId?: string;
    public readonly filterSuccessorPhysicalSynchronizerId?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterSequencerId?: string;
        filterSuccessorPhysicalSynchronizerId?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterSequencerId = init.filterSequencerId;
        this.filterSuccessorPhysicalSynchronizerId =
            init.filterSuccessorPhysicalSynchronizerId;
    }
}
