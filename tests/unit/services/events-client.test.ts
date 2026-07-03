import { describe, expect, it, vi } from "vitest";
import { GetUpdatesRequest, NotSupportedError } from "../../../src";
import { UpdateServiceClient } from "../../../src/services/update/update-service-client.js";

describe("UpdateServiceClient", () => {
    it("surfaces unsupported update streaming", async () => {
        const transport = {
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () => {
                throw new Error("not used");
            },
            grantUserRightsAsync: async () => {
                throw new Error("not used");
            },
            uploadDarFileAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsPageAsync: async () => {
                throw new Error("not used");
            },
            getActiveContractsAsync: async () => {
                throw new Error("not used");
            },
            getUpdatesAsync: async () => {
                throw new NotSupportedError(
                    "UpdateService.GetUpdates is gRPC-only",
                );
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new UpdateServiceClient(transport);

        await expect(
            client.getUpdatesAsync(
                new GetUpdatesRequest({ party: "Alice" }),
                { nextAsync: vi.fn(async () => undefined) },
            ),
        ).rejects.toThrow(NotSupportedError);
    });
});
