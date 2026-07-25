import { describe, expect, it, vi } from "vitest";
import { NotSupportedError } from "../../../src";
import { GetUpdatesRequest } from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/update_service.js";
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
            getUpdatesAsync: () => (async function* () {
                throw new NotSupportedError("UpdateService.GetUpdates is gRPC-only");
            })(),
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new UpdateServiceClient(transport);

        await expect(
            (async () => { for await (const _update of client.getUpdatesAsync(
                GetUpdatesRequest.create({ beginExclusive: "0" }),
            )) { /* exhaust */ } })(),
        ).rejects.toThrow(NotSupportedError);
    });
});
