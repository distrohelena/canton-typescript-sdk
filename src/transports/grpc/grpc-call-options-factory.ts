import { credentials } from "@grpc/grpc-js";
import { IAuthProvider } from "../../core/auth/auth-provider.interface.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";

export function createGrpcChannelCredentials(
    security: GrpcChannelSecurity,
) {
    return security === GrpcChannelSecurity.insecure
        ? credentials.createInsecure()
        : credentials.createSsl();
}

export async function buildGrpcCallOptionsAsync(
    authProvider?: IAuthProvider,
): Promise<{ meta: Record<string, string> }> {
    return {
        meta: authProvider ? await authProvider.getHeadersAsync() : {},
    };
}
