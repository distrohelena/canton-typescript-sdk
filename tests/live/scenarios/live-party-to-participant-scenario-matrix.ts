export interface LivePartyToParticipantScenario {
    readonly scenarioName: string;
    readonly confirmingHostIndexes: readonly number[];
    readonly threshold: number;
    readonly observingHostIndexes: readonly number[];
    readonly localParticipantObservationOnly: boolean;
}

export interface InvalidLivePartyToParticipantScenario {
    readonly scenarioName: string;
    readonly confirmingHostIndexes: readonly number[];
    readonly threshold: number;
    readonly observingHostIndexes: readonly number[];
    readonly localParticipantObservationOnly: boolean;
    readonly expectedErrorFragment: string;
}

export function createValidLivePartyToParticipantScenarios(
    nodeCount: number,
): readonly LivePartyToParticipantScenario[] {
    const additionalHostIndexes = createHostIndexes(nodeCount).filter(
        (hostIndex) => hostIndex !== 0,
    );
    const scenarios: LivePartyToParticipantScenario[] = [];

    for (const additionalConfirmers of createPowerSet(additionalHostIndexes)) {
        const confirmingHostIndexes = [0, ...additionalConfirmers];
        const remainingObserverCandidates = additionalHostIndexes.filter(
            (hostIndex) => !additionalConfirmers.includes(hostIndex),
        );

        for (
            let threshold = 1;
            threshold <= confirmingHostIndexes.length;
            threshold++
        ) {
            for (const observingHostIndexes of createPowerSet(
                remainingObserverCandidates,
            )) {
                scenarios.push({
                    scenarioName: createScenarioName({
                        confirmingHostIndexes,
                        threshold,
                        observingHostIndexes,
                        localParticipantObservationOnly: false,
                    }),
                    confirmingHostIndexes,
                    threshold,
                    observingHostIndexes,
                    localParticipantObservationOnly: false,
                });
            }
        }
    }

    return scenarios;
}

export function createValidLocalObservationScenarios(
    nodeCount: number,
): readonly LivePartyToParticipantScenario[] {
    const nonPrimaryHostIndexes = createHostIndexes(nodeCount).filter(
        (hostIndex) => hostIndex !== 0,
    );
    const scenarios: LivePartyToParticipantScenario[] = [];

    for (const confirmingHostIndexes of createNonEmptyPowerSet(nonPrimaryHostIndexes)) {
        const remainingObserverCandidates = nonPrimaryHostIndexes.filter(
            (hostIndex) => !confirmingHostIndexes.includes(hostIndex),
        );

        for (
            let threshold = 1;
            threshold <= confirmingHostIndexes.length;
            threshold++
        ) {
            for (const observingHostIndexes of createPowerSet(
                remainingObserverCandidates,
            )) {
                scenarios.push({
                    scenarioName: createScenarioName({
                        confirmingHostIndexes,
                        threshold,
                        observingHostIndexes,
                        localParticipantObservationOnly: true,
                    }),
                    confirmingHostIndexes,
                    threshold,
                    observingHostIndexes,
                    localParticipantObservationOnly: true,
                });
            }
        }
    }

    return scenarios;
}

export function createInvalidLivePartyToParticipantScenarios(
    nodeCount: number,
): readonly InvalidLivePartyToParticipantScenario[] {
    const maxHostIndex = nodeCount - 1;

    return [
        {
            scenarioName: "invalid_empty_confirmers",
            confirmingHostIndexes: [],
            threshold: 1,
            observingHostIndexes: [],
            localParticipantObservationOnly: false,
            expectedErrorFragment:
                "requires at least one confirming participant",
        },
        {
            scenarioName: "invalid_threshold_zero",
            confirmingHostIndexes: [0, 1],
            threshold: 0,
            observingHostIndexes: [],
            localParticipantObservationOnly: false,
            expectedErrorFragment: "threshold must be between 1",
        },
        {
            scenarioName: "invalid_threshold_too_high",
            confirmingHostIndexes: [0, 1, 2],
            threshold: 4,
            observingHostIndexes: [],
            localParticipantObservationOnly: false,
            expectedErrorFragment: "threshold must be between 1",
        },
        {
            scenarioName: "invalid_duplicate_confirmers",
            confirmingHostIndexes: [0, 1, 1],
            threshold: 2,
            observingHostIndexes: [],
            localParticipantObservationOnly: false,
            expectedErrorFragment: "confirming participant indexes must be unique",
        },
        {
            scenarioName: "invalid_observer_overlap",
            confirmingHostIndexes: [0, 1, 2],
            threshold: 2,
            observingHostIndexes: [2, 3],
            localParticipantObservationOnly: false,
            expectedErrorFragment:
                "observing participant indexes must not overlap",
        },
        {
            scenarioName: "invalid_non_primary_without_local_observer",
            confirmingHostIndexes: [1, 2],
            threshold: 2,
            observingHostIndexes: [3],
            localParticipantObservationOnly: false,
            expectedErrorFragment:
                "primary participant must be a confirmer unless localParticipantObservationOnly is enabled",
        },
        {
            scenarioName: "invalid_local_observer_primary_in_confirmers",
            confirmingHostIndexes: [0, 1, 2],
            threshold: 2,
            observingHostIndexes: [3],
            localParticipantObservationOnly: true,
            expectedErrorFragment:
                "primary participant cannot be both local observation-only and a confirmer",
        },
        {
            scenarioName: "invalid_local_observer_primary_in_observers",
            confirmingHostIndexes: [1, 2],
            threshold: 2,
            observingHostIndexes: [0, 3],
            localParticipantObservationOnly: true,
            expectedErrorFragment:
                "primary participant is implicit in localParticipantObservationOnly and must not be listed as an observer",
        },
        {
            scenarioName: "invalid_unknown_confirmer",
            confirmingHostIndexes: [0, maxHostIndex + 1],
            threshold: 2,
            observingHostIndexes: [],
            localParticipantObservationOnly: false,
            expectedErrorFragment:
                "confirming participant index",
        },
        {
            scenarioName: "invalid_unknown_observer",
            confirmingHostIndexes: [0, 1],
            threshold: 2,
            observingHostIndexes: [maxHostIndex + 1],
            localParticipantObservationOnly: false,
            expectedErrorFragment:
                "observing participant index",
        },
    ];
}

