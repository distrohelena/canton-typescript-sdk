import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
    evaluatorCaseArbitrary,
    evaluatorInputArbitrary,
    buildEvaluatorCase,
} from "../fixtures/evaluator-cases.js";
import { canonicalize } from "../canonicalize.js";
import { propertyParameters } from "../property-test-options.js";

describe("DAML-LF evaluator properties", () => {
    it("evaluates the same fixed case deterministically", () => {
        fc.assert(
            fc.property(
                evaluatorCaseArbitrary,
                evaluatorInputArbitrary,
                (caseName, input) => {
                    const first = buildEvaluatorCase(caseName, input);

                    const second = buildEvaluatorCase(caseName, input);

                    const firstTrace: string[] = [];

                    const secondTrace: string[] = [];

                    const firstValue = first.evaluator.evaluateValueDefinitionOrThrow(
                        first.definition,
                        { onStep: (step) => firstTrace.push(step.kind) },
                    );

                    const secondValue = second.evaluator.evaluateValueDefinitionOrThrow(
                        second.definition,
                        { onStep: (step) => secondTrace.push(step.kind) },
                    );

                    expect(canonicalize(firstValue)).toEqual(
                        canonicalize(secondValue),
                    );
                    expect(firstTrace).toEqual(secondTrace);
                },
            ),
            propertyParameters(),
        );
    });
});
