export class TopologyStateFilter {
    public readonly participantIds: string[];
    public readonly synchronizerIds: string[];

    public constructor(init: {
        participantIds?: string[];
        synchronizerIds?: string[];
    } = {}) {
        this.participantIds = [...(init.participantIds ?? [])];
        this.synchronizerIds = [...(init.synchronizerIds ?? [])];
    }
}
