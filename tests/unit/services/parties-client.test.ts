import { describe, expect, it } from "vitest";
import { ListPartiesRequest, ListPartiesResponse, PartyDetails } from "../../../src";
import { PartiesClient } from "../../../src/services/parties/parties-client.js";

describe("PartiesClient", () => {
    it("lists parties through the selected transport", async () => {
        const transport = {
            features: { supportsCommandSigning: false },
            getHealthAsync: async () => {
                throw new Error("not used");
            },
            createPartyAsync: async () => {
                throw new Error("not used");
            },
            listPartiesAsync: async () =>
                new ListPartiesResponse({
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
            uploadPackageAsync: async () => {
                throw new Error("not used");
            },
            queryContractsAsync: async () => {
                throw new Error("not used");
            },
            streamTransactionsAsync: async () => {
                throw new Error("not used");
            },
            submitCommandAsync: async () => {
                throw new Error("not used");
            },
        };

        const client = new PartiesClient(transport);

        await expect(
            client.listAsync(new ListPartiesRequest({ filterParty: "Alice" })),
        ).resolves.toMatchObject({
            partyDetails: [{ party: "Alice" }],
        });
    });
});
