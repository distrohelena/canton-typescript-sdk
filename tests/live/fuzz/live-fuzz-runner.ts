import {
    CantonClient,
    GetActiveContractsPageRequest,
    GetContractRequest,
    GetEventsByContractIdRequest,
    GetLedgerEndRequest,
} from "../../../src/index.js";
import {
    LiveFuzzCommand,
    LiveFuzzModel,
    LiveFuzzParticipant,
    applyLiveFuzzModelCommand,
    createInitialLiveFuzzModel,
    markLiveFuzzContractCreated,
    markLiveFuzzLedgerEnd,
    markLiveFuzzParticipantObserved,
} from "./live-fuzz-commands.js";
import {
    classifyLiveFuzzCommandOutcome,
    evaluateLiveInvariants,
    LiveFuzzCommandOutcome,
    LiveFuzzInvariantSnapshot,
} from "./live-fuzz-campaign.js";
import {
    LiveFuzzFixture,
    LIVE_IOU_TEMPLATE_ID,
    describeLiveFuzzRoute,
} from "./live-fuzz-fixture.js";
import { LiveFuzzConfig } from "./live-fuzz-config.js";

export interface LiveFuzzContractSummary {
    readonly contractId: string;
    readonly templateId: string;
    readonly payload: Readonly<Record<string, unknown>>;
}

interface ParticipantSnapshot {
    readonly contracts: readonly LiveFuzzContractSummary[];
    readonly ledgerEnd: string;
}

type LedgerEndTracker = Map<LiveFuzzParticipant, string>;

interface PollingTimeoutDiagnostic {
    readonly participant: LiveFuzzParticipant;
    readonly expectedState: string;
    readonly runId: string;
    readonly contractId?: string;
    readonly lastLedgerEnd?: string;
    readonly lastContracts: readonly string[];
}

export function compareLedgerOffsets(left: string, right: string): number {
    const leftOffset = BigInt(left);

    const rightOffset = BigInt(right);

    return leftOffset < rightOffset ? -1 : leftOffset > rightOffset ? 1 : 0;
}

export function summarizeLiveFuzzContract(value: unknown): LiveFuzzContractSummary {
    const createdEvent = getCreatedEvent(value);

    const contractId = readStringProperty(createdEvent, "contractId");

    const template = readRecordProperty(createdEvent, "templateId");

    const moduleName = readStringProperty(template, "moduleName");

    const entityName = readStringProperty(template, "entityName");

    const createArguments = readRecordProperty(createdEvent, "createArguments");

    if (
        contractId === undefined
        || moduleName === undefined
        || entityName === undefined
        || createArguments === undefined
    ) {
        throw new Error("Live fuzz response did not contain a complete created Iou event.");
    }

    return {
        contractId,
        templateId: `${moduleName}:${entityName}`,
        payload: readRecordFields(createArguments),
    };
}

export function matchesLiveFuzzContract(
    summary: LiveFuzzContractSummary,
    expected: {
        templateId: string;
        payload: Readonly<Record<string, unknown>>;
    },
): boolean {
    if (summary.templateId !== expected.templateId) {
        return false;
    }

    return ["issuer", "owner", "amount"].every((field) =>
        normalizeLedgerValue(summary.payload[field])
        === normalizeLedgerValue(expected.payload[field]),
    );
}

export function formatPollingTimeout(
    diagnostic: PollingTimeoutDiagnostic,
): string {
    return [
        `Live fuzz polling timed out for participant=${diagnostic.participant}`,
        `expected=${diagnostic.expectedState}`,
        `runId=${diagnostic.runId}`,
        `contractId=${diagnostic.contractId ?? "<unknown>"}`,
        `lastLedgerEnd=${diagnostic.lastLedgerEnd ?? "<unknown>"}`,
        `lastContracts=${diagnostic.lastContracts.join(", ") || "<none>"}`,
    ].join("; ");
}

