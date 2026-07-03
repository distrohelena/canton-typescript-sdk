import { describe, expect, it } from "vitest";
import {
    mapGrpcCreateParty,
    mapGrpcListParties,
    mapGrpcListPartiesRequest,
} from "../../../src/transports/grpc/mappers/parties-mapper.js";
import { ListPartiesRequest } from "../../../src";
import { mapGrpcHealth } from "../../../src/transports/grpc/mappers/system-mapper.js";

describe("gRPC operational mappers", () => {
    it("maps health payloads", () => {
        const result = mapGrpcHealth({ status: "healthy", version: "1.0.0" });

        expect(result.status).toBe("healthy");
        expect(result.version).toBe("1.0.0");
    });

    it("maps party creation payloads", () => {
        const result = mapGrpcCreateParty({ identifier: "Alice" });

        expect(result.party).toBe("Alice");
    });

    it("maps list parties requests", () => {
        const result = mapGrpcListPartiesRequest(
            new ListPartiesRequest({
                identityProviderId: "default",
                filterParty: "Alice",
                pageSize: 25,
                pageToken: "token-1",
            }),
        );

        expect(result).toMatchObject({
            identityProviderId: "default",
            filterParty: "Alice",
            pageSize: 25,
            pageToken: "token-1",
        });
    });

    it("maps list parties responses", () => {
        const result = mapGrpcListParties({
            partyDetails: [
                {
                    party: "Alice",
                    isLocal: true,
                    localMetadata: {
                        resourceVersion: "1",
                        annotations: { region: "us" },
                    },
                    identityProviderId: "default",
                },
            ],
            nextPageToken: "next-1",
        });

        expect(result.partyDetails[0]).toMatchObject({
            party: "Alice",
            isLocal: true,
            identityProviderId: "default",
        });
        expect(result.nextPageToken).toBe("next-1");
    });
});
