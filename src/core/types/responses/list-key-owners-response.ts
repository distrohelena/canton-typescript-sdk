import { TopologyKeyOwnerResult } from "../topology/topology-key-owner-result.js";

export class ListKeyOwnersResponse {
    public readonly results: TopologyKeyOwnerResult[];

    public constructor(init: {
        results: TopologyKeyOwnerResult[];
    }) {
        this.results = [...init.results];
    }
}
