import { PartyToKeyMapping } from "../topology/party-to-key-mapping.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListPartyToKeyMappingResponse {
    public readonly results: TopologyMappingResult<PartyToKeyMapping>[];

    public constructor(init: {
        results: TopologyMappingResult<PartyToKeyMapping>[];
    }) {
        this.results = [...init.results];
    }
}
