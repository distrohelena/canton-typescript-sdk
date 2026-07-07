export class LookupOffsetByTimeResponse {
    public readonly offset?: string;

    public constructor(init?: {
        offset?: string;
    }) {
        this.offset = init?.offset;
    }
}
