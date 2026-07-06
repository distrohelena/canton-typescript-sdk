import { DecentralizedNamespaceDefinition } from "../topology/decentralized-namespace-definition.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListDecentralizedNamespaceDefinitionResponse {
    public readonly results: TopologyMappingResult<DecentralizedNamespaceDefinition>[];

    public constructor(init: {
        results: TopologyMappingResult<DecentralizedNamespaceDefinition>[];
    }) {
        this.results = [...init.results];
    }
}
