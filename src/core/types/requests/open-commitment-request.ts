export class OpenCommitmentRequest {
    public readonly commitment: Uint8Array;
    public readonly physicalSynchronizerId: string;
    public readonly computedForCounterParticipantUid: string;
    public readonly periodEndTick?: Date;

    public constructor(init: {
        commitment: Uint8Array;
        physicalSynchronizerId: string;
        computedForCounterParticipantUid: string;
        periodEndTick?: Date;
    }) {
        this.commitment = new Uint8Array(init.commitment);
        this.physicalSynchronizerId = init.physicalSynchronizerId;
        this.computedForCounterParticipantUid =
            init.computedForCounterParticipantUid;
        this.periodEndTick = init.periodEndTick;
    }
}
