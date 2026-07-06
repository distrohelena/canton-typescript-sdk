import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class TopologyListVettedPackagesRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterParticipant?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterParticipant?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterParticipant = init.filterParticipant;
    }
}
