import { CantonClientOptions } from "../../client/canton-client-options.js";
import { GrpcChannelSecurity } from "../../core/types/grpc-channel-security.js";
import { createDefaultGrpcTransport } from "./grpc-transport.js";

export function createGrpcTransport(
    options: CantonClientOptions,
    endpoint: string,
    grpcChannelSecurity: GrpcChannelSecurity,
) {
    return createDefaultGrpcTransport(
        options,
        endpoint,
        grpcChannelSecurity,
    );
}
