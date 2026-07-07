export class ListUsersRequest {
    public readonly pageToken?: string;
    public readonly pageSize?: number;
    public readonly identityProviderId?: string;

    public constructor(init?: {
        pageToken?: string;
        pageSize?: number;
        identityProviderId?: string;
    }) {
        this.pageToken = init?.pageToken;
        this.pageSize = init?.pageSize;
        this.identityProviderId = init?.identityProviderId;
    }
}
