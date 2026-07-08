import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    GetParticipantStatusRequest,
    TransportKind,
} from "../../../src/index.js";
import {
    assertLiveMultiNodeConnectivityAsync,
} from "../runtime/live-connectivity-preflight.js";
import {
    LiveMultiNodeClients,
    createLiveMultiNodeClients,
    disposeLiveMultiNodeClientsAsync,
} from "../runtime/live-multi-node-client-factory.js";
import {
    LiveMultiNodeEnvironment,
    createLiveMultiNodeEnvironment,
    getConfiguredLiveMultiNodeCount,
} from "../runtime/live-multi-node-test-environment.js";

const runIfFiveNodesConfigured =
    getConfiguredLiveMultiNodeCount() >= 5
        ? it
        : it.skip;

describe("live multi-node connectivity", () => {
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
    }, 60_000);

    afterAll(async () => {
        await disposeLiveMultiNodeClientsAsync(clients);
    });

    runIfFiveNodesConfigured("connects to all five configured participant-admin nodes", async () => {
        const participantUids = await Promise.all(
            clients.all.map(async (client) => {
                const response =
                    await client.participantStatusService.getParticipantStatusAsync(
                        new GetParticipantStatusRequest(),
                    );

                if (response.status === undefined) {
                    throw new Error(
                        "Live multi-node connectivity spec could not read a participant status payload.",
                    );
                }

                return response.status.uid;
            }),
        );

        expect(participantUids).toHaveLength(5);
        expect(new Set(participantUids).size).toBe(5);
    }, 60_000);
});
