import { describe, expect, it } from "vitest";
import {
    classifyPruningPreflight,
    normalizePruningPreflightContext,
    normalizePruningSnapshot,
    parseLedgerEnd,
    parseRequiredPositiveExampleOffset,
} from "../../../examples/shared/pruning-preflight.js";

describe("pruning preflight assertions", () => {
    it.each([
        undefined,
        "",
        " ",
        "0",
        "+1",
        "-1",
        "1.0",
        "01",
    ])("rejects an invalid required example target %j", value => {
        expect(() => parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: value }))
            .toThrow("SDK_EXAMPLE_OFFSET must be a positive decimal integer.");
    });

    it("parses canonical positive targets exactly beyond Number.MAX_SAFE_INTEGER", () => {
        expect(parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "1" })).toEqual({
            text: "1",
            value: 1n,
        });
        expect(parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "9007199254740993" })).toEqual({
            text: "9007199254740993",
            value: 9007199254740993n,
        });
    });

    it.each([
        "",
        " ",
        "+1",
        "-1",
        "1.0",
        "01",
        "1e3",
        undefined,
        1,
    ])("rejects a noncanonical response offset %j", value => {
        expect(() => normalizePruningSnapshot({
            participantPrunedUpToInclusive: value,
            allDivulgedContractsPrunedUpToInclusive: "0",
        })).toThrow(/canonical non-negative decimal/i);
    });

    it("compares adjacent response offsets exactly beyond Number.MAX_SAFE_INTEGER", () => {
        const before = snapshot("9007199254740992", "9007199254740991");

        const after = snapshot("9007199254740993", "9007199254740992");

        const result = classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "9007199254740993" }),
            before,
            ledgerEnd: parseLedgerEnd({ offset: "9007199254740992" }),
            after,
        });

        expect(result.kind).toBe("alreadyPruned");
        expect(result.afterParticipantPrunedUpToInclusive.value).toBe(9007199254740993n);
    });

    it.each([
        ["before all-divulged exceeds participant", snapshot("5", "6"), parseLedgerEnd({ offset: "8" }), snapshot("6", "6")],
        ["after all-divulged exceeds participant", snapshot("5", "4"), parseLedgerEnd({ offset: "8" }), snapshot("6", "7")],
        ["before participant exceeds saved ledger end", snapshot("9", "4"), parseLedgerEnd({ offset: "8" }), snapshot("9", "4")],
        ["before all-divulged exceeds saved ledger end", snapshot("8", "9"), parseLedgerEnd({ offset: "8" }), snapshot("9", "9")],
        ["participant watermark moves backwards", snapshot("5", "4"), parseLedgerEnd({ offset: "8" }), snapshot("4", "4")],
        ["all-divulged watermark moves backwards", snapshot("5", "4"), parseLedgerEnd({ offset: "8" }), snapshot("6", "3")],
    ] as const)("rejects sampled invariant violation: %s", (_label, before, ledgerEnd, after) => {
        expect(() => classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "1" }),
            before,
            ledgerEnd,
            after,
        })).toThrow();
    });

    it("allows later watermarks beyond the saved ledger end", () => {
        const result = classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "9" }),
            before: snapshot("5", "4"),
            ledgerEnd: parseLedgerEnd({ offset: "8" }),
            after: snapshot("10", "9"),
        });

        expect(result.kind).toBe("alreadyPruned");
    });

    it.each([
        ["below", "4"],
        ["equal", "5"],
        ["beyond saved ledger end", "9"],
    ])("uses the later participant watermark inclusively for already-pruned %s targets", (_label, target) => {
        const result = classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: target }),
            before: snapshot("4", "3"),
            ledgerEnd: parseLedgerEnd({ offset: "8" }),
            after: snapshot("9", "3"),
        });

        expect(result.kind).toBe("alreadyPruned");
    });

    it("reports a target beyond the saved ledger end only when the later watermark does not cover it", () => {
        const result = classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "9" }),
            before: snapshot("4", "3"),
            ledgerEnd: parseLedgerEnd({ offset: "8" }),
            after: snapshot("5", "4"),
        });

        expect(result.kind).toBe("beyondLedgerEnd");
    });

    it("reports a cautious not-observed-pruned classification with the full sampled evidence", () => {
        const result = classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "6" }),
            before: snapshot("4", "3"),
            ledgerEnd: parseLedgerEnd({ offset: "8" }),
            after: snapshot("5", "4"),
        });

        expect(result).toMatchObject({
            kind: "notObservedPruned",
            target: { text: "6", value: 6n },
            beforeParticipantPrunedUpToInclusive: { text: "4", value: 4n },
            beforeAllDivulgedContractsPrunedUpToInclusive: { text: "3", value: 3n },
            ledgerEnd: { text: "8", value: 8n },
            afterParticipantPrunedUpToInclusive: { text: "5", value: 5n },
            afterAllDivulgedContractsPrunedUpToInclusive: { text: "4", value: 4n },
            caveat: "notObservedPruned is not proven queryable.",
        });
    });

    it("does not let the all-divulged watermark alter classification", () => {
        const initial = {
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "6" }),
            before: snapshot("4", "0"),
            ledgerEnd: parseLedgerEnd({ offset: "8" }),
            after: snapshot("5", "0"),
        };

        expect(classifyPruningPreflight(initial).kind).toBe("notObservedPruned");
        expect(classifyPruningPreflight({
            ...initial,
            before: snapshot("4", "4"),
            after: snapshot("5", "5"),
        }).kind).toBe("notObservedPruned");
    });

    it("normalizes only bounded absent and configured schedule context", () => {
        expect(normalizePruningPreflightContext({
            schedule: {},
            participantSchedule: {},
            safePruning: { response: { oneofKind: "noSafePruningOffset", noSafePruningOffset: {} } },
        })).toEqual({
            scheduleConfigured: false,
            participantScheduleConfigured: false,
            safePruning: { kind: "noSafePruningOffset" },
        });

        expect(normalizePruningPreflightContext({
            schedule: { schedule: { cron: "private", maxDuration: { seconds: "1", nanos: 0 } } },
            participantSchedule: {
                schedule: { schedule: { cron: "private" }, pruneInternallyOnly: true },
            },
            safePruning: { response: { oneofKind: "safePruningOffset", safePruningOffset: "8" } },
        })).toEqual({
            scheduleConfigured: true,
            participantScheduleConfigured: true,
            pruneInternallyOnly: true,
            safePruning: { kind: "safePruningOffset", offset: { text: "8", value: 8n } },
        });
    });

    it.each([
        ["empty", { response: { oneofKind: undefined } }],
        ["malformed safe offset", { response: { oneofKind: "safePruningOffset", safePruningOffset: "08" } }],
    ])("rejects %s safe-pruning context", (_label, safePruning) => {
        expect(() => normalizePruningPreflightContext({
            schedule: {},
            participantSchedule: {},
            safePruning,
        })).toThrow();
    });

    it("keeps calculated classification independent from every context value", () => {
        const classification = classifyPruningPreflight({
            target: parseRequiredPositiveExampleOffset({ SDK_EXAMPLE_OFFSET: "6" }),
            before: snapshot("4", "3"),
            ledgerEnd: parseLedgerEnd({ offset: "8" }),
            after: snapshot("5", "4"),
        });

        const context = normalizePruningPreflightContext({
            schedule: { schedule: { cron: "private" } },
            participantSchedule: {
                schedule: { schedule: { cron: "private" }, pruneInternallyOnly: false },
            },
            safePruning: { response: { oneofKind: "safePruningOffset", safePruningOffset: "8" } },
        });

        expect(classification.kind).toBe("notObservedPruned");
        expect(context).toMatchObject({
            scheduleConfigured: true,
            participantScheduleConfigured: true,
            pruneInternallyOnly: false,
            safePruning: { kind: "safePruningOffset", offset: { text: "8" } },
        });
    });
});

function snapshot(participant: string, allDivulged: string) {
    return normalizePruningSnapshot({
        participantPrunedUpToInclusive: participant,
        allDivulgedContractsPrunedUpToInclusive: allDivulged,
    });
}
