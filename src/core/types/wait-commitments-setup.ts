export class WaitCommitmentsSetup {
    public readonly counterParticipantUid: string;
    public readonly synchronizerIds: readonly string[];

    public constructor(init: {
        counterParticipantUid: string;
        synchronizerIds: readonly string[];
    }) {
        this.counterParticipantUid = init.counterParticipantUid;
        this.synchronizerIds = [...init.synchronizerIds];
    }
}
