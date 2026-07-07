import { IdentityProviderConfig } from "../identity-provider-config.js";

export class GetIdentityProviderConfigResponse {
    public readonly identityProviderConfig?: IdentityProviderConfig;

    public constructor(init?: {
        identityProviderConfig?: IdentityProviderConfig;
    }) {
        this.identityProviderConfig = init?.identityProviderConfig;
    }
}
