export class IdentityProviderConfig {
    public readonly identityProviderId: string;
    public readonly isDeactivated: boolean;
    public readonly issuer: string;
    public readonly jwksUrl: string;
    public readonly audience?: string;

    public constructor(init: {
        identityProviderId: string;
        isDeactivated?: boolean;
        issuer: string;
        jwksUrl: string;
        audience?: string;
    }) {
        this.identityProviderId = init.identityProviderId;
        this.isDeactivated = init.isDeactivated ?? false;
        this.issuer = init.issuer;
        this.jwksUrl = init.jwksUrl;
        this.audience = init.audience;
    }
}
