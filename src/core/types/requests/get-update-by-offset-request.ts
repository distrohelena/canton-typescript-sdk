export class GetUpdateByOffsetRequest {
    public readonly offset: string;
    public readonly updateFormat?: Record<string, unknown>;

    public constructor(init: {
        offset: string;
        updateFormat?: Record<string, unknown>;
    }) {
        this.offset = init.offset;
        this.updateFormat = init.updateFormat;
    }
}
