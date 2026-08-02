export interface CanonicalDecimalOffset {
    readonly text: string;
    readonly value: bigint;
}

export interface PruningSnapshot {
    readonly participantPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly allDivulgedContractsPrunedUpToInclusive: CanonicalDecimalOffset;
}

export type PruningPreflightClassification = {
    readonly kind: "alreadyPruned" | "beyondLedgerEnd";
    readonly target: CanonicalDecimalOffset;
    readonly beforeParticipantPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly beforeAllDivulgedContractsPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly ledgerEnd: CanonicalDecimalOffset;
    readonly afterParticipantPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly afterAllDivulgedContractsPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly caveat?: undefined;
} | {
    readonly kind: "notObservedPruned";
    readonly target: CanonicalDecimalOffset;
    readonly beforeParticipantPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly beforeAllDivulgedContractsPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly ledgerEnd: CanonicalDecimalOffset;
    readonly afterParticipantPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly afterAllDivulgedContractsPrunedUpToInclusive: CanonicalDecimalOffset;
    readonly caveat: "notObservedPruned is not proven queryable.";
};

export type SafePruningContext = {
    readonly kind: "safePruningOffset";
    readonly offset: CanonicalDecimalOffset;
} | {
    readonly kind: "noSafePruningOffset";
};

export interface PruningPreflightContext {
    readonly scheduleConfigured: boolean;
    readonly participantScheduleConfigured: boolean;
    readonly pruneInternallyOnly?: boolean;
    readonly safePruning: SafePruningContext;
}

const CANONICAL_POSITIVE_DECIMAL = /^[1-9][0-9]*$/;

const CANONICAL_NON_NEGATIVE_DECIMAL = /^(?:0|[1-9][0-9]*)$/;

const NOT_PROVEN_QUERYABLE = "notObservedPruned is not proven queryable." as const;

export function parseRequiredPositiveExampleOffset(
    environment: Readonly<Record<string, unknown>>,
): CanonicalDecimalOffset {
    const value = environment.SDK_EXAMPLE_OFFSET;

    if (typeof value !== "string" || !CANONICAL_POSITIVE_DECIMAL.test(value)) {
        throw new Error("SDK_EXAMPLE_OFFSET must be a positive decimal integer.");
    }

    return { text: value, value: BigInt(value) };
}

export function parseLedgerEnd(response: { readonly offset: unknown }): CanonicalDecimalOffset {
    return parseCanonicalNonNegativeOffset(response.offset, "ledger end");
}

export function normalizePruningSnapshot(response: {
    readonly participantPrunedUpToInclusive: unknown;
    readonly allDivulgedContractsPrunedUpToInclusive: unknown;
}): PruningSnapshot {
    return {
        participantPrunedUpToInclusive: parseCanonicalNonNegativeOffset(
            response.participantPrunedUpToInclusive,
            "participant pruning watermark",
        ),
        allDivulgedContractsPrunedUpToInclusive: parseCanonicalNonNegativeOffset(
            response.allDivulgedContractsPrunedUpToInclusive,
            "all-divulged pruning watermark",
        ),
    };
}

export function classifyPruningPreflight(init: {
    readonly target: CanonicalDecimalOffset;
    readonly before: PruningSnapshot;
    readonly ledgerEnd: CanonicalDecimalOffset;
    readonly after: PruningSnapshot;
}): PruningPreflightClassification {
    assertSampledInvariants(init.before, init.ledgerEnd, init.after);

    const evidence = {
        target: init.target,
        beforeParticipantPrunedUpToInclusive: init.before.participantPrunedUpToInclusive,
        beforeAllDivulgedContractsPrunedUpToInclusive:
            init.before.allDivulgedContractsPrunedUpToInclusive,
        ledgerEnd: init.ledgerEnd,
        afterParticipantPrunedUpToInclusive: init.after.participantPrunedUpToInclusive,
        afterAllDivulgedContractsPrunedUpToInclusive:
            init.after.allDivulgedContractsPrunedUpToInclusive,
    };

    if (init.target.value <= init.after.participantPrunedUpToInclusive.value) {
        return { kind: "alreadyPruned", ...evidence };
    } else if (init.target.value > init.ledgerEnd.value) {
        return { kind: "beyondLedgerEnd", ...evidence };
    }

    return {
        kind: "notObservedPruned",
        ...evidence,
        caveat: NOT_PROVEN_QUERYABLE,
    };
}

