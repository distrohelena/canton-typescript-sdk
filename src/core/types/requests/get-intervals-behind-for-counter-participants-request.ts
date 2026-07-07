export class GetIntervalsBehindForCounterParticipantsRequest {
    public readonly counterParticipantIds: readonly string[];
    public readonly synchronizerIds: readonly string[];
    public readonly threshold?: string;

    public constructor(init?: {
        counterParticipantIds?: readonly string[];
        synchronizerIds?: readonly string[];
        threshold?: string;
    }) {
        this.counterParticipantIds = [...(init?.counterParticipantIds ?? [])];
        this.synchronizerIds = [...(init?.synchronizerIds ?? [])];
        this.threshold = init?.threshold;
    }
}
