import { describe, expect, it } from "vitest";
import {
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
    PartyDetails,
} from "../../../src";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";

describe("PartyManagementServiceClient", () => {
    it("lists parties through the selected transport", async () => {
        const transport = {
            features: { supportsCommandSigning: false },
            getLedgerApiVersionAsync: async () => {
                throw new Error("not used");
            },
            allocatePartyAsync: async () => {
                throw new Error("not used");
            },
            listKnownPartiesAsync: async () =>
                new ListKnownPartiesResponse({
                    partyDetails: [
                        new PartyDetails({
                            party: "Alice",
                            isLocal: true,
                        }),
                    ],
                }),
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
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new PartyManagementServiceClient(transport);

        await expect(
            client.listKnownPartiesAsync(
                new ListKnownPartiesRequest({ filterParty: "Alice" }),
            ),
        ).resolves.toMatchObject({
            partyDetails: [{ party: "Alice" }],
        });
    });
});
