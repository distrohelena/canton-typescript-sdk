import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ReplayDeterminismException } from "../../../src/debugger/index.js";
import { ReplayDeterminismValidator } from "../../../src/debugger/replay/replay-determinism-validator.js";
import { canonicalize } from "../canonicalize.js";
import { replayCaseArbitrary, replayInputArbitrary, buildReplayCase } from "../fixtures/replay-cases.js";
import { replayObservedExerciseArbitrary } from "../arbitraries/replay-effects.js";
import { propertyParameters } from "../property-test-options.js";

describe("replay properties", () => {
    it.each([
        ["pure", []],
        ["block", []],
        ["tryCatch", []],
        ["create", ["create"]],
        ["fetch", ["fetch"]],
        ["exercise", ["create", "exercise"]],
    ])("covers the fixed %s replay update", (caseName, expectedKinds) => {
        const fixture = buildReplayCase(caseName, { text: "Alice" });

        const result = fixture.evaluator.evaluateReplayEntrypointOrThrow(
            fixture.definition,
            fixture.environment,
        );

        expect(result.effects.map((effect) => effect.kind)).toEqual(
            expectedKinds,
        );
    });

    it("replays fixed update cases deterministically", () => {
        fc.assert(
            fc.property(replayCaseArbitrary, replayInputArbitrary, (caseName, input) => {
                const first = buildReplayCase(caseName, input);

                const second = buildReplayCase(caseName, input);

                const firstTrace: string[] = [];

                const secondTrace: string[] = [];

                const firstResult = first.evaluator.evaluateReplayEntrypointOrThrow(
                    first.definition,
                    first.environment,
                    { onStep: (step) => firstTrace.push(step.kind) },
                );

                const secondResult = second.evaluator.evaluateReplayEntrypointOrThrow(
                    second.definition,
                    second.environment,
                    { onStep: (step) => secondTrace.push(step.kind) },
                );

                expect(canonicalize(firstResult.value)).toEqual(
                    canonicalize(secondResult.value),
                );
                expect(canonicalize(firstResult.effects)).toEqual(
                    canonicalize(secondResult.effects),
                );
                expect(firstTrace).toEqual(secondTrace);
            }),
            propertyParameters(),
        );
    });

    it("accepts matching raw ledger effects and rejects a mutated choice argument", () => {
        fc.assert(
            fc.property(replayObservedExerciseArbitrary, ({ raw, normalized }) => {
                const validator = new ReplayDeterminismValidator();

                const snapshot = {
                    kind: "transaction" as const,
                    offset: "42",
                    events: [
                        {
                            event: {
                                oneofKind: "exercised",
                                exercised: {
                                    contractId: "00abc",
                                    templateId: {
                                        packageId: "pkg-main",
                                        moduleName: "Main",
                                        entityName: "Vault",
                                    },
                                    choice: "Archive",
                                    choiceArgument: raw,
                                },
                            },
                        },
                    ],
                    entrypoint: {
                        kind: "exercise" as const,
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        contractId: "00abc",
                        choice: "Archive",
                        argument: {},
                    },
                };

                expect(() =>
                    validator.validateOrThrow(snapshot, [
                        {
                            kind: "exercise",
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            argument: normalized,
                        },
                    ]),
                ).not.toThrow();

                expect(() =>
                    validator.validateOrThrow(snapshot, [
                        {
                            kind: "exercise",
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            argument: Array.isArray(normalized)
                                ? { mutated: normalized }
                                : [normalized],
                        },
                    ]),
                ).toThrow(ReplayDeterminismException);
            }),
            propertyParameters(),
        );
    });
});