export async function pollUntilAsync<T>(init: {
    participant: LiveFuzzParticipant;
    expectedState: string;
    runId: string;
    timeoutMs: number;
    intervalMs: number;
    contractId?: string;
    readAsync: () => Promise<T>;
    isReady: (value: T) => boolean;
    describe: (value: T) => {
        lastLedgerEnd?: string;
        lastContracts: readonly string[];
    };
}): Promise<T> {
    const deadline = Date.now() + init.timeoutMs;

    let diagnostic = {
        lastLedgerEnd: undefined as string | undefined,
        lastContracts: [] as readonly string[],
    };

    while (true) {
        const value = await init.readAsync();

        diagnostic = init.describe(value);

        if (init.isReady(value)) {
            return value;
        } else if (Date.now() >= deadline) {
            throw new Error(
                formatPollingTimeout({
                    participant: init.participant,
                    expectedState: init.expectedState,
                    runId: init.runId,
                    contractId: init.contractId,
                    ...diagnostic,
                }),
            );
        }

        await delayAsync(init.intervalMs);
    }
}

export async function runLiveFuzzSequenceAsync(init: {
    fixture: LiveFuzzFixture;
    config: LiveFuzzConfig;
    commands: readonly LiveFuzzCommand[];
    amountSuffix: number;
    campaignNonce: bigint;
    readonly recordOutcome?: (
        command: LiveFuzzCommand,
        outcome: LiveFuzzCommandOutcome,
    ) => void;
}): Promise<void> {
    await withTimeoutAsync(
        runLiveFuzzSequenceWithCleanupAsync(init),
        init.config.testTimeoutMs,
        `Live fuzz run ${init.config.runId}`,
    );
}

