import { PartyToParticipant } from "../topology/party-to-participant.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListPartyToParticipantResponse {
    public readonly results: TopologyMappingResult<PartyToParticipant>[];

    public constructor(init: {
        results: TopologyMappingResult<PartyToParticipant>[];
    }) {
        this.results = [...init.results];
    }
}
