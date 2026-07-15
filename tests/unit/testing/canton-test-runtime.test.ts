import { describe, expect, test } from "vitest";
import {
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
