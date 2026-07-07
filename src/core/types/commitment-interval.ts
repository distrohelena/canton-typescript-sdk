export class CommitmentInterval {
    public readonly startTickExclusive?: Date;
    public readonly endTickInclusive?: Date;

    public constructor(init: {
        startTickExclusive?: Date;
        endTickInclusive?: Date;
    } = {}) {
        this.startTickExclusive = init.startTickExclusive;
        this.endTickInclusive = init.endTickInclusive;
    }
}
