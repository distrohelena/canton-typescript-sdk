import { describe, expect, test } from "vitest";
import {
    classifyCantonCommandOutcome,
    createCantonTestRuntime,
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
});
