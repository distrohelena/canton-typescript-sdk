import { SequencerSynchronizerState } from "../topology/sequencer-synchronizer-state.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListSequencerSynchronizerStateResponse {
    public readonly results: TopologyMappingResult<SequencerSynchronizerState>[];

    public constructor(init: {
        results: TopologyMappingResult<SequencerSynchronizerState>[];
    }) {
        this.results = [...init.results];
    }
}
