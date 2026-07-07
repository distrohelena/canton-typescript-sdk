import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    AllocatePartyRequest,
    CantonClient,
    ListKnownPartiesRequest,
    TransportKind,
} from "../../../src/index.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";

describe("live party management", () => {
    let jsonClient: CantonClient;

    beforeAll(() => {
        jsonClient = createLiveClient(
            createLiveTestEnvironment({
                transportKind: TransportKind.json,
            }),
        );
    });

    afterAll(async () => {
        await jsonClient.disposeAsync();
    });

    it("allocates and reads back a json party", async () => {
        const partyIdHint = `sdk-live-party-${Date.now()}-json-test`;

        const allocation =
            await jsonClient.partyManagementService.allocatePartyAsync(
                new AllocatePartyRequest({
                    partyIdHint,
                    displayName: partyIdHint,
                }),
            );

        const response =
            await jsonClient.partyManagementService.listKnownPartiesAsync(
                new ListKnownPartiesRequest({
                    filterParty: allocation.party,
                    pageSize: 10,
                }),
            );

        expect(allocation.party).toContain("sdk-live-party-");
        expect(
            response.partyDetails.some((item) => item.party === allocation.party),
        ).toBe(true);
    });
});
