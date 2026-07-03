import { CantonClientOptions } from "../../client/canton-client-options.js";
import { JsonHttpClient } from "./json-http-client.js";
import { JsonTransport } from "./json-transport.js";

export function createJsonTransport(
    options: CantonClientOptions,
): JsonTransport {
    return new JsonTransport(
        new JsonHttpClient(options.endpoint, options.authProvider),
    );
}
