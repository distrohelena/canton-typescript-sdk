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
const runIfFiveHostsConfigured =
    isMultiHostExternalPartyTestEnabled
        && getConfiguredLiveMultiNodeCount() >= 5
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
            requiredNodeCount: 5,
        });

        clients = createLiveMultiNodeClients(environment);
    });

    afterAll(async () => {
        await disposeLiveMultiNodeClientsAsync(clients);
    });

    runIfMultiHostExternalPartyEnabled("creates and reads back a fresh threshold_2_of_3 party", async () => {
        const result = await createLiveMultiHostPartyToParticipantAsync(
            clients,
            {
                scenarioName: "ptp_c123_t2",
                confirmingHostIndexes: [0, 1, 2],
                threshold: 2,
                observingHostIndexes: [],
                localParticipantObservationOnly: false,
            },
        );

        expect(result.partyId.startsWith("ptp_c123_t2::")).toBe(true);
        expect(result.readBack.threshold).toBe(2);
        expect(result.readBack.participants).toHaveLength(3);
        expect(result.expectedConfirmingParticipantUids).toHaveLength(3);
        expect(result.expectedObservingParticipantUids).toHaveLength(0);
    }, 60_000);

    runIfFiveHostsConfigured("creates and reads back a fresh threshold_3_of_5 party", async () => {
        const result = await createLiveMultiHostPartyToParticipantAsync(
            clients,
            {
                scenarioName: "ptp_c12345_t3",
                confirmingHostIndexes: [0, 1, 2, 3, 4],
                threshold: 3,
                observingHostIndexes: [],
                localParticipantObservationOnly: false,
            },
        );

        expect(result.partyId.startsWith("ptp_c12345_t3::")).toBe(true);
        expect(result.readBack.threshold).toBe(3);
        expect(result.readBack.participants).toHaveLength(5);
        expect(result.expectedConfirmingParticipantUids).toHaveLength(5);
        expect(result.expectedObservingParticipantUids).toHaveLength(0);
    }, 60_000);

    runIfFiveHostsConfigured("creates and reads back a fresh threshold_2_of_3 party with a fourth observer", async () => {
        const result = await createLiveMultiHostPartyToParticipantAsync(
            clients,
            {
                scenarioName: "ptp_c123_t2_o4",
                confirmingHostIndexes: [0, 1, 2],
                threshold: 2,
                observingHostIndexes: [3],
                localParticipantObservationOnly: false,
            },
        );

        expect(result.partyId.startsWith("ptp_c123_t2_o4::")).toBe(true);
        expect(result.readBack.threshold).toBe(2);
        expect(result.readBack.participants).toHaveLength(4);
        expect(result.expectedConfirmingParticipantUids).toHaveLength(3);
        expect(result.expectedObservingParticipantUids).toHaveLength(1);
        expect(result.explorerUrl).toContain("/parties/");
    }, 60_000);
});
