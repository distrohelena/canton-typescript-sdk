import { CantonClientOptions } from "../../client/cantonClientOptions.js";
import { JsonHttpClient } from "./jsonHttpClient.js";
import { JsonTransport } from "./jsonTransport.js";

export function createJsonTransport(options: CantonClientOptions): JsonTransport {
  return new JsonTransport(new JsonHttpClient(options.endpoint, options.authProvider));
}
