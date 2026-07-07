import { IdentityProviderConfig } from "../../../core/types/identity-provider-config.js";
import { GetIdentityProviderConfigRequest } from "../../../core/types/requests/get-identity-provider-config-request.js";
import { ListIdentityProviderConfigsRequest } from "../../../core/types/requests/list-identity-provider-configs-request.js";
import { GetIdentityProviderConfigResponse } from "../../../core/types/responses/get-identity-provider-config-response.js";
import { ListIdentityProviderConfigsResponse } from "../../../core/types/responses/list-identity-provider-configs-response.js";
import { GetIdentityProviderConfigResponse as GrpcGetIdentityProviderConfigResponse } from "../generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";
import { ListIdentityProviderConfigsResponse as GrpcListIdentityProviderConfigsResponse } from "../generated/canton/com/daml/ledger/api/v2/admin/identity_provider_config_service.js";

export function mapGrpcGetIdentityProviderConfigRequest(
    request: GetIdentityProviderConfigRequest,
): {
    identityProviderId: string;
} {
    return {
        identityProviderId: request.identityProviderId,
    };
}

export function mapGrpcGetIdentityProviderConfig(
    payload: Partial<GrpcGetIdentityProviderConfigResponse>,
): GetIdentityProviderConfigResponse {
    return new GetIdentityProviderConfigResponse({
        identityProviderConfig: mapGrpcIdentityProviderConfig(
            payload.identityProviderConfig,
        ),
    });
}

export function mapGrpcListIdentityProviderConfigsRequest(
    _request: ListIdentityProviderConfigsRequest,
): Record<string, never> {
    return {};
}

export function mapGrpcListIdentityProviderConfigs(
    payload: Partial<GrpcListIdentityProviderConfigsResponse>,
): ListIdentityProviderConfigsResponse {
    return new ListIdentityProviderConfigsResponse({
        identityProviderConfigs:
            payload.identityProviderConfigs?.map(
                mapGrpcIdentityProviderConfig,
            ).filter(isDefined) ?? [],
    });
}

function isDefined<TValue>(
    value: TValue | undefined,
): value is TValue {
    return value !== undefined;
}

function mapGrpcIdentityProviderConfig(payload?: {
    identityProviderId: string;
    isDeactivated: boolean;
    issuer: string;
    jwksUrl: string;
    audience: string;
}): IdentityProviderConfig | undefined {
    if (payload === undefined) {
        return undefined;
    }

    return new IdentityProviderConfig({
        identityProviderId: payload.identityProviderId,
        isDeactivated: payload.isDeactivated,
        issuer: payload.issuer,
        jwksUrl: payload.jwksUrl,
        audience: payload.audience || undefined,
    });
}
