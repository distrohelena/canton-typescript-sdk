export class ListKeyOwnersRequest {
    public readonly asOf?: Date;
    public readonly limit?: number;
    public readonly synchronizerIds: string[];
    public readonly filterKeyOwnerType?: string;
    public readonly filterKeyOwnerUid?: string;

    public constructor(init: {
        asOf?: Date;
        limit?: number;
        synchronizerIds?: string[];
        filterKeyOwnerType?: string;
        filterKeyOwnerUid?: string;
    } = {}) {
        this.asOf = init.asOf;
        this.limit = init.limit;
        this.synchronizerIds = [...(init.synchronizerIds ?? [])];
        this.filterKeyOwnerType = init.filterKeyOwnerType;
        this.filterKeyOwnerUid = init.filterKeyOwnerUid;
    }
}
