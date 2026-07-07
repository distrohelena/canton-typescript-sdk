export class CommitmentTimeRange {
    public readonly fromExclusive?: Date;
    public readonly toInclusive?: Date;

    public constructor(init: {
        fromExclusive?: Date;
        toInclusive?: Date;
    } = {}) {
        this.fromExclusive = init.fromExclusive;
        this.toInclusive = init.toInclusive;
    }
}
