import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    CantonClient,
    ListKnownPartiesRequest,
    TransportKind,
} from "../../../src/index.js";
import { createLiveExternalPartyAsync } from "../scenarios/create-live-external-party.js";
import { createLiveClient } from "../runtime/live-client-factory.js";
import { assertLiveConnectivityAsync } from "../runtime/live-connectivity-preflight.js";
import { LiveTestEnvironment } from "../runtime/live-test-environment.js";
import { createLiveTestEnvironment } from "../runtime/live-test-environment.js";

describe("live external party management", () => {
    let grpcClient: CantonClient;

    let environment: LiveTestEnvironment;

    beforeAll(async () => {
        environment = createLiveTestEnvironment({
            transportKind: TransportKind.grpc,
        });

        await assertLiveConnectivityAsync(environment, {
            requireExternalPartyGrpcSupport: true,
        });

        grpcClient = createLiveClient(environment);
    });

    afterAll(async () => {
        if (grpcClient !== undefined) {
            await grpcClient.disposeAsync();
        }
    });

    it("allocates a fresh ed25519 external party and reads it back", async () => {
        const result = await createLiveExternalPartyAsync(grpcClient);

        expect(result.partyId.startsWith("ed25519_party::")).toBe(true);
        expect(result.participantId).toContain("participant");
        expect(result.partyId).toBe(result.partyDetails.party);
        expect(result.partyId).toBe(result.knownPartyDetails.party);

        const known = await grpcClient.partyManagementService.listKnownPartiesAsync(
            new ListKnownPartiesRequest({
                filterParty: result.partyId,
                pageSize: 10,
            }),
        );

        expect(
            known.partyDetails.some((item) => item.party === result.partyId),
        ).toBe(true);
    });
});
