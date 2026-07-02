import { CantonClientOptions } from "../../client/cantonClientOptions.js";
import { createDefaultGrpcTransport } from "./grpcTransport.js";

export function createGrpcTransport(options: CantonClientOptions) {
  return createDefaultGrpcTransport(options.endpoint);
}
