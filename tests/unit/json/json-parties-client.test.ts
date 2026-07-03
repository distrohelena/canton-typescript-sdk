import { describe, expect, it } from "vitest";
import { ListKnownPartiesRequest } from "../../../src";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";
import { JsonTransport } from "../../../src/transports/json/json-transport.js";

describe("PartyManagementServiceClient with JSON transport", () => {
    it("calls /v2/parties with the shared query parameters", async () => {
        let requestedPath = "";

        const transport = new JsonTransport({
            getAsync: async (path: string) => {
                requestedPath = path;

                return {
                    partyDetails: [
                        {
                            party: "Alice",
                            isLocal: true,
                        },
                    ],
                    nextPageToken: "next-1",
                };
            },
            postAsync: async () => ({}),
        });

        const client = new PartyManagementServiceClient(transport);

        const result = await client.listKnownPartiesAsync(
            new ListKnownPartiesRequest({
                identityProviderId: "default",
                filterParty: "Alice",
                pageSize: 25,
                pageToken: "token-1",
            }),
        );

        expect(requestedPath).toBe(
            "/v2/parties?identity-provider-id=default&filter-party=Alice&pageSize=25&pageToken=token-1",
        );
        expect(result.partyDetails[0].party).toBe("Alice");
    });
});
