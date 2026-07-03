import { describe, expect, it } from "vitest";
import { QueryContractsRequest, SubmitCommandRequest } from "../../../src";
import { createFakeJsonHttpClient } from "../../fixtures/fake-json-server.js";

describe("json transport entrypoint", () => {
    it("exports protocol-specific entrypoints", async () => {
        const jsonModule = await import("../../../src/json/index.js");

        const client = new jsonModule.JsonLedgerClient(
            createFakeJsonHttpClient({
                "/v1/query": { result: [{ contractId: "c1" }] },
                "/v1/create": {
                    result: { commandId: "cmd-1", transactionId: "tx-1" },
                },
            }),
        );

        expect(jsonModule).toHaveProperty("JsonLedgerClient");
        await expect(
            client.contracts.queryAsync(
                new QueryContractsRequest({ templateId: "Main:Iou" }),
            ),
        ).resolves.toBeDefined();
        await expect(
            client.commands.submitAsync(
                new SubmitCommandRequest({
                    applicationId: "app-1",
                    actAs: ["Alice"],
                }),
            ),
        ).resolves.toBeDefined();
    });
});
