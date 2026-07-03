import { RequestOptions } from "./request-options.js";

export function resolveRequestTimeoutMs(
    defaultTimeoutMs?: number,
    options?: RequestOptions,
): number | undefined {
    return options?.timeoutMs ?? defaultTimeoutMs;
}
