import { MediatorSynchronizerState } from "../topology/mediator-synchronizer-state.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListMediatorSynchronizerStateResponse {
    public readonly results: TopologyMappingResult<MediatorSynchronizerState>[];

    public constructor(init: {
        results: TopologyMappingResult<MediatorSynchronizerState>[];
    }) {
        this.results = [...init.results];
    }
}
