import { TopologyMappingResult } from "../topology/topology-mapping-result.js";
import { TopologyVettedPackages } from "../topology/vetted-packages.js";

export class TopologyListVettedPackagesResponse {
    public readonly results: TopologyMappingResult<TopologyVettedPackages>[];

    public constructor(init: {
        results: TopologyMappingResult<TopologyVettedPackages>[];
    }) {
        this.results = [...init.results];
    }
}
