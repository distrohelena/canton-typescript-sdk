import { describe, expect, it } from "vitest";
import { mapGrpcQueryContractsRequest } from "../../../src/transports/grpc/mappers/contracts-mapper.js";

describe("gRPC contracts mapper", () => {
    it("maps an all-party ACS query to the wildcard event filter", () => {
        const mapped = mapGrpcQueryContractsRequest({ allParties: true });

        expect(mapped.eventFormat?.filtersForAnyParty).toBeDefined();
        expect(mapped.eventFormat?.filtersByParty).toEqual({});
    });

    it("maps multiple parties into one event filter", () => {
        const mapped = mapGrpcQueryContractsRequest({ parties: ["Alice", "Bob"] });

        expect(Object.keys(mapped.eventFormat?.filtersByParty ?? {})).toEqual([
            "Alice",
            "Bob",
        ]);
    });
});
