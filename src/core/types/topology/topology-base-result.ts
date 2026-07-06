import { TopologyMappingOperation } from "./topology-mapping-operation.js";
import { TopologyStoreId } from "./topology-store-id.js";

export class TopologyBaseResult {
    public readonly storeId?: TopologyStoreId;
    public readonly sequencedAt?: Date;
    public readonly validFrom?: Date;
    public readonly validUntil?: Date;
    public readonly operation: TopologyMappingOperation;
    public readonly transactionHash: Uint8Array;
    public readonly serial: number;
    public readonly signedByFingerprints: string[];

    public constructor(init: {
        storeId?: TopologyStoreId;
        sequencedAt?: Date;
        validFrom?: Date;
        validUntil?: Date;
        operation?: TopologyMappingOperation;
        transactionHash?: Uint8Array;
        serial?: number;
        signedByFingerprints?: string[];
    } = {}) {
        this.storeId = init.storeId;
        this.sequencedAt = init.sequencedAt;
        this.validFrom = init.validFrom;
        this.validUntil = init.validUntil;
        this.operation = init.operation ?? TopologyMappingOperation.unspecified;
        this.transactionHash = new Uint8Array(init.transactionHash ?? []);
        this.serial = init.serial ?? 0;
        this.signedByFingerprints = [...(init.signedByFingerprints ?? [])];
    }
}