export function normalizePruningPreflightContext(init: {
    readonly schedule: { readonly schedule?: unknown };
    readonly participantSchedule: {
        readonly schedule?: {
            readonly pruneInternallyOnly: unknown;
        };
    };
    readonly safePruning: {
        readonly response: unknown;
    };
}): PruningPreflightContext {
    const participantSchedule = init.participantSchedule.schedule;

    const safePruning = normalizeSafePruningContext(init.safePruning);

    if (participantSchedule === undefined) {
        return {
            scheduleConfigured: init.schedule.schedule !== undefined,
            participantScheduleConfigured: false,
            safePruning,
        };
    }

    const pruneInternallyOnly = participantSchedule.pruneInternallyOnly;

    if (typeof pruneInternallyOnly !== "boolean") {
        throw new Error("Participant pruning schedule had an invalid internal-only flag.");
    }

    return {
        scheduleConfigured: init.schedule.schedule !== undefined,
        participantScheduleConfigured: true,
        pruneInternallyOnly,
        safePruning,
    };
}

function assertSampledInvariants(
    before: PruningSnapshot,
    ledgerEnd: CanonicalDecimalOffset,
    after: PruningSnapshot,
): void {
    assertAtOrBefore(
        before.allDivulgedContractsPrunedUpToInclusive,
        before.participantPrunedUpToInclusive,
        "The before all-divulged watermark exceeded the participant watermark.",
    );
    assertAtOrBefore(
        after.allDivulgedContractsPrunedUpToInclusive,
        after.participantPrunedUpToInclusive,
        "The after all-divulged watermark exceeded the participant watermark.",
    );
    assertAtOrBefore(
        before.participantPrunedUpToInclusive,
        ledgerEnd,
        "The before participant watermark exceeded the saved ledger end.",
    );
    assertAtOrBefore(
        before.allDivulgedContractsPrunedUpToInclusive,
        ledgerEnd,
        "The before all-divulged watermark exceeded the saved ledger end.",
    );
    assertAtOrBefore(
        before.participantPrunedUpToInclusive,
        after.participantPrunedUpToInclusive,
        "The participant pruning watermark moved backwards.",
    );
    assertAtOrBefore(
        before.allDivulgedContractsPrunedUpToInclusive,
        after.allDivulgedContractsPrunedUpToInclusive,
        "The all-divulged pruning watermark moved backwards.",
    );
}

function normalizeSafePruningContext(response: unknown): SafePruningContext {
    if (!isObject(response) || !isObject(response.response)) {
        throw new Error("Safe-pruning response did not contain a response oneof.");
    }

    const oneof = response.response;

    if (oneof.oneofKind === "safePruningOffset") {
        return {
            kind: "safePruningOffset",
            offset: parseCanonicalNonNegativeOffset(
                oneof.safePruningOffset,
                "safe pruning offset",
            ),
        };
    } else if (oneof.oneofKind === "noSafePruningOffset") {
        return { kind: "noSafePruningOffset" };
    }

    throw new Error("Safe-pruning response had an empty or malformed oneof.");
}

function parseCanonicalNonNegativeOffset(
    value: unknown,
    label: string,
): CanonicalDecimalOffset {
    if (typeof value !== "string" || !CANONICAL_NON_NEGATIVE_DECIMAL.test(value)) {
        throw new Error(`${label} must be a canonical non-negative decimal integer.`);
    }

    return { text: value, value: BigInt(value) };
}

function assertAtOrBefore(
    left: CanonicalDecimalOffset,
    right: CanonicalDecimalOffset,
    message: string,
): void {
    if (left.value > right.value) {
        throw new Error(message);
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}