async function runLiveFuzzSequenceWithCleanupAsync(init: {
    fixture: LiveFuzzFixture;
    config: LiveFuzzConfig;
    commands: readonly LiveFuzzCommand[];
    amountSuffix: number;
    campaignNonce: bigint;
    readonly recordOutcome?: (
        command: LiveFuzzCommand,
        outcome: LiveFuzzCommandOutcome,
    ) => void;
}): Promise<void> {
    const expectedPayload = getExpectedPayload(init);

    let model = createInitialLiveFuzzModel({
        templateId: LIVE_IOU_TEMPLATE_ID,
        payload: expectedPayload,
    });

    const ledgerEnds: LedgerEndTracker = new Map();

    const lifecycle = {
        created: [] as string[],
        archived: [] as string[],
    };

    let primaryError: unknown;

    try {
        for (const command of init.commands) {
            const route = describeLiveFuzzRoute(command, {
                issuer: init.fixture.issuerParty,
                owner: init.fixture.ownerParty,
            });

            if (command.kind === "create") {
                const outcome = await submitLiveFuzzCommandAsync({
                    ...init,
                    command,
                    submitAsync: () =>
                        getClient(init.fixture, route.participant).commandService.submitAndWaitAsync(
                            init.fixture.buildCreateRequest(init.amountSuffix, init.campaignNonce),
                        ),
                });

                if (outcome.kind === "protocol-revert") {
                    model = recordTrackedLedgerEnds(model, ledgerEnds);

                    await assertLiveFuzzInvariantsAsync({
                        ...init,
                        model,
                        expectedPayload,
                        ledgerEnds,
                        lifecycle,
                        phase: "after-action",
                    });

                    continue;
                }

                const issuerSnapshot = await pollForActiveContractAsync({
                    ...init,
                    participant: "issuer",
                    expectedPayload,
                    ledgerEnds,
                });

                const contract = findMatchingContract(issuerSnapshot.contracts, {
                    templateId: LIVE_IOU_TEMPLATE_ID,
                    payload: expectedPayload,
                });

                if (contract === undefined) {
                    throw new Error("Live fuzz create did not produce the expected Main:Iou.");
                }

                lifecycle.created.push(contract.contractId);
                model = markLiveFuzzContractCreated(model, contract.contractId);
                model = markLiveFuzzParticipantObserved(model, "issuer");

                const ownerSnapshot = await pollForActiveContractAsync({
                    ...init,
                    participant: "owner",
                    expectedPayload,
                    contractId: contract.contractId,
                    ledgerEnds,
                });

                assertSnapshotContainsContract(ownerSnapshot, contract.contractId, expectedPayload);
                model = markLiveFuzzParticipantObserved(model, "owner");
                model = recordTrackedLedgerEnds(model, ledgerEnds);

                await assertLiveFuzzInvariantsAsync({
                    ...init,
                    model,
                    expectedPayload,
                    ledgerEnds,
                    lifecycle,
                    phase: "after-action",
                });

                continue;
            } else if (
                model.contractId === undefined &&
                command.kind !== "probe"
            ) {
                await assertProbeAsync({ ...init, ledgerEnds }, command.participant);
                model = recordTrackedLedgerEnds(model, ledgerEnds);

                await assertLiveFuzzInvariantsAsync({
                    ...init,
                    model,
                    expectedPayload,
                    ledgerEnds,
                    lifecycle,
                    phase: "after-action",
                });

                continue;
            }

            model = applyLiveFuzzModelCommand(model, command);

            if (command.kind === "exercise") {
                const outcome = await submitLiveFuzzCommandAsync({
                    ...init,
                    command,
                    submitAsync: () =>
                        getClient(init.fixture, route.participant).commandService.submitAndWaitAsync(
                            init.fixture.buildArchiveRequest(model.contractId),
                        ),
                });

                if (outcome.kind === "protocol-revert") {
                    model = {
                        ...model,
                        active: true,
                    };

                    model = recordTrackedLedgerEnds(model, ledgerEnds);

                    await assertLiveFuzzInvariantsAsync({
                        ...init,
                        model,
                        expectedPayload,
                        ledgerEnds,
                        lifecycle,
                        phase: "after-action",
                    });

                    continue;
                }

                await assertArchivedOnBothParticipantsAsync(
                    { ...init, ledgerEnds },
                    model,
                );
                lifecycle.archived.push(model.contractId);
                model = recordTrackedLedgerEnds(model, ledgerEnds);

                await assertLiveFuzzInvariantsAsync({
                    ...init,
                    model,
                    expectedPayload,
                    ledgerEnds,
                    lifecycle,
                    phase: "after-action",
                });

                continue;
            } else if (command.kind === "query") {
                await assertQueryAsync(
                    { ...init, ledgerEnds },
                    model,
                    command.participant,
                );
            } else if (command.kind === "fetch") {
                await assertFetchAsync(
                    { ...init, ledgerEnds },
                    model,
                    command.participant,
                );
            } else if (command.kind === "probe") {
                await assertProbeAsync(
                    { ...init, ledgerEnds },
                    command.participant,
                );
            } else {
                await assertEventsAsync(
                    { ...init, ledgerEnds },
                    model,
                    command.participant,
                );
            }

            model = recordTrackedLedgerEnds(model, ledgerEnds);

            await assertLiveFuzzInvariantsAsync({
                ...init,
                model,
                expectedPayload,
                ledgerEnds,
                lifecycle,
                phase: "after-action",
            });
        }

        await assertLiveFuzzInvariantsAsync({
            ...init,
            model,
            expectedPayload,
            ledgerEnds,
            lifecycle,
            phase: "end-of-campaign",
        });
    } catch (error) {
        primaryError = error;
    }

    try {
        await withTimeoutAsync(
            cleanupLiveFuzzContractsAsync(
                { ...init, ledgerEnds },
                model,
                expectedPayload,
            ),
            init.config.cleanupTimeoutMs,
            `Live fuzz cleanup ${init.config.runId}`,
        );
    } catch (cleanupError) {
        const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);

        console.error(`Live fuzz cleanup failed: ${message}`);

        if (primaryError === undefined) {
            primaryError = cleanupError;
        }
    }

    if (primaryError === undefined) {
        model = recordTrackedLedgerEnds(model, ledgerEnds);

        try {
            await assertLiveFuzzInvariantsAsync({
                ...init,
                model,
                expectedPayload,
                ledgerEnds,
                lifecycle,
                phase: "post-cleanup",
            });
        } catch (invariantError) {
            primaryError = invariantError;
        }
    }

    if (primaryError !== undefined) {
        throw primaryError;
    }
}

function getExpectedPayload(init: {
    fixture: LiveFuzzFixture;
    amountSuffix: number;
    campaignNonce: bigint;
}): Readonly<Record<string, unknown>> {
    return {
        issuer: init.fixture.issuerParty,
        owner: init.fixture.ownerParty,
        amount: Number(
            init.fixture.buildCreateRequest(init.amountSuffix, init.campaignNonce).command.payload.amount,
        ),
    };
}

