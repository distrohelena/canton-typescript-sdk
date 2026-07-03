import { VettedPackage } from "./vetted-package.js";

export class VettedPackages {
    public readonly packages: VettedPackage[];
    public readonly participantId: string;
    public readonly synchronizerId: string;
    public readonly topologySerial: number;

    public constructor(init: {
        packages: VettedPackage[];
        participantId: string;
        synchronizerId: string;
        topologySerial: number;
    }) {
        this.packages = [...init.packages];
        this.participantId = init.participantId;
        this.synchronizerId = init.synchronizerId;
        this.topologySerial = init.topologySerial;
    }
}
