import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListAllRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly excludeMappings: string[];
    public readonly filterNamespace?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        excludeMappings?: string[];
        filterNamespace?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.excludeMappings = [...(init.excludeMappings ?? [])];
        this.filterNamespace = init.filterNamespace;
    }
}