async function pollForActiveContractAsync(init: {
    fixture: LiveFuzzFixture;
    config: LiveFuzzConfig;
    participant: LiveFuzzParticipant;
    expectedPayload: Readonly<Record<string, unknown>>;
    contractId?: string;
    ledgerEnds: LedgerEndTracker;
}): Promise<ParticipantSnapshot> {
    return pollUntilAsync({
        participant: init.participant,
        expectedState: "active Main:Iou",
        runId: init.config.runId,
        timeoutMs: init.config.pollTimeoutMs,
        intervalMs: init.config.pollIntervalMs,
        contractId: init.contractId,
        readAsync: () =>
            readParticipantSnapshotAsync(
                init.fixture,
                init.participant,
                init.ledgerEnds,
            ),
        isReady: (snapshot) =>
            snapshot.contracts.some((contract) =>
                (init.contractId === undefined || contract.contractId === init.contractId)
                && matchesLiveFuzzContract(contract, {
                    templateId: LIVE_IOU_TEMPLATE_ID,
                    payload: init.expectedPayload,
                }),
            ),
        describe: describeSnapshot,
    });
}

async function assertQueryAsync(
    init: {
        fixture: LiveFuzzFixture;
        config: LiveFuzzConfig;
        ledgerEnds: LedgerEndTracker;
        ledgerEnds: LedgerEndTracker;
    },
    model: LiveFuzzModel,
    participant: LiveFuzzParticipant,
): Promise<void> {
    await pollUntilAsync({
        participant,
        expectedState: model.active ? "active Main:Iou" : "archived Main:Iou",
        runId: init.config.runId,
        timeoutMs: init.config.pollTimeoutMs,
        intervalMs: init.config.pollIntervalMs,
        contractId: model.contractId,
        readAsync: () =>
            readParticipantSnapshotAsync(init.fixture, participant, init.ledgerEnds),
        isReady: (snapshot) => {
            const matching = findMatchingContract(snapshot.contracts, model);

            return model.active ? matching !== undefined : matching === undefined;
        },
        describe: describeSnapshot,
    });
}

async function assertFetchAsync(
    init: {
        fixture: LiveFuzzFixture;
        config: LiveFuzzConfig;
        ledgerEnds: LedgerEndTracker;
    },
    model: LiveFuzzModel,
    participant: LiveFuzzParticipant,
): Promise<void> {
    const client = getClient(init.fixture, participant);

    const response = await client.contractService.getContractAsync(
        new GetContractRequest({
            contractId: model.contractId,
            queryingParties: [getParty(init.fixture, participant)],
        }),
    );

    if (response.createdEvent === undefined) {
        throw new Error(`Live fuzz fetch returned no contract on ${participant}.`);
    }

    const summary = summarizeLiveFuzzContract(response.createdEvent);

    if (!matchesLiveFuzzContract(summary, model)) {
        throw new Error(`Live fuzz fetch returned an unexpected contract on ${participant}.`);
    }

    await trackLedgerEndAsync(init.fixture, participant, init.ledgerEnds);
}

async function assertEventsAsync(
    init: {
        fixture: LiveFuzzFixture;
        config: LiveFuzzConfig;
        ledgerEnds: LedgerEndTracker;
    },
    model: LiveFuzzModel,
    participant: LiveFuzzParticipant,
): Promise<void> {
    await pollUntilAsync({
        participant,
        expectedState: model.active
            ? "created event"
            : "created and archived events",
        runId: init.config.runId,
        timeoutMs: init.config.pollTimeoutMs,
        intervalMs: init.config.pollIntervalMs,
        contractId: model.contractId,
        readAsync: async () => {
            const [response, snapshot] = await Promise.all([
                getClient(init.fixture, participant).eventQueryService.getEventsByContractIdAsync(
                    new GetEventsByContractIdRequest({ contractId: model.contractId }),
                ),
                readParticipantSnapshotAsync(init.fixture, participant, init.ledgerEnds),
            ]);

            return { response, snapshot };
        },
        isReady: ({ response }) =>
            response.created !== undefined
            && (model.active || response.archived !== undefined),
        describe: ({ response, snapshot }) => ({
            lastLedgerEnd: snapshot.ledgerEnd,
            lastContracts: [
                response.created === undefined ? "missing-created" : "created",
                response.archived === undefined ? "missing-archived" : "archived",
            ],
        }),
    });
}

