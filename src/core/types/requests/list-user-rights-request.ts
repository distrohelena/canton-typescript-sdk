export class ListUserRightsRequest {
    public readonly userId: string;
    public readonly identityProviderId?: string;

    public constructor(init: {
        userId: string;
        identityProviderId?: string;
    }) {
        this.userId = init.userId;
        this.identityProviderId = init.identityProviderId;
    }
}
