import { describe, expect, test } from "vitest";
import {
    classifyCantonCommandOutcome,
    createCantonTestRuntime,
    pollUntilAsync,
    toCampaignMetricOutcome,
} from "../../../src/testing/runtime/canton-test-runtime.js";

describe("Canton test runtime", () => {
    test("resolves a named actor to its explicit participant and submission parties", () => {
        const runtime = createCantonTestRuntime({
            participants: { participantA: {} },
            actors: {
                issuer: {
                    party: "Issuer",
                    participant: "participantA",
                },
            },
            isolation: { kind: "external" },
        });

        expect(runtime.resolveRoute("issuer")).toEqual({
            actor: "issuer",
            participant: "participantA",
            party: "Issuer",
            actAs: ["Issuer"],
            readAs: [],
        });
    });

    test("rejects an actor whose participant is not registered", () => {
        expect(() =>
            createCantonTestRuntime({
                participants: {},
                actors: {
                    issuer: {
                        party: "Issuer",
                        participant: "missing",
                    },
                },
                isolation: { kind: "external" },
            }),
        ).toThrow("unknown participant 'missing'");
    });

    test("reads a ledger end through the selected participant", async () => {
        const runtime = createCantonTestRuntime({
            participants: {
                participantA: {
                    stateService: {
                        getLedgerEndAsync: async () => ({ offset: "00000042" }),
                    },
                },
            },
            actors: {
                issuer: {
                    party: "Issuer",
                    participant: "participantA",
                },
            },
            isolation: { kind: "external" },
        });

        await expect(runtime.readLedgerEndAsync("participantA")).resolves.toBe(
            "00000042",
        );
    });

    test("submits through the selected actor participant and classifies the response", async () => {
        const requests: unknown[] = [];

        const runtime = createCantonTestRuntime({
            participants: {
                participantA: {
                    commandService: {
                        submitAndWaitAsync: async (request: unknown) => {
                            requests.push(request);

                            return { transactionId: "update-1" };
                        },
                    },
                },
            },
            actors: {
                issuer: {
                    party: "Issuer",
                    participant: "participantA",
                },
            },
            isolation: { kind: "external" },
        });

        await expect(runtime.submitAndWaitAsync("issuer", { id: "command-1" }))
            .resolves.toEqual({ kind: "accepted", transactionId: "update-1" });
        expect(requests).toEqual([{ id: "command-1" }]);
    });
});

describe("Canton command outcomes", () => {
    test("classifies known ledger rejections as protocol reverts", () => {
        expect(
            classifyCantonCommandOutcome({
                error: {
                    code: 9,
                    details: "DAML_INTERPRETATION_ERROR(FAILED_PRECONDITION)",
                },
            }),
        ).toEqual({
            kind: "protocol-revert",
            statusCode: 9,
            details: "DAML_INTERPRETATION_ERROR(FAILED_PRECONDITION)",
        });
    });

    test("keeps an ambiguous command outcome distinct from transport failure", () => {
        expect(
            classifyCantonCommandOutcome({
                error: { code: 10, details: "aborted" },
            }),
        ).toEqual({
            kind: "unknown-commit-outcome",
            statusCode: 10,
            details: "aborted",
        });
    });

    test("maps accepted and malformed Canton responses to campaign outcomes", () => {
        expect(
            toCampaignMetricOutcome({ kind: "accepted", transactionId: "update-1" }),
        ).toEqual({ kind: "accepted", updateId: "update-1" });
        expect(toCampaignMetricOutcome({ kind: "accepted" })).toEqual({
            kind: "malformed-response",
            reason: "Canton command response has no transaction or command ID.",
        });
    });
});

describe("Canton runtime polling", () => {
    test("retries until the observed value satisfies the readiness predicate", async () => {
        let attempts = 0;

        await expect(
            pollUntilAsync({
                intervalMs: 0,
                timeoutMs: 100,
                readAsync: async () => ++attempts,
                isReady: (value) => value === 3,
            }),
        ).resolves.toBe(3);
        expect(attempts).toBe(3);
    });
});
