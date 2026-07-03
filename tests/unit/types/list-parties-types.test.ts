import { describe, expect, it } from "vitest";
import {
    ListKnownPartiesRequest,
    ListKnownPartiesResponse,
    PartyDetails,
} from "../../../src";

describe("list known parties sdk types", () => {
    it("stores request filters", () => {
        const request = new ListKnownPartiesRequest({
            identityProviderId: "default",
            filterParty: "Alice",
            pageSize: 25,
            pageToken: "token-1",
        });

        expect(request.identityProviderId).toBe("default");
        expect(request.filterParty).toBe("Alice");
        expect(request.pageSize).toBe(25);
        expect(request.pageToken).toBe("token-1");
    });

    it("stores response party details", () => {
        const party = new PartyDetails({
            party: "Alice",
            isLocal: true,
            localMetadata: { region: "us" },
            identityProviderId: "default",
        });

        const response = new ListKnownPartiesResponse({
            partyDetails: [party],
            nextPageToken: "next-1",
        });

        expect(response.partyDetails[0]).toBeInstanceOf(PartyDetails);
        expect(response.nextPageToken).toBe("next-1");
    });
});
