import { describe, expect, it, vi } from "vitest";
import { StreamTransactionsRequest } from "../../../src";
import { EventsClient } from "../../../src/services/events/events-client.js";

describe("EventsClient", () => {
    it("streams transactions through the selected transport", async () => {
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

        await client.streamTransactionsAsync(new StreamTransactionsRequest(), {
            nextAsync,
        });

        expect(nextAsync).toHaveBeenCalledWith({ transactionId: "tx-1" });
    });
});
