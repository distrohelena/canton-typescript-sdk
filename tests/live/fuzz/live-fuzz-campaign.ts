import * as fc from "fast-check";
import {
    LIVE_FUZZ_ACTIONS,
    LiveFuzzAction,
    LiveFuzzActionWeights,
    LiveFuzzActor,
} from "./live-fuzz-config.js";
import {
    LiveFuzzCommand,
    LiveFuzzModel,
    LiveFuzzParticipant,
    applyLiveFuzzModelCommand,
} from "./live-fuzz-commands.js";

const MAX_AMOUNT_SUFFIX = 99_999;

const MAX_CAMPAIGN_NONCE = (2n ** 128n) - 1n;

export interface LiveFuzzExactInput {
    readonly commands: readonly LiveFuzzCommand[];
    readonly amountSuffix: number;
    readonly campaignNonce: bigint;
}

export interface LiveFuzzActionEligibility {
    readonly knownContract: boolean;
    readonly active: boolean;
    readonly actors: readonly LiveFuzzActor[];
}

export interface LiveFuzzInvariantContract {
    readonly contractId: string;
    readonly templateId: string;
    readonly payload: Readonly<Record<string, unknown>>;
}

export interface LiveFuzzInvariantSnapshot {
    readonly model: LiveFuzzModel;
    readonly expectedPayload: Readonly<Record<string, unknown>>;
    readonly participants: Readonly<
        Record<LiveFuzzParticipant, {
            readonly contracts: readonly LiveFuzzInvariantContract[];
            readonly ledgerEnd: string;
        }>
    >;
    readonly previousLedgerEnds: Readonly<
        Partial<Record<LiveFuzzParticipant, string>>
    >;
    readonly lifecycle: {
        readonly created: readonly string[];
        readonly archived: readonly string[];
    };
    readonly runMarkedContractIds: readonly string[];
}

export interface LiveFuzzInvariantFailure {
    readonly phase: "after-action" | "end-of-campaign" | "post-cleanup";
    readonly code: string;
    readonly message: string;
}

export type LiveFuzzCommandOutcome =
    | { readonly kind: "accepted" }
    | {
        readonly kind: "protocol-revert";
        readonly statusCode: number;
        readonly details: string;
    }
    | {
        readonly kind: "transport-error";
        readonly statusCode?: number;
        readonly details: string;
    }
    | {
        readonly kind: "timeout";
        readonly statusCode?: number;
        readonly details: string;
    }
    | {
        readonly kind: "malformed-response";
        readonly details: string;
    }
    | {
        readonly kind: "unknown-commit-outcome";
        readonly statusCode?: number;
        readonly details: string;
    };

export function evaluateLiveInvariants(
    phase: LiveFuzzInvariantFailure["phase"],
    snapshot: LiveFuzzInvariantSnapshot,
): readonly LiveFuzzInvariantFailure[] {
    const failures: LiveFuzzInvariantFailure[] = [];

    const contracts = Object.values(snapshot.participants).flatMap(
        (participant) => participant.contracts,
    );

    const activeContractIds = [...new Set(contracts.map(({ contractId }) => contractId))];

    if (activeContractIds.length > 1) {
        failures.push({
            phase,
            code: "multiple-active-run-contracts",
            message: `Expected at most one active run contract, found ${activeContractIds.join(", ")}.`,
        });
    }

    for (const participant of ["issuer", "owner"] as const) {
        const previous = snapshot.previousLedgerEnds[participant];

        if (
            previous !== undefined &&
            compareLiveFuzzOffsets(snapshot.participants[participant].ledgerEnd, previous) < 0
        ) {
            failures.push({
                phase,
                code: "ledger-end-regressed",
                message: `Ledger end regressed on ${participant}.`,
            });
        }
    }

    if (snapshot.model.contractId !== undefined) {
        if (!snapshot.lifecycle.created.includes(snapshot.model.contractId)) {
            failures.push({
                phase,
                code: "missing-create-evidence",
                message: `No create lifecycle evidence for ${snapshot.model.contractId}.`,
            });
        }

        if (snapshot.model.active) {
            const matchingContracts = contracts.filter(
                (contract) =>
                    contract.contractId === snapshot.model.contractId &&
                    contract.templateId === snapshot.model.templateId &&
                    JSON.stringify(contract.payload) === JSON.stringify(snapshot.expectedPayload),
            );

            if (matchingContracts.length === 0) {
                failures.push({
                    phase,
                    code: "active-contract-mismatch",
                    message: "The active model contract is missing or has the wrong template/payload.",
                });
            }
        }
    }

    if (phase === "post-cleanup" && snapshot.runMarkedContractIds.length > 0) {
        failures.push({
            phase,
            code: "run-marked-contract-remains",
            message: `Cleanup left run-marked contracts: ${snapshot.runMarkedContractIds.join(", ")}.`,
        });
    }

    return failures;
}

