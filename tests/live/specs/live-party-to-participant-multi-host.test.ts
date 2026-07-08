import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TransportKind } from "../../../src/index.js";
import { createLiveMultiHostPartyToParticipantAsync } from "../scenarios/create-live-multi-host-party-to-participant.js";
import {
    LiveMultiNodeEnvironment,
    createLiveMultiNodeEnvironment,
    getConfiguredLiveMultiNodeCount,
} from "../runtime/live-multi-node-test-environment.js";
import {
    LiveMultiNodeClients,
    createLiveMultiNodeClients,
    disposeLiveMultiNodeClientsAsync,
} from "../runtime/live-multi-node-client-factory.js";
import { assertLiveMultiNodeConnectivityAsync } from "../runtime/live-connectivity-preflight.js";

const isMultiHostExternalPartyTestEnabled =
    process.env.SDK_TEST_ENABLE_MULTI_HOST_EXTERNAL_PARTY === "1";
const describeIfMultiHostExternalPartyEnabled =
    isMultiHostExternalPartyTestEnabled ? describe : describe.skip;
const runIfMultiHostExternalPartyEnabled =
    isMultiHostExternalPartyTestEnabled ? it : it.skip;
const runIfThreeHostsConfigured =
    isMultiHostExternalPartyTestEnabled
        && getConfiguredLiveMultiNodeCount() >= 3
        ? it
        : it.skip;

describeIfMultiHostExternalPartyEnabled("live multi-host party-to-participant topology", () => {
    let environment: LiveMultiNodeEnvironment;
    let clients: LiveMultiNodeClients;

    beforeAll(async () => {
        environment = createLiveMultiNodeEnvironment({
            transportKind: TransportKind.grpc,
        });

        await assertLiveMultiNodeConnectivityAsync(environment, {
            requiredNodeCount: 3,
            participantAdminOnlyNodeIndexes: [1, 2],
        });

        clients = createLiveMultiNodeClients(environment);
    });

    afterAll(async () => {
        await disposeLiveMultiNodeClientsAsync(clients);
    });

    runIfMultiHostExternalPartyEnabled("creates and reads back a fresh stored_on_2 party", async () => {
        const result = await createLiveMultiHostPartyToParticipantAsync(
            clients,
            {
                topologyPatternName: "stored_on_2",
                hostCount: 2,
                threshold: 2,
            },
        );

        expect(result.partyId.startsWith("stored_on_2::")).toBe(true);
        expect(result.readBack.threshold).toBe(2);
        expect(result.readBack.participants).toHaveLength(2);
        expect(
            result.readBack.participants
                .map((item) => item.participantUid)
                .sort(),
        ).toEqual([...result.expectedParticipantUids].sort());
    }, 60_000);

    runIfThreeHostsConfigured("creates and reads back a fresh stored_on_3 party", async () => {
        const result = await createLiveMultiHostPartyToParticipantAsync(
            clients,
            {
                topologyPatternName: "stored_on_3",
                hostCount: 3,
                threshold: 3,
            },
        );

        expect(result.partyId.startsWith("stored_on_3::")).toBe(true);
        expect(result.readBack.threshold).toBe(3);
        expect(result.readBack.participants).toHaveLength(3);
        expect(
            result.readBack.participants
                .map((item) => item.participantUid)
                .sort(),
        ).toEqual([...result.expectedParticipantUids].sort());
    }, 60_000);

    runIfThreeHostsConfigured("creates and reads back a fresh threshold_2_of_3 party", async () => {
        const result = await createLiveMultiHostPartyToParticipantAsync(
            clients,
            {
                topologyPatternName: "threshold_2_of_3",
                hostCount: 3,
                threshold: 2,
            },
        );

        expect(result.partyId.startsWith("threshold_2_of_3::")).toBe(true);
        expect(result.readBack.threshold).toBe(2);
        expect(result.readBack.participants).toHaveLength(3);
        expect(
            result.readBack.participants
                .map((item) => item.participantUid)
                .sort(),
        ).toEqual([...result.expectedParticipantUids].sort());
    }, 60_000);
});