async function assertProbeAsync(
    init: {
        fixture: LiveFuzzFixture;
        ledgerEnds: LedgerEndTracker;
    },
    participant: LiveFuzzParticipant,
): Promise<void> {
    await readParticipantSnapshotAsync(init.fixture, participant, init.ledgerEnds);
}

async function submitLiveFuzzCommandAsync(init: {
    fixture: LiveFuzzFixture;
    config: LiveFuzzConfig;
    command: LiveFuzzCommand;
    submitAsync: () => Promise<unknown>;
    readonly recordOutcome?: (
        command: LiveFuzzCommand,
        outcome: LiveFuzzCommandOutcome,
    ) => void;
}): Promise<LiveFuzzCommandOutcome> {
    let response: unknown;

    let error: unknown;

    try {
        response = await init.submitAsync();
    } catch (caught) {
        error = caught;
    }

    const outcome = classifyLiveFuzzCommandOutcome({ response, error });

    init.recordOutcome?.(init.command, outcome);

    if (outcome.kind === "accepted") {
        return outcome;
    } else if (outcome.kind === "protocol-revert" && !init.config.failOnRevert) {
        return outcome;
    } else if (error !== undefined) {
        throw error;
    } else {
        throw new Error(`Live fuzz command failed with ${outcome.kind}.`);
    }
}

async function assertLiveFuzzInvariantsAsync(init: {
    fixture: LiveFuzzFixture;
    config: LiveFuzzConfig;
    model: LiveFuzzModel;
    expectedPayload: Readonly<Record<string, unknown>>;
    ledgerEnds: LedgerEndTracker;
    lifecycle: {
        readonly created: readonly string[];
        readonly archived: readonly string[];
    };
    phase: "after-action" | "end-of-campaign" | "post-cleanup";
}): Promise<void> {
    const [issuer, owner] = await Promise.all([
        readParticipantSnapshotAsync(init.fixture, "issuer", init.ledgerEnds),
        readParticipantSnapshotAsync(init.fixture, "owner", init.ledgerEnds),
    ]);

    const snapshot: LiveFuzzInvariantSnapshot = {
        model: init.model,
        expectedPayload: init.expectedPayload,
        participants: { issuer, owner },
        previousLedgerEnds: init.model.lastLedgerEndByParticipant,
        lifecycle: init.lifecycle,
        runMarkedContractIds: [...new Set(
            [...issuer.contracts, ...owner.contracts]
                .filter((contract) =>
                    matchesLiveFuzzContract(contract, {
                        templateId: LIVE_IOU_TEMPLATE_ID,
                        payload: init.expectedPayload,
                    }),
                )
                .map(({ contractId }) => contractId),
        )],
    };

    const failures = evaluateLiveInvariants(init.phase, snapshot);

    if (failures.length > 0) {
        throw new Error(
            `Live fuzz invariant failure (${init.phase}): ${failures
                .map(({ code, message }) => `${code}: ${message}`)
                .join(" | ")}`,
        );
    }
}

async function assertArchivedOnBothParticipantsAsync(
    init: {
        fixture: LiveFuzzFixture;
        config: LiveFuzzConfig;
        ledgerEnds: LedgerEndTracker;
    },
    model: LiveFuzzModel,
): Promise<void> {
    for (const participant of ["issuer", "owner"] as const) {
        await pollUntilAsync({
            participant,
            expectedState: "archived Main:Iou",
            runId: init.config.runId,
            timeoutMs: init.config.pollTimeoutMs,
            intervalMs: init.config.pollIntervalMs,
            contractId: model.contractId,
            readAsync: () =>
                readParticipantSnapshotAsync(init.fixture, participant, init.ledgerEnds),
            isReady: (snapshot) =>
                !snapshot.contracts.some((contract) => contract.contractId === model.contractId),
            describe: describeSnapshot,
        });

        await pollUntilAsync({
            participant,
            expectedState: "created and archived events",
            runId: init.config.runId,
            timeoutMs: init.config.pollTimeoutMs,
            intervalMs: init.config.pollIntervalMs,
            contractId: model.contractId,
            readAsync: async () => {
                const [response, snapshot] = await Promise.all([
                    getClient(init.fixture, participant).eventQueryService.getEventsByContractIdAsync(
                        new GetEventsByContractIdRequest({ contractId: model.contractId }),
                    ),
                    readParticipantSnapshotAsync(init.fixture, participant, init.ledgerEnds),
                ]);

                return { response, snapshot };
            },
            isReady: ({ response }) =>
                response.created !== undefined && response.archived !== undefined,
            describe: ({ response, snapshot }) => ({
                lastLedgerEnd: snapshot.ledgerEnd,
                lastContracts: [
                    response.created === undefined ? "missing-created" : "created",
                    response.archived === undefined ? "missing-archived" : "archived",
                ],
            }),
        });
    }
}

