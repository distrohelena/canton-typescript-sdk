import { PartyHostingLimits } from "../topology/party-hosting-limits.js";
import { TopologyMappingResult } from "../topology/topology-mapping-result.js";

export class ListPartyHostingLimitsResponse {
    public readonly results: TopologyMappingResult<PartyHostingLimits>[];

    public constructor(init: {
        results: TopologyMappingResult<PartyHostingLimits>[];
    }) {
        this.results = [...init.results];
    }
}
