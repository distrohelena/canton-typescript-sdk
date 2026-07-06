export class LsuAnnouncement {
    public readonly successorPhysicalSynchronizerId: string;
    public readonly upgradeTime?: Date;

    public constructor(init: {
        successorPhysicalSynchronizerId: string;
        upgradeTime?: Date;
    }) {
        this.successorPhysicalSynchronizerId =
            init.successorPhysicalSynchronizerId;
        this.upgradeTime = init.upgradeTime;
    }
}
