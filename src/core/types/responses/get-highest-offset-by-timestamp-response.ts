export class GetHighestOffsetByTimestampResponse {
    public readonly ledgerOffset: string;

    public constructor(init?: {
        ledgerOffset?: string;
    }) {
        this.ledgerOffset = init?.ledgerOffset ?? "";
    }
}
