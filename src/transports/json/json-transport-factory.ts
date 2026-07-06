import { CantonClientOptions } from "../../client/canton-client-options.js";
import { IAuthProvider } from "../../core/auth/auth-provider.interface.js";
import { JsonHttpClient } from "./json-http-client.js";
import { JsonTransport } from "./json-transport.js";

export function createJsonTransport(
    options: CantonClientOptions,
    endpoint: string,
    authProvider?: IAuthProvider,
): JsonTransport {
    return new JsonTransport(
        new JsonHttpClient(
            endpoint,
            authProvider,
            options.defaultRequestTimeoutMs,
        ),
    );
}
