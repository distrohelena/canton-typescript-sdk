import { DynamicSynchronizerParameters } from "../topology/dynamic-synchronizer-parameters.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListSynchronizerParametersStateResponse {
    public readonly results: TopologyMappingResult<DynamicSynchronizerParameters>[];

    public constructor(init: {
        results: TopologyMappingResult<DynamicSynchronizerParameters>[];
    }) {
        this.results = [...init.results];
    }
}
