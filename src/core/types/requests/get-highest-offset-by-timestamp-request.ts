export class GetHighestOffsetByTimestampRequest {
    public readonly synchronizerId: string;
    public readonly timestamp: Date;
    public readonly force: boolean;

    public constructor(init: {
        synchronizerId: string;
        timestamp: Date;
        force?: boolean;
    }) {
        this.synchronizerId = init.synchronizerId;
        this.timestamp = init.timestamp;
        this.force = init.force ?? false;
    }
}
