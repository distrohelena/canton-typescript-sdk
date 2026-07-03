export class ListKnownPartiesRequest {
    public readonly identityProviderId?: string;
    public readonly filterParty?: string;
    public readonly pageSize?: number;
    public readonly pageToken?: string;

    public constructor(
        init: {
            identityProviderId?: string;
            filterParty?: string;
            pageSize?: number;
            pageToken?: string;
        } = {},
    ) {
        this.identityProviderId = init.identityProviderId;
        this.filterParty = init.filterParty;
        this.pageSize = init.pageSize;
        this.pageToken = init.pageToken;
    }
}
