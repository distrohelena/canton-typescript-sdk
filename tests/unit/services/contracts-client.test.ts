import { describe, expect, it, vi } from "vitest";
import {
    GetActiveContractsPageRequest,
    GetActiveContractsPageResponse,
    GetActiveContractsRequest,
} from "../../../src";
import { StateServiceClient } from "../../../src/services/state/state-service-client.js";

describe("StateServiceClient", () => {
    it("reads active contract pages through the selected transport", async () => {
        const request = new GetActiveContractsPageRequest({
            party: "Alice",
            templateId: "Main:Iou",
        });

        const transport = {
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => {
                throw new Error("not used");
            },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            createPartyAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listPartiesAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadPackageAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            queryContractsAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async () =>
                new GetActiveContractsPageResponse({ contracts: [] }),
            getActiveContractsAsync: async () => {
                throw new Error("not used");
            },
            streamTransactionsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            streamQueryAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new StateServiceClient(transport);

        expect(request.party).toBe("Alice");
        expect(request.templateId).toBe("Main:Iou");
        await expect(
            client.getActiveContractsPageAsync(request),
        ).resolves.toBeInstanceOf(
            GetActiveContractsPageResponse,
        );
    });

    it("reads active contracts through the selected transport", async () => {
        const request = new GetActiveContractsRequest({
            party: "Alice",
            templateId: "Main:Iou",
        });

        const nextAsync = vi.fn(async () => undefined);

        const transport = {
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => {
                throw new Error("not used");
            },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            createPartyAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listPartiesAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadPackageAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            queryContractsAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsAsync: async (
                _request: GetActiveContractsRequest,
                observer: { nextAsync(event: unknown): Promise<void> },
            ) => {
                await observer.nextAsync({ contractId: "c1" });
            },
            streamTransactionsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
            streamQueryAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new StateServiceClient(transport);

        expect(request.party).toBe("Alice");
        expect(request.templateId).toBe("Main:Iou");
        await client.getActiveContractsAsync(request, { nextAsync });
        expect(nextAsync).toHaveBeenCalledWith({ contractId: "c1" });
    });
});
