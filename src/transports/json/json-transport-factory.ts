import { CantonClientOptions } from "../../client/canton-client-options.js";
import { JsonHttpClient } from "./json-http-client.js";
import { JsonTransport } from "./json-transport.js";

export function createJsonTransport(
    options: CantonClientOptions,
    endpoint: string,
): JsonTransport {
    return new JsonTransport(
        new JsonHttpClient(
            endpoint,
            options.authProvider,
            options.defaultRequestTimeoutMs,
        ),
    );
}
