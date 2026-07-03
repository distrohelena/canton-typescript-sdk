import { PackageMetadataFilter } from "../package-metadata-filter.js";
import { TopologyStateFilter } from "../topology-state-filter.js";

export class ListVettedPackagesRequest {
    public readonly packageMetadataFilter?: PackageMetadataFilter;
    public readonly topologyStateFilter?: TopologyStateFilter;
    public readonly pageToken?: string;
    public readonly pageSize?: number;

    public constructor(init: {
        packageMetadataFilter?: PackageMetadataFilter;
        topologyStateFilter?: TopologyStateFilter;
        pageToken?: string;
        pageSize?: number;
    } = {}) {
        this.packageMetadataFilter = init.packageMetadataFilter;
        this.topologyStateFilter = init.topologyStateFilter;
        this.pageToken = init.pageToken;
        this.pageSize = init.pageSize;
    }
}
