export class GetActiveContractsPageResponse<TContract = unknown> {
    public readonly contracts: readonly TContract[];
    public readonly activeAtOffset?: string;
    public readonly nextPageToken?: Uint8Array;

    public constructor(init: {
        contracts: readonly TContract[];
        activeAtOffset?: string;
        nextPageToken?: Uint8Array;
    }) {
        this.contracts = init.contracts;
        this.activeAtOffset = init.activeAtOffset;
        this.nextPageToken = init.nextPageToken;
    }
}
