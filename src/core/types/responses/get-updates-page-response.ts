export class GetUpdatesPageResponse<TUpdate = unknown> {
    public readonly updates: readonly TUpdate[];
    public readonly lowestPageOffsetExclusive: string;
    public readonly highestPageOffsetInclusive: string;
    public readonly nextPageToken?: Uint8Array;

    public constructor(init: {
        updates: readonly TUpdate[];
        lowestPageOffsetExclusive: string;
        highestPageOffsetInclusive: string;
        nextPageToken?: Uint8Array;
    }) {
        this.updates = init.updates;
        this.lowestPageOffsetExclusive = init.lowestPageOffsetExclusive;
        this.highestPageOffsetInclusive = init.highestPageOffsetInclusive;
        this.nextPageToken = init.nextPageToken;
    }
}
