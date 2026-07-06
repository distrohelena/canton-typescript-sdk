import { NamespaceDelegation } from "../topology/namespace-delegation.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListNamespaceDelegationResponse {
    public readonly results: TopologyMappingResult<NamespaceDelegation>[];

    public constructor(init: {
        results: TopologyMappingResult<NamespaceDelegation>[];
    }) {
        this.results = [...init.results];
    }
}
