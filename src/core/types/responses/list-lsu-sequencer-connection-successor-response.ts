import { LsuSequencerConnectionSuccessor } from "../topology/lsu-sequencer-connection-successor.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListLsuSequencerConnectionSuccessorResponse {
    public readonly results: TopologyMappingResult<LsuSequencerConnectionSuccessor>[];

    public constructor(init: {
        results: TopologyMappingResult<LsuSequencerConnectionSuccessor>[];
    }) {
        this.results = [...init.results];
    }
}
