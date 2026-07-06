import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListPartyToKeyMappingRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterParty?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterParty?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterParty = init.filterParty;
    }
}
