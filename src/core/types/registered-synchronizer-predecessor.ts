export class RegisteredSynchronizerPredecessor {
    public readonly predecessorPhysicalId: string;
    public readonly upgradeTime?: Date;
    public readonly isLateUpgrade: boolean;

    public constructor(init: {
        predecessorPhysicalId: string;
        upgradeTime?: Date;
        isLateUpgrade?: boolean;
    }) {
        this.predecessorPhysicalId = init.predecessorPhysicalId;
        this.upgradeTime = init.upgradeTime;
        this.isLateUpgrade = init.isLateUpgrade ?? false;
    }
}
