import { describe, expect, it } from "vitest";
import {
    createExplorerUrl,
    createInvalidLivePartyToParticipantScenarios,
    createValidLivePartyToParticipantScenarios,
    createValidLocalObservationScenarios,
    validateLivePartyToParticipantScenario,
} from "../../live/scenarios/live-party-to-participant-scenario-matrix.js";

describe("live PartyToParticipant scenario matrix", () => {
    it("builds the exhaustive valid confirmer matrix for five nodes", () => {
        const scenarios = createValidLivePartyToParticipantScenarios(5);

        expect(scenarios).toHaveLength(189);
        expect(
            scenarios.some(
                (scenario) => scenario.scenarioName === "ptp_c123_t2_o4",
            ),
        ).toBe(true);
        expect(
            scenarios.some(
                (scenario) => scenario.scenarioName === "ptp_c12345_t3",
            ),
        ).toBe(true);
    });

    it("builds the exhaustive local-observation matrix for five nodes", () => {
        const scenarios = createValidLocalObservationScenarios(5);

        expect(scenarios).toHaveLength(108);
        expect(
            scenarios.some(
                (scenario) => scenario.scenarioName === "ptp_lo1_c23_t2_o4",
            ),
        ).toBe(true);
        expect(
            scenarios.some(
                (scenario) => scenario.scenarioName === "ptp_lo1_c2345_t3",
            ),
        ).toBe(true);
    });

    it("builds the invalid scenario set", () => {
        const scenarios = createInvalidLivePartyToParticipantScenarios(5);

        expect(scenarios).toHaveLength(10);
        expect(
            scenarios.some(
                (scenario) =>
                    scenario.scenarioName === "invalid_non_primary_without_local_observer",
            ),
        ).toBe(true);
    });

    it("validates a generic observing scenario", () => {
        expect(() =>
            validateLivePartyToParticipantScenario(
                {
                    confirmingHostIndexes: [0, 1, 2],
                    threshold: 2,
                    observingHostIndexes: [3],
                    localParticipantObservationOnly: false,
                },
                5,
            ),
        ).not.toThrow();
    });

    it("validates a local-observation scenario", () => {
        expect(() =>
            validateLivePartyToParticipantScenario(
                {
                    confirmingHostIndexes: [1, 2, 3],
                    threshold: 2,
                    observingHostIndexes: [4],
                    localParticipantObservationOnly: true,
                },
                5,
            ),
        ).not.toThrow();
    });

    it("rejects invalid scenarios with stable error messages", () => {
        const invalidScenarios = createInvalidLivePartyToParticipantScenarios(5);

        for (const scenario of invalidScenarios) {
            expect(() =>
                validateLivePartyToParticipantScenario(scenario, 5),
            ).toThrow(scenario.expectedErrorFragment);
        }
    });

    it("formats Canton Explorer URLs for created parties", () => {
        expect(
            createExplorerUrl(
                "ptp_c123_t2::fingerprint",
                "http://localhost:46000/",
            ),
        ).toBe(
            "http://localhost:46000/parties/ptp_c123_t2::fingerprint",
        );
    });
});