export function validateLivePartyToParticipantScenario(
    scenario: Pick<
        LivePartyToParticipantScenario,
        | "confirmingHostIndexes"
        | "threshold"
        | "observingHostIndexes"
        | "localParticipantObservationOnly"
    >,
    nodeCount: number,
): void {
    if (scenario.confirmingHostIndexes.length === 0) {
        throw new Error(
            "Live PartyToParticipant scenario requires at least one confirming participant.",
        );
    }

    assertIndexesWithinBounds(
        "confirming",
        scenario.confirmingHostIndexes,
        nodeCount,
    );
    assertIndexesWithinBounds(
        "observing",
        scenario.observingHostIndexes,
        nodeCount,
    );
    assertUniqueIndexes(
        "confirming participant",
        scenario.confirmingHostIndexes,
    );
    assertUniqueIndexes(
        "observing participant",
        scenario.observingHostIndexes,
    );

    if (
        scenario.threshold < 1
        || scenario.threshold > scenario.confirmingHostIndexes.length
    ) {
        throw new Error(
            `Live PartyToParticipant scenario threshold must be between 1 and ${scenario.confirmingHostIndexes.length}, received ${scenario.threshold}.`,
        );
    }

    const confirmingHostIndexSet = new Set(scenario.confirmingHostIndexes);
    const overlappingObserverHostIndex = scenario.observingHostIndexes.find(
        (hostIndex) => confirmingHostIndexSet.has(hostIndex),
    );

    if (overlappingObserverHostIndex !== undefined) {
        throw new Error(
            "Live PartyToParticipant observing participant indexes must not overlap with confirming participant indexes.",
        );
    }

    if (scenario.localParticipantObservationOnly) {
        if (confirmingHostIndexSet.has(0)) {
            throw new Error(
                "Live PartyToParticipant primary participant cannot be both local observation-only and a confirmer.",
            );
        }

        if (scenario.observingHostIndexes.includes(0)) {
            throw new Error(
                "Live PartyToParticipant primary participant is implicit in localParticipantObservationOnly and must not be listed as an observer.",
            );
        }
    } else if (!confirmingHostIndexSet.has(0)) {
        throw new Error(
            "Live PartyToParticipant primary participant must be a confirmer unless localParticipantObservationOnly is enabled.",
        );
    }
}

export function createExplorerUrl(
    partyId: string,
    baseUrl = process.env.SDK_TEST_EXPLORER_BASE_URL ?? "http://localhost:46000",
): string {
    return `${baseUrl.replace(/\/$/, "")}/parties/${partyId}`;
}

function createScenarioName(
    scenario: Pick<
        LivePartyToParticipantScenario,
        | "confirmingHostIndexes"
        | "threshold"
        | "observingHostIndexes"
        | "localParticipantObservationOnly"
    >,
): string {
    const confirmingSuffix = formatHostIndexes(scenario.confirmingHostIndexes);
    const observingSuffix =
        scenario.observingHostIndexes.length === 0
            ? ""
            : `_o${formatHostIndexes(scenario.observingHostIndexes)}`;
    const localObservationPrefix = scenario.localParticipantObservationOnly
        ? "_lo1"
        : "";

    return `ptp${localObservationPrefix}_c${confirmingSuffix}_t${scenario.threshold}${observingSuffix}`;
}

function formatHostIndexes(hostIndexes: readonly number[]): string {
    return [...hostIndexes]
        .map((hostIndex) => hostIndex + 1)
        .sort((left, right) => left - right)
        .join("");
}

function createHostIndexes(nodeCount: number): readonly number[] {
    return Array.from({ length: nodeCount }, (_, index) => index);
}

function createPowerSet<T>(items: readonly T[]): readonly T[][] {
    const subsets: T[][] = [[]];

    for (const item of items) {
        const existingSubsets = [...subsets];

        for (const subset of existingSubsets) {
            subsets.push([...subset, item]);
        }
    }

    return subsets;
}

function createNonEmptyPowerSet<T>(items: readonly T[]): readonly T[][] {
    return createPowerSet(items).filter((subset) => subset.length > 0);
}

function assertUniqueIndexes(
    label: string,
    hostIndexes: readonly number[],
): void {
    if (new Set(hostIndexes).size !== hostIndexes.length) {
        throw new Error(
            `Live PartyToParticipant ${label} indexes must be unique.`,
        );
    }
}

function assertIndexesWithinBounds(
    label: "confirming" | "observing",
    hostIndexes: readonly number[],
    nodeCount: number,
): void {
    const invalidHostIndex = hostIndexes.find(
        (hostIndex) => hostIndex < 0 || hostIndex >= nodeCount,
    );

    if (invalidHostIndex !== undefined) {
        throw new Error(
            `Live PartyToParticipant ${label} participant index ${invalidHostIndex} is outside the configured node range 0..${nodeCount - 1}.`,
        );
    }
}
