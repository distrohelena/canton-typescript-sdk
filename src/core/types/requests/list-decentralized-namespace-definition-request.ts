import { TopologyBaseQuery } from "../topology/topology-base-query.js";

export class ListDecentralizedNamespaceDefinitionRequest {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly filterNamespace?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        filterNamespace?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.filterNamespace = init.filterNamespace;
    }
}
