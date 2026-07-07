export class GetUpdatesPageRequest {
    public readonly beginOffsetExclusive?: string;
    public readonly endOffsetInclusive?: string;
    public readonly maxPageSize?: number;
    public readonly updateFormat?: Record<string, unknown>;
    public readonly descendingOrder: boolean;
    public readonly pageToken?: Uint8Array;

    public constructor(init?: {
        beginOffsetExclusive?: string;
        endOffsetInclusive?: string;
        maxPageSize?: number;
        updateFormat?: Record<string, unknown>;
        descendingOrder?: boolean;
        pageToken?: Uint8Array;
    }) {
        this.beginOffsetExclusive = init?.beginOffsetExclusive;
        this.endOffsetInclusive = init?.endOffsetInclusive;
        this.maxPageSize = init?.maxPageSize;
        this.updateFormat = init?.updateFormat;
        this.descendingOrder = init?.descendingOrder ?? false;
        this.pageToken = init?.pageToken;
    }
}
