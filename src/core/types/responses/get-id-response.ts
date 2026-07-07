export class GetIdResponse {
    public readonly initialized: boolean;
    public readonly uniqueIdentifier?: string;

    public constructor(init?: {
        initialized?: boolean;
        uniqueIdentifier?: string;
    }) {
        this.initialized = init?.initialized ?? false;
        this.uniqueIdentifier = init?.uniqueIdentifier;
    }
}
