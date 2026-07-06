import { DynamicSequencingParameters } from "../topology/dynamic-sequencing-parameters.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListSequencingParametersStateResponse {
    public readonly results: TopologyMappingResult<DynamicSequencingParameters>[];

    public constructor(init: {
        results: TopologyMappingResult<DynamicSequencingParameters>[];
    }) {
        this.results = [...init.results];
    }
}
