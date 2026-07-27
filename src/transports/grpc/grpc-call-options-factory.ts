import { credentials } from "@grpc/grpc-js";
import { Buffer } from "node:buffer";
import { IAuthProvider } from "../../core/auth/auth-provider.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { resolveRequestTimeoutMs } from "../../core/types/request-timeout.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";

export function createGrpcChannelCredentials(
    security: GrpcChannelSecurity,
    tlsRootCertificates?: Uint8Array,
) {
    if (security === GrpcChannelSecurity.insecure) {
        return credentials.createInsecure();
    }

    return tlsRootCertificates === undefined
        ? credentials.createSsl()
        : credentials.createSsl(Buffer.from(tlsRootCertificates));
}

export async function buildGrpcCallOptionsAsync(
    authProvider?: IAuthProvider,
    defaultTimeoutMs?: number,
    options?: RequestOptions,
): Promise<{ meta: Record<string, string>; timeout?: number }> {
    const timeout = resolveRequestTimeoutMs(defaultTimeoutMs, options);

    return timeout === undefined
        ? {
            meta: authProvider ? await authProvider.getHeadersAsync() : {},
        }
        : {
            meta: authProvider ? await authProvider.getHeadersAsync() : {},
            timeout,
        };
}