async function cleanupLiveFuzzContractsAsync(
    init: {
        fixture: LiveFuzzFixture;
        config: LiveFuzzConfig;
    },
    model: LiveFuzzModel,
    expectedPayload: Readonly<Record<string, unknown>>,
): Promise<void> {
    const contractIds = new Set<string>();

    if (model.active && model.contractId !== undefined) {
        contractIds.add(model.contractId);
    } else if (model.contractId === undefined) {
        for (const participant of ["issuer", "owner"] as const) {
            const snapshot = await readParticipantSnapshotAsync(
                init.fixture,
                participant,
                init.ledgerEnds,
            );

            for (const contract of snapshot.contracts) {
                if (
                    matchesLiveFuzzContract(contract, {
                        templateId: LIVE_IOU_TEMPLATE_ID,
                        payload: expectedPayload,
                    })
                ) {
                    contractIds.add(contract.contractId);
                }
            }
        }
    }

    for (const contractId of contractIds) {
        await init.fixture.issuerClient.commandService.submitAndWaitAsync(
            init.fixture.buildArchiveRequest(contractId),
        );
    }

    for (const contractId of contractIds) {
        for (const participant of ["issuer", "owner"] as const) {
            await pollUntilAsync({
                participant,
                expectedState: "cleanup archive",
                runId: init.config.runId,
                timeoutMs: init.config.cleanupTimeoutMs,
                intervalMs: init.config.pollIntervalMs,
                contractId,
                readAsync: () =>
                    readParticipantSnapshotAsync(
                        init.fixture,
                        participant,
                        init.ledgerEnds,
                    ),
                isReady: (snapshot) =>
                    !snapshot.contracts.some((contract) => contract.contractId === contractId),
                describe: describeSnapshot,
            });
        }
    }
}

async function readParticipantSnapshotAsync(
    fixture: LiveFuzzFixture,
    participant: LiveFuzzParticipant,
    ledgerEnds: LedgerEndTracker,
): Promise<ParticipantSnapshot> {
    const client = getClient(fixture, participant);

    const response = await client.stateService.getActiveContractsPageAsync(
        new GetActiveContractsPageRequest({
            party: getParty(fixture, participant),
            templateId: LIVE_IOU_TEMPLATE_ID,
            includeCreatedEventBlob: true,
        }),
    );

    const ledgerEnd = await client.stateService.getLedgerEndAsync(
        new GetLedgerEndRequest(),
    );

    const previousLedgerEnd = ledgerEnds.get(participant);

    if (
        previousLedgerEnd !== undefined
        && compareLedgerOffsets(ledgerEnd.offset, previousLedgerEnd) < 0
    ) {
        throw new Error(
            `Live fuzz ledger end regressed on ${participant}: ${previousLedgerEnd} -> ${ledgerEnd.offset}.`,
        );
    }

    ledgerEnds.set(participant, ledgerEnd.offset);

    return {
        contracts: response.contracts.map(summarizeLiveFuzzContract),
        ledgerEnd: ledgerEnd.offset,
    };
}

async function trackLedgerEndAsync(
    fixture: LiveFuzzFixture,
    participant: LiveFuzzParticipant,
    ledgerEnds: LedgerEndTracker,
): Promise<void> {
    const ledgerEnd = await getClient(fixture, participant).stateService.getLedgerEndAsync(
        new GetLedgerEndRequest(),
    );

    const previousLedgerEnd = ledgerEnds.get(participant);

    if (
        previousLedgerEnd !== undefined
        && compareLedgerOffsets(ledgerEnd.offset, previousLedgerEnd) < 0
    ) {
        throw new Error(
            `Live fuzz ledger end regressed on ${participant}: ${previousLedgerEnd} -> ${ledgerEnd.offset}.`,
        );
    }

    ledgerEnds.set(participant, ledgerEnd.offset);
}

