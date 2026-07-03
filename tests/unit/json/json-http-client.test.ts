import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestOptions } from "../../../src/core/types/request-options.js";
import { JsonHttpClient } from "../../../src/transports/json/json-http-client.js";

describe("JsonHttpClient request timeouts", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        globalThis.fetch = originalFetch;
    });

    it("aborts slow requests when the default timeout elapses", async () => {
        globalThis.fetch = vi.fn((_input, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    reject(new Error("request aborted"));
                });
            });
        }) as typeof fetch;

        const client = new JsonHttpClient("http://localhost:7575", undefined, 1_000);

        const request = client.getAsync("/livez");

        void request.catch(() => undefined);

        await vi.advanceTimersByTimeAsync(1_000);

        await expect(request).rejects.toThrow("request aborted");
    });

    it("lets per-request timeout overrides win over the default timeout", async () => {
        let abortCount = 0;

        globalThis.fetch = vi.fn((_input, init) => {
            return new Promise((_resolve, reject) => {
                init?.signal?.addEventListener("abort", () => {
                    abortCount += 1;
                    reject(new Error("request aborted"));
                });
            });
        }) as typeof fetch;

        const client = new JsonHttpClient("http://localhost:7575", undefined, 1_000);

        const request = client.getAsync(
            "/livez",
            new RequestOptions({
                timeoutMs: 2_500,
            }),
        );

        void request.catch(() => undefined);

        await vi.advanceTimersByTimeAsync(1_000);
        expect(abortCount).toBe(0);

        await vi.advanceTimersByTimeAsync(1_499);
        expect(abortCount).toBe(0);

        await vi.advanceTimersByTimeAsync(1);

        await expect(request).rejects.toThrow("request aborted");
        expect(abortCount).toBe(1);
    });
});
