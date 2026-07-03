import { describe, expect, it } from "vitest";
import { ListPartiesRequest } from "../../../src";
import { createFakeGrpcOperations } from "../../fixtures/fake-grpc-services.js";
import { PartiesClient } from "../../../src/services/parties/parties-client.js";
import { GrpcTransport } from "../../../src/transports/grpc/grpc-transport.js";

describe("PartiesClient with gRPC transport", () => {
    it("delegates listParties through grpc operations", async () => {
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

        const client = new PartiesClient(transport);

        const result = await client.listAsync(
            new ListPartiesRequest({ filterParty: "Alice" }),
        );

        expect(capturedRequest).toMatchObject({ filterParty: "Alice" });
        expect(result.partyDetails[0].party).toBe("Alice");
    });
});
