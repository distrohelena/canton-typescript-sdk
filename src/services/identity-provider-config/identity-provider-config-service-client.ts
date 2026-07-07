import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { GetIdentityProviderConfigRequest } from "../../core/types/requests/get-identity-provider-config-request.js";
import { ListIdentityProviderConfigsRequest } from "../../core/types/requests/list-identity-provider-configs-request.js";
import { GetIdentityProviderConfigResponse } from "../../core/types/responses/get-identity-provider-config-response.js";
import { ListIdentityProviderConfigsResponse } from "../../core/types/responses/list-identity-provider-configs-response.js";

export class IdentityProviderConfigServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    /** Reads one ledger-admin identity provider config. Supported on gRPC; JSON rejects it. */
    public getIdentityProviderConfigAsync(
        request: GetIdentityProviderConfigRequest,
        options?: RequestOptions,
    ): Promise<GetIdentityProviderConfigResponse> {
        return this.transport.getIdentityProviderConfigAsync(request, options);
    }

    /** Lists ledger-admin identity provider configs. Supported on gRPC; JSON rejects it. */
    public listIdentityProviderConfigsAsync(
        request: ListIdentityProviderConfigsRequest,
        options?: RequestOptions,
    ): Promise<ListIdentityProviderConfigsResponse> {
        return this.transport.listIdentityProviderConfigsAsync(
            request,
            options,
        );
    }
}
