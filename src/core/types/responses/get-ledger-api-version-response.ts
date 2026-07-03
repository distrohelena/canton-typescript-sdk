export class GetLedgerApiVersionResponse {
    public readonly version: string;
    public readonly features?: unknown;

    public constructor(init: { version: string; features?: unknown }) {
        this.version = init.version;
        this.features = init.features;
    }
}
