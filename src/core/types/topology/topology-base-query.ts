import { TopologyMappingOperation } from "./topology-mapping-operation.js";
import { TopologyStoreId } from "./topology-store-id.js";

export class TopologyTimeRange {
    public readonly from?: Date;
    public readonly until?: Date;

    public constructor(init: {
        from?: Date;
        until?: Date;
    } = {}) {
        this.from = init.from;
        this.until = init.until;
    }
}

export class TopologyBaseQuery {
    public readonly storeId?: TopologyStoreId;
    public readonly includeProposals: boolean;
    public readonly operation: TopologyMappingOperation;
    public readonly snapshot?: Date;
    public readonly headState?: boolean;
    public readonly timeRange?: TopologyTimeRange;
    public readonly signedKeyFingerprint?: string;
    public readonly protocolVersion?: number;

    public constructor(init: {
        storeId?: TopologyStoreId;
        includeProposals?: boolean;
        operation?: TopologyMappingOperation;
        snapshot?: Date;
        headState?: boolean;
        timeRange?: TopologyTimeRange;
        signedKeyFingerprint?: string;
        protocolVersion?: number;
    } = {}) {
        this.storeId = init.storeId;
        this.includeProposals = init.includeProposals ?? false;
        this.operation = init.operation ?? TopologyMappingOperation.unspecified;
        this.snapshot = init.snapshot;
        this.headState = init.headState;
        this.timeRange = init.timeRange;
        this.signedKeyFingerprint = init.signedKeyFingerprint;
        this.protocolVersion = init.protocolVersion;
    }
}
