import { describe, expect, it, vi } from "vitest";
import { RequestOptions } from "../../../src/core/types/request-options.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("JsonTransport request timeouts", () => {
    it("forwards shared request options into the http client", async () => {
        const getAsync = vi.fn(async () => ({
            status: "healthy",
            version: "3.4.0",
        }));

        const transport = new JsonTransport({
            getAsync,
            postAsync: async () => ({}),
        });

        const options = new RequestOptions({
            timeoutMs: 2_500,
        });

        await transport.getLedgerApiVersionAsync(undefined, options);

        expect(getAsync).toHaveBeenLastCalledWith("/livez", options);
    });
});
