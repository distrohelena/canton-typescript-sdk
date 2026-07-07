import { describe, expect, it, vi } from "vitest";
import {
    GetIdentityProviderConfigRequest,
    GetIdentityProviderConfigResponse,
    IdentityProviderConfig,
    IdentityProviderConfigServiceClient,
    ListIdentityProviderConfigsRequest,
    ListIdentityProviderConfigsResponse,
    RequestOptions,
} from "../../../src";

describe("IdentityProviderConfigServiceClient", () => {
    it("forwards identity provider config read requests through the selected transport", async () => {
        const getIdentityProviderConfigAsync = vi.fn(
            async () =>
                new GetIdentityProviderConfigResponse({
                    identityProviderConfig: new IdentityProviderConfig({
                        identityProviderId: "idp-1",
                        isDeactivated: false,
                        issuer: "https://issuer.example.com",
                        jwksUrl: "https://issuer.example.com/jwks.json",
                        audience: "ledger-api",
                    }),
                }),
        );

        const listIdentityProviderConfigsAsync = vi.fn(
            async () =>
                new ListIdentityProviderConfigsResponse({
                    identityProviderConfigs: [
                        new IdentityProviderConfig({
                            identityProviderId: "idp-1",
                            isDeactivated: false,
                            issuer: "https://issuer.example.com",
                            jwksUrl: "https://issuer.example.com/jwks.json",
                            audience: "ledger-api",
                        }),
                    ],
                }),
        );

        const transport = {
            features: { supportsCommandSigning: false },
            disposeAsync: async () => undefined,
            getIdentityProviderConfigAsync,
            listIdentityProviderConfigsAsync,
        };

        const client = new IdentityProviderConfigServiceClient(
            transport as never,
        );

        const getRequest = new GetIdentityProviderConfigRequest({
            identityProviderId: "idp-1",
        });

        const listRequest = new ListIdentityProviderConfigsRequest();

        const options = new RequestOptions({
            timeoutMs: 5_000,
        });

        await expect(
            client.getIdentityProviderConfigAsync(
                getRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(GetIdentityProviderConfigResponse);

        await expect(
            client.listIdentityProviderConfigsAsync(
                listRequest,
                options,
            ),
        ).resolves.toBeInstanceOf(ListIdentityProviderConfigsResponse);

        expect(getIdentityProviderConfigAsync).toHaveBeenCalledWith(
            getRequest,
            options,
        );
        expect(listIdentityProviderConfigsAsync).toHaveBeenCalledWith(
            listRequest,
            options,
        );
    });
});
