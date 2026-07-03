import { IAuthProvider } from "../../core/auth/auth-provider.interface.js";
import { RequestOptions } from "../../core/types/request-options.js";
import { resolveRequestTimeoutMs } from "../../core/types/request-timeout.js";

export interface IJsonHttpClient {
    getAsync(path: string, options?: RequestOptions): Promise<unknown>;
    postAsync(path: string, body: unknown, options?: RequestOptions): Promise<unknown>;
}

export class JsonHttpClient implements IJsonHttpClient {
    public constructor(
        private readonly endpoint: string,
        private readonly authProvider?: IAuthProvider,
        private readonly defaultRequestTimeoutMs?: number,
    ) {}

    public async getAsync(
        path: string,
        options?: RequestOptions,
    ): Promise<unknown> {
        return this.sendAsync("GET", path, undefined, options);
    }

    public async postAsync(
        path: string,
        body: unknown,
        options?: RequestOptions,
    ): Promise<unknown> {
        return this.sendAsync("POST", path, body, options);
    }

    private async sendAsync(
        method: string,
        path: string,
        body?: unknown,
        options?: RequestOptions,
    ): Promise<unknown> {
        const headers = this.authProvider
            ? await this.authProvider.getHeadersAsync()
            : {};

        const timeoutMs = resolveRequestTimeoutMs(
            this.defaultRequestTimeoutMs,
            options,
        );

        const controller =
            timeoutMs === undefined ? undefined : new AbortController();

        const timeoutHandle =
            controller === undefined
                ? undefined
                : setTimeout(() => {
                    controller.abort();
                }, timeoutMs);

        try {
            const response = await fetch(new URL(path, this.endpoint), {
                method,
                headers: {
                    "content-type": "application/json",
                    ...headers,
                },
                body: body === undefined ? undefined : JSON.stringify(body),
                signal: controller?.signal,
            });

            return response.json();
        } finally {
            if (timeoutHandle !== undefined) {
                clearTimeout(timeoutHandle);
            }
        }
    }
}
