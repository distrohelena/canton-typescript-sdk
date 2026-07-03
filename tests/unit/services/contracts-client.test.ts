import { describe, expect, it } from "vitest";
import { QueryContractsRequest, QueryContractsResponse } from "../../../src";
import { ContractsClient } from "../../../src/services/contracts/contracts-client.js";

describe("ContractsClient", () => {
    it("queries contracts through the selected transport", async () => {
        const request = new QueryContractsRequest({
            party: "Alice",
            templateId: "Main:Iou",
        });

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

        expect(request.party).toBe("Alice");
        expect(request.templateId).toBe("Main:Iou");
        await expect(client.queryAsync(request)).resolves.toBeInstanceOf(
            QueryContractsResponse,
        );
    });
});
