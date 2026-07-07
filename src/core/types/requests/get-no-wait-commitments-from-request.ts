export class GetNoWaitCommitmentsFromRequest {
    public readonly synchronizerIds: readonly string[];
    public readonly participantUids: readonly string[];

    public constructor(init?: {
        synchronizerIds?: readonly string[];
        participantUids?: readonly string[];
    }) {
        this.synchronizerIds = [...(init?.synchronizerIds ?? [])];
        this.participantUids = [...(init?.participantUids ?? [])];
    }
}
