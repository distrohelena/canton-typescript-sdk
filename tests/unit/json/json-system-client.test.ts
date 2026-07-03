import { describe, expect, it } from "vitest";
import { SystemClient } from "../../../src/services/system/system-client.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("SystemClient with JSON transport", () => {
    it("maps json health responses into sdk types", async () => {
        const transport = new JsonTransport({
            getAsync: async () => ({ status: "healthy", version: "1.0.0" }),
            postAsync: async () => ({}),
        });

        const client = new SystemClient(transport);

        await expect(client.getHealthAsync()).resolves.toMatchObject({
            status: "healthy",
        });
    });
});