function recordTrackedLedgerEnds(
    model: LiveFuzzModel,
    ledgerEnds: LedgerEndTracker,
): LiveFuzzModel {
    let result = model;

    for (const [participant, offset] of ledgerEnds) {
        result = markLiveFuzzLedgerEnd(result, participant, offset);
    }

    return result;
}

function findMatchingContract(
    contracts: readonly LiveFuzzContractSummary[],
    expected: {
        templateId: string;
        payload: Readonly<Record<string, unknown>>;
    },
): LiveFuzzContractSummary | undefined {
    return contracts.find((contract) => matchesLiveFuzzContract(contract, expected));
}

function assertSnapshotContainsContract(
    snapshot: ParticipantSnapshot,
    contractId: string,
    expectedPayload: Readonly<Record<string, unknown>>,
): void {
    const contract = snapshot.contracts.find((candidate) => candidate.contractId === contractId);

    if (
        contract === undefined
        || !matchesLiveFuzzContract(contract, {
            templateId: LIVE_IOU_TEMPLATE_ID,
            payload: expectedPayload,
        })
    ) {
        throw new Error(`Live fuzz participant did not expose expected contract ${contractId}.`);
    }
}

function describeSnapshot(snapshot: ParticipantSnapshot): {
    lastLedgerEnd: string;
    lastContracts: readonly string[];
} {
    return {
        lastLedgerEnd: snapshot.ledgerEnd,
        lastContracts: snapshot.contracts.map((contract) => contract.contractId),
    };
}

function getClient(fixture: LiveFuzzFixture, participant: LiveFuzzParticipant): CantonClient {
    return participant === "issuer" ? fixture.issuerClient : fixture.ownerClient;
}

function getParty(fixture: LiveFuzzFixture, participant: LiveFuzzParticipant): string {
    return participant === "issuer" ? fixture.issuerParty : fixture.ownerParty;
}

function getCreatedEvent(value: unknown): Record<string, unknown> {
    if (isRecord(value) && isRecord(value.createdEvent)) {
        return value.createdEvent;
    } else if (isRecord(value)) {
        return value;
    }

    throw new Error("Live fuzz response did not contain a created event.");
}

function readRecordFields(value: Record<string, unknown>): Record<string, unknown> {
    const fields = value.fields;

    if (!Array.isArray(fields)) {
        throw new Error("Live fuzz created event did not contain record fields.");
    }

    return Object.fromEntries(
        fields.map((field, index) => {
            const fieldRecord = isRecord(field) ? field : {};

            const label = readStringProperty(fieldRecord, "label") ?? String(index);

            return [label, readLedgerValue(fieldRecord.value)];
        }),
    );
}

function readLedgerValue(value: unknown): unknown {
    if (!isRecord(value) || !isRecord(value.sum)) {
        return value;
    }

    const sum = value.sum;

    const kind = readStringProperty(sum, "oneofKind");

    if (kind === undefined) {
        return undefined;
    }

    return sum[kind] === undefined
        ? undefined
        : kind === "record"
          ? readRecordFields(sum[kind] as Record<string, unknown>)
          : kind === "optional"
            ? readLedgerValue((sum[kind] as Record<string, unknown>).value)
            : sum[kind];
}

function normalizeLedgerValue(value: unknown): string {
    if (typeof value === "number") {
        return value.toString();
    } else if (typeof value === "string") {
        return /^-?\d+(?:\.\d+)?$/.test(value)
            ? Number(value).toString()
            : value;
    }

    return JSON.stringify(value);
}

function readRecordProperty(
    value: Record<string, unknown>,
    key: string,
): Record<string, unknown> | undefined {
    const property = value[key];

    return isRecord(property) ? property : undefined;
}

function readStringProperty(
    value: Record<string, unknown> | undefined,
    key: string,
): string | undefined {
    const property = value?.[key];

    return typeof property === "string" ? property : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

async function withTimeoutAsync<T>(
    promise: Promise<T>,
    timeoutMs: number,
    label: string,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(
            () => reject(new Error(`${label} exceeded ${timeoutMs}ms.`)),
            timeoutMs,
        );
    });

    try {
        return await Promise.race([promise, timeout]);
    } finally {
        if (timer !== undefined) {
            clearTimeout(timer);
        }
    }
}

function delayAsync(intervalMs: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, intervalMs));
}
