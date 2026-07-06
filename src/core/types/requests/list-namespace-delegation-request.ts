import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListNamespaceDelegationRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterNamespace?: string;
    public readonly filterTargetKeyFingerprint?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterNamespace?: string;
        filterTargetKeyFingerprint?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterNamespace = init.filterNamespace;
        this.filterTargetKeyFingerprint = init.filterTargetKeyFingerprint;
    }
}
