import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TransportKind } from "../../../src/index.js";
import { createLiveMultiHostPartyToParticipantAsync } from "../scenarios/create-live-multi-host-party-to-participant.js";
import {
    createInvalidLivePartyToParticipantScenarios,
    createValidLivePartyToParticipantScenarios,
    createValidLocalObservationScenarios,
} from "../scenarios/live-party-to-participant-scenario-matrix.js";
import {
    LiveMultiNodeEnvironment,
    createLiveMultiNodeEnvironment,
} from "../runtime/live-multi-node-test-environment.js";
import {
    LiveMultiNodeClients,
    createLiveMultiNodeClients,
    disposeLiveMultiNodeClientsAsync,
} from "../runtime/live-multi-node-client-factory.js";
import { assertLiveMultiNodeConnectivityAsync } from "../runtime/live-connectivity-preflight.js";

const isParticipantScenarioMatrixEnabled =
    process.env.SDK_TEST_ENABLE_PARTICIPANT_SCENARIO_MATRIX === "1";
const describeIfParticipantScenarioMatrixEnabled =
    isParticipantScenarioMatrixEnabled ? describe : describe.skip;
const nodeCount = 5;

describeIfParticipantScenarioMatrixEnabled(
    "live PartyToParticipant scenario matrix",
    () => {
        let environment: LiveMultiNodeEnvironment;
        let clients: LiveMultiNodeClients;

        beforeAll(async () => {
            environment = createLiveMultiNodeEnvironment({
                transportKind: TransportKind.grpc,
                nodeCount,
            });

            await assertLiveMultiNodeConnectivityAsync(environment, {
                requiredNodeCount: nodeCount,
            });

            clients = createLiveMultiNodeClients(environment);
        }, 120_000);

        afterAll(async () => {
            await disposeLiveMultiNodeClientsAsync(clients);
        });

        it("creates every valid confirmer and observer scenario reachable from the primary client", async () => {
            const scenarios = createValidLivePartyToParticipantScenarios(nodeCount);

            for (const scenario of scenarios) {
                const result = await createLiveMultiHostPartyToParticipantAsync(
                    clients,
                    scenario,
                );

                console.log(
                    `[PTP] ${scenario.scenarioName} -> ${result.explorerUrl}`,
                );
            }

            expect(scenarios).toHaveLength(189);
        }, 1_800_000);

        it("creates every valid local-observation scenario", async () => {
            const scenarios = createValidLocalObservationScenarios(nodeCount);

            for (const scenario of scenarios) {
                const result = await createLiveMultiHostPartyToParticipantAsync(
                    clients,
                    scenario,
                );

                console.log(
                    `[PTP] ${scenario.scenarioName} -> ${result.explorerUrl}`,
                );
            }

            expect(scenarios).toHaveLength(108);
        }, 1_200_000);

        it("rejects every invalid participant scenario", async () => {
            const scenarios = createInvalidLivePartyToParticipantScenarios(nodeCount);

            for (const scenario of scenarios) {
                await expect(
                    createLiveMultiHostPartyToParticipantAsync(clients, scenario),
                ).rejects.toThrow(scenario.expectedErrorFragment);
            }
        });
    },
);
