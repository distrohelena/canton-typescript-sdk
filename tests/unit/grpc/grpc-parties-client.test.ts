import { describe, expect, it } from "vitest";
import { ListKnownPartiesRequest } from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { PartyManagementServiceClient } from "../../../src/services/party-management/party-management-service-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("PartyManagementServiceClient with gRPC transport", () => {
    it("delegates listKnownParties through grpc operations", async () => {
        let capturedRequest: unknown;

        const transport = new GrpcTransport(
            createFakeGrpcOperations({
                listPartiesAsync: async request => {
                    capturedRequest = request;

                    return {
                        partyDetails: [{ party: "Alice", isLocal: true }],
                        nextPageToken: "next-1",
                    };
                },
            }),
        );

        const client = new PartyManagementServiceClient(transport);

        const result = await client.listKnownPartiesAsync(
            new ListKnownPartiesRequest({ filterParty: "Alice" }),
        );

        expect(capturedRequest).toMatchObject({ filterParty: "Alice" });
        expect(result.partyDetails[0].party).toBe("Alice");
    });
});
