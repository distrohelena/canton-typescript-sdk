import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListPartyHostingLimitsRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterUid?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterUid?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterUid = init.filterUid;
    }
}
