export class GetIdentityProviderConfigRequest {
    public readonly identityProviderId: string;

    public constructor(init: {
        identityProviderId: string;
    }) {
        this.identityProviderId = init.identityProviderId;
    }
}
