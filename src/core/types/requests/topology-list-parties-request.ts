export class TopologyListPartiesRequest {
    public readonly asOf?: Date;
    public readonly limit?: number;
    public readonly synchronizerIds: string[];
    public readonly filterParty?: string;
    public readonly filterParticipant?: string;

    public constructor(init: {
        asOf?: Date;
        limit?: number;
        synchronizerIds?: string[];
        filterParty?: string;
        filterParticipant?: string;
    } = {}) {
        this.asOf = init.asOf;
        this.limit = init.limit;
        this.synchronizerIds = [...(init.synchronizerIds ?? [])];
        this.filterParty = init.filterParty;
        this.filterParticipant = init.filterParticipant;
    }
}
