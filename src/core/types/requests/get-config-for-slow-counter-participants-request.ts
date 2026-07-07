export class GetConfigForSlowCounterParticipantsRequest {
    public readonly synchronizerIds: readonly string[];

    public constructor(init?: {
        synchronizerIds?: readonly string[];
    }) {
        this.synchronizerIds = [...(init?.synchronizerIds ?? [])];
    }
}
