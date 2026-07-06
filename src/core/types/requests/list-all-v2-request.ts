import { TopologyBaseQuery } from "../topology/topology-base-query.js";
import { TopologyMappingCode } from "../topology/topology-mapping-code.js";

export class ListAllV2Request {
    public readonly baseQuery?: TopologyBaseQuery;
    public readonly includeMappings: TopologyMappingCode[];
    public readonly filterNamespace?: string;

    public constructor(init: {
        baseQuery?: TopologyBaseQuery;
        includeMappings?: TopologyMappingCode[];
        filterNamespace?: string;
    } = {}) {
        this.baseQuery = init.baseQuery;
        this.includeMappings = [...(init.includeMappings ?? [])];
        this.filterNamespace = init.filterNamespace;
    }
}
