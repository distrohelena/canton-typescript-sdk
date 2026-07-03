export class ParticipantListPackagesRequest {
    public readonly limit?: number;
    public readonly filterName?: string;

    public constructor(init: {
        limit?: number;
        filterName?: string;
    } = {}) {
        this.limit = init.limit;
        this.filterName = init.filterName;
    }
}
