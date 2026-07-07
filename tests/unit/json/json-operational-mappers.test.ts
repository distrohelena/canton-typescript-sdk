import { describe, expect, it } from "vitest";
import {
    mapJsonCreateParty,
    mapJsonListParties,
} from "../../../src/transports/json/mappers/parties-mapper.js";
import { mapJsonHealth } from "../../../src/transports/json/mappers/system-mapper.js";

describe("JSON operational mappers", () => {
    it("maps health payloads", () => {
        const result = mapJsonHealth({ status: "healthy", version: "1.0.0" });

        expect(result.status).toBe("healthy");
        expect(result.version).toBe("1.0.0");
    });

    it("maps party creation payloads", () => {
        const result = mapJsonCreateParty({
            partyDetails: {
                party: "Alice",
            },
        });

        expect(result.party).toBe("Alice");
    });

    it("maps list parties payloads", () => {
        const result = mapJsonListParties({
            partyDetails: [
                {
                    party: "Alice",
                    isLocal: true,
                    localMetadata: { attributes: { region: "us" } },
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
