import { TopologyVettedPackage } from "./vetted-package.js";

export class TopologyVettedPackages {
    public readonly packages: TopologyVettedPackage[];
    public readonly packageIds: string[];
    public readonly participantUid: string;
    public readonly participantId: string;
    public readonly synchronizerId?: string;
    public readonly topologySerial?: number;

    public constructor(init: {
        packages?: TopologyVettedPackage[];
        packageIds?: string[];
        participantUid?: string;
        participantId?: string;
        synchronizerId?: string;
        topologySerial?: number;
    } = {}) {
        this.packages = [...(init.packages ?? [])];
        this.packageIds = [...(init.packageIds ?? [])];
        this.participantUid = init.participantUid ?? init.participantId ?? "";
        this.participantId = init.participantId ?? init.participantUid ?? "";
        this.synchronizerId = init.synchronizerId;
        this.topologySerial = init.topologySerial;
    }
}
