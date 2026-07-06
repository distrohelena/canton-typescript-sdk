import { TopologyPartyResult } from "../topology/topology-party-result.js";

export class TopologyListPartiesResponse {
    public readonly results: TopologyPartyResult[];

    public constructor(init: {
        results: TopologyPartyResult[];
    }) {
        this.results = [...init.results];
    }
}
