export class SynchronizerTime {
    public readonly synchronizerId: string;
    public readonly recordTime?: Date;

    public constructor(init: {
        synchronizerId: string;
        recordTime?: Date;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.recordTime = init.recordTime;
    }
}
