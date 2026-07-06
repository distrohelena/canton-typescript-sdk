import { OwnerToKeyMapping } from "../topology/owner-to-key-mapping.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListOwnerToKeyMappingResponse {
    public readonly results: TopologyMappingResult<OwnerToKeyMapping>[];

    public constructor(init: {
        results: TopologyMappingResult<OwnerToKeyMapping>[];
    }) {
        this.results = [...init.results];
    }
}
