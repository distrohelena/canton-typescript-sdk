import { describe, expect, it } from "vitest";
import { QueryContractsRequest, QueryContractsResponse } from "../../../src";
import { ContractsClient } from "../../../src/services/contracts/contracts-client.js";

describe("ContractsClient", () => {
    it("queries contracts through the selected transport", async () => {
        const transport = {
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => {
                throw new Error("not used");
            },
            createPartyAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadPackageAsync: async () => {
                throw new Error("not used");
            },
            queryContractsAsync: async () =>
                new QueryContractsResponse({ contracts: [] }),
            streamTransactionsAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new ContractsClient(transport);

        await expect(
            client.queryAsync(
                new QueryContractsRequest({ templateId: "Main:Iou" }),
            ),
        ).resolves.toBeInstanceOf(QueryContractsResponse);
    });
});
