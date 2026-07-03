import { describe, expect, it } from "vitest";
import { GetLedgerApiVersionResponse } from "../../../src";
import { VersionServiceClient } from "../../../src/services/version/version-service-client.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("VersionServiceClient with JSON transport", () => {
    it("maps JSON ledger API version responses into sdk types", async () => {
        const transport = new JsonTransport({
            getAsync: async () => ({ status: "healthy", version: "1.0.0" }),
            postAsync: async () => ({}),
        });

        const client = new VersionServiceClient(transport);

        await expect(client.getLedgerApiVersionAsync()).resolves.toBeInstanceOf(
            GetLedgerApiVersionResponse,
        );
    });
});
