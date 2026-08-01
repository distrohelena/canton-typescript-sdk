import { describe, expect, it } from "vitest";
import { AllocatePartyRequest } from "../../../src/core/types/requests/allocate-party-request.js";
import { mapJsonAllocatePartyRequest } from "../../../src/transports/json/mappers/parties-mapper.js";

describe("mapJsonAllocatePartyRequest", () => {
    it("forwards the allocated party user", () => {
        expect(
            mapJsonAllocatePartyRequest(
                new AllocatePartyRequest({
                    partyIdHint: "Alice",
                    userId: "ledger-api-user",
                }),
            ),
        ).toMatchObject({
            partyIdHint: "Alice",
            userId: "ledger-api-user",
        });
    });
});
