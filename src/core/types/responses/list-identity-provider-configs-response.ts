import { IdentityProviderConfig } from "../identity-provider-config.js";

export class ListIdentityProviderConfigsResponse {
    public readonly identityProviderConfigs: readonly IdentityProviderConfig[];

    public constructor(init?: {
        identityProviderConfigs?: readonly IdentityProviderConfig[];
    }) {
        this.identityProviderConfigs = init?.identityProviderConfigs ?? [];
    }
}
