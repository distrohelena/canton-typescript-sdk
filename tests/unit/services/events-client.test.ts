import { describe, expect, it, vi } from "vitest";
import { StreamTransactionsRequest } from "../../../src";
import { EventsClient } from "../../../src/services/events/events-client.js";

describe("EventsClient", () => {
    it("streams transactions through the selected transport", async () => {
        const request = new StreamTransactionsRequest({
            party: "Alice",
            beginOffset: "0",
            endOffset: "10",
            templateId: "Main:Iou",
        });

        const nextAsync = vi.fn(async () => undefined);

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
            queryContractsAsync: async () => {
                throw new Error("not used");
            },
            streamTransactionsAsync: async (
                _request: StreamTransactionsRequest,
                observer: { nextAsync(event: unknown): Promise<void> },
            ) => {
                await observer.nextAsync({ transactionId: "tx-1" });
            },
        };

        const client = new EventsClient(transport);

        expect(request.party).toBe("Alice");
        expect(request.beginOffset).toBe("0");
        expect(request.endOffset).toBe("10");
        expect(request.templateId).toBe("Main:Iou");
        await client.streamTransactionsAsync(request, { nextAsync });

        expect(nextAsync).toHaveBeenCalledWith({ transactionId: "tx-1" });
    });
});