export function liveFuzzExactInputArbitrary(init: {
    depth: number;
    actionWeights: LiveFuzzActionWeights;
    actors: readonly LiveFuzzActor[];
    requireArchive?: boolean;
}): fc.Arbitrary<LiveFuzzExactInput> {
    if (!Number.isSafeInteger(init.depth) || init.depth < 1) {
        throw new Error("Live fuzz exact depth must be at least one.");
    }

    else if (init.actors.length === 0) {
        throw new Error("Live fuzz exact inputs require at least one actor.");
    }

    const nonceArbitrary = fc.bigInt({ min: 0n, max: MAX_CAMPAIGN_NONCE });

    const amountSuffixArbitrary = fc.integer({
        min: 0,
        max: MAX_AMOUNT_SUFFIX,
    });

    if (init.requireArchive !== true) {
        return fc
            .tuple(
                nonceArbitrary,
                amountSuffixArbitrary,
                fc.array(
                    fc.tuple(
                        fc.nat({ max: Number.MAX_SAFE_INTEGER }),
                        fc.nat({ max: Number.MAX_SAFE_INTEGER }),
                    ),
                    { minLength: init.depth - 1, maxLength: init.depth - 1 },
                ),
            )
            .map(([campaignNonce, amountSuffix, choices]) => {
                const commands: LiveFuzzCommand[] = [{ kind: "create" }];

                let state = {
                    knownContract: true,
                    active: true,
                };

                for (const [actionChoice, actorChoice] of choices) {
                    const eligible = liveFuzzEligibleActions({
                        ...state,
                        actors: init.actors,
                    });

                    const action = chooseWeightedAction(
                        actionChoice,
                        eligible,
                        init.actionWeights,
                    );

                    const participant = init.actors[actorChoice % init.actors.length];

                    commands.push(toCommand(action, participant));

                    if (action === "exercise") {
                        state = { knownContract: true, active: false };
                    }
                }

                return { commands, amountSuffix, campaignNonce };
            });
    } else if (init.depth !== 4) {
        throw new Error("Live fuzz archive smoke sequences require exact depth four.");
    } else {
        return fc
            .tuple(nonceArbitrary, amountSuffixArbitrary)
            .map(([campaignNonce, amountSuffix]) => ({
                commands: [
                    { kind: "create" },
                    { kind: "query", participant: "issuer" },
                    { kind: "fetch", participant: "owner" },
                    { kind: "exercise", participant: "issuer" },
                ] satisfies readonly LiveFuzzCommand[],
                amountSuffix,
                campaignNonce,
            }));
    }
}

export function liveFuzzEligibleActions(
    init: LiveFuzzActionEligibility,
): readonly LiveFuzzAction[] {
    if (!init.knownContract) {
        return ["probe"];
    } else if (!init.active) {
        return ["query", "events", "probe"];
    }

    return LIVE_FUZZ_ACTIONS;
}

export function classifyLiveFuzzCommandOutcome(input: {
    response?: unknown;
    error?: unknown;
}): LiveFuzzCommandOutcome {
    if (input.error === undefined) {
        if (isAcceptedResponse(input.response)) {
            return { kind: "accepted" };
        }

        return {
            kind: "malformed-response",
            details: "Command submission returned no non-empty transaction ID.",
        };
    }

    const statusCode = readStatusCode(input.error);

    const details = readErrorDetails(input.error);

    if (
        (statusCode === 9 && details.startsWith("DAML_INTERPRETATION_ERROR(")) ||
        (statusCode === 3 && details.startsWith("DAML_AUTHORIZATION_ERROR("))
    ) {
        return {
            kind: "protocol-revert",
            statusCode,
            details,
        };
    } else if (statusCode === 14 || statusCode === 13) {
        return { kind: "transport-error", statusCode, details };
    } else if (statusCode === 4) {
        return { kind: "timeout", statusCode, details };
    }

    return {
        kind: "unknown-commit-outcome",
        statusCode,
        details,
    };
}

export function applyLiveFuzzCommandOutcome(
    model: LiveFuzzModel,
    command: LiveFuzzCommand,
    outcome: LiveFuzzCommandOutcome,
): LiveFuzzModel {
    if (outcome.kind === "protocol-revert") {
        return model;
    } else if (outcome.kind !== "accepted") {
        throw new Error(`Live fuzz command failed with ${outcome.kind}.`);
    }

    return applyLiveFuzzModelCommand(model, command);
}

function chooseWeightedAction(
    choice: number,
    eligible: readonly LiveFuzzAction[],
    weights: LiveFuzzActionWeights,
): LiveFuzzAction {
    const totalWeight = eligible.reduce(
        (total, action) => total + weights[action],
        0,
    );

    if (!Number.isSafeInteger(totalWeight) || totalWeight <= 0) {
        throw new Error("Live fuzz action weights have no eligible positive action.");
    }

    let cursor = choice % totalWeight;

    for (const action of eligible) {
        cursor -= weights[action];

        if (cursor < 0) {
            return action;
        }
    }

    return eligible[eligible.length - 1];
}

function compareLiveFuzzOffsets(left: string, right: string): number {
    const leftOffset = BigInt(left);

    const rightOffset = BigInt(right);

    return leftOffset < rightOffset ? -1 : leftOffset > rightOffset ? 1 : 0;
}

function toCommand(
    action: LiveFuzzAction,
    participant: LiveFuzzActor,
): LiveFuzzCommand {
    if (action === "probe") {
        return { kind: "probe", participant };
    } else if (action === "query") {
        return { kind: "query", participant };
    } else if (action === "fetch") {
        return { kind: "fetch", participant };
    } else if (action === "events") {
        return { kind: "events", participant };
    } else {
        return { kind: "exercise", participant };
    }
}

function isAcceptedResponse(value: unknown): value is { transactionId: string } {
    return (
        typeof value === "object" &&
        value !== null &&
        "transactionId" in value &&
        typeof value.transactionId === "string" &&
        value.transactionId.length > 0
    );
}

function readStatusCode(value: unknown): number | undefined {
    if (typeof value !== "object" || value === null || !("code" in value)) {
        return undefined;
    }

    return typeof value.code === "number" ? value.code : undefined;
}

function readErrorDetails(value: unknown): string {
    if (typeof value !== "object" || value === null) {
        return String(value);
    }

    else if ("details" in value && typeof value.details === "string") {
        return value.details;
    } else if ("message" in value && typeof value.message === "string") {
        return value.message;
    }

    return "Unknown command submission error.";
}
