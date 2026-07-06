import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListOwnerToKeyMappingRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterKeyOwnerType?: string;
    public readonly filterKeyOwnerUid?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterKeyOwnerType?: string;
        filterKeyOwnerUid?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterKeyOwnerType = init.filterKeyOwnerType;
        this.filterKeyOwnerUid = init.filterKeyOwnerUid;
    }
}
