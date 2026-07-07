export class LookupOffsetByTimeRequest {
    public readonly timestamp?: Date;

    public constructor(init?: {
        timestamp?: Date;
    }) {
        this.timestamp = init?.timestamp;
    }
}
