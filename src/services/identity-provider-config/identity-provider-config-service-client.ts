import { ITransport } from "../../core/transports/transport.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import type { GetIdentityProviderConfigRequest, GetIdentityProviderConfigResponse, ListIdentityProviderConfigsRequest, ListIdentityProviderConfigsResponse } from "../../transports/grpc/generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";

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
