import { CantonClientOptions } from "../../client/canton-client-options.js";
import { createDefaultGrpcTransport } from "./grpc-transport.js";

export function createGrpcTransport(options: CantonClientOptions) {
    return createDefaultGrpcTransport(options.endpoint);
}
