import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import { DamlLfEvaluator } from "../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfStepKind } from "../../../src/daml-lf/interpreter/daml-lf-step-kind.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";

describe("DamlLfEvaluator", () => {
    it("evaluates a value definition and emits enter/exit trace steps", () => {
        const definition = new DamlLfValueDefinition({
            name: "value",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "Alice",
            }),
        });
        const evaluator = new DamlLfEvaluator(
            DamlLfCompilation.createOrThrow(
                new DamlLfWorkspace([
                    new DamlLfPackage({
                        packageId: "sample-hash",
                        packageName: "sample-package",
                        packageVersion: "1.0.0",
                        languageVersion: {
                            major: 2,
                            minor: "1",
                            patch: 0,
                            toString: () => "2.1",
                        },
                        modules: [
                            new DamlLfModule({
                                name: "Sample.Module",
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );
        const steps: DamlLfStepKind[] = [];

        const value = evaluator.evaluateValueDefinitionOrThrow(definition, {
            onStep(step) {
                steps.push(step.kind);
            },
        });

        expect(value).toEqual({
            kind: "text",
            value: "Alice",
        });
        expect(steps).toEqual([
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.exitExpression,
        ]);
    });

    it("resolves referenced value definitions and emits call/return trace steps", () => {
        const greeting = new DamlLfValueDefinition({
            name: "greeting",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "Alice",
            }),
        });
        const alias = new DamlLfValueDefinition({
            name: "alias",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                valueReference: {
                    packageId: "sample-hash",
                    moduleName: "Sample.Module",
                    definitionName: "greeting",
                },
            }),
        });
        const evaluator = new DamlLfEvaluator(
            DamlLfCompilation.createOrThrow(
                new DamlLfWorkspace([
                    new DamlLfPackage({
                        packageId: "sample-hash",
                        packageName: "sample-package",
                        packageVersion: "1.0.0",
                        languageVersion: {
                            major: 2,
                            minor: "1",
                            patch: 0,
                            toString: () => "2.1",
                        },
                        modules: [
                            new DamlLfModule({
                                name: "Sample.Module",
                                definitions: [greeting, alias],
                            }),
                        ],
                    }),
                ]),
            ),
        );
        const steps: DamlLfStepKind[] = [];

        const value = evaluator.evaluateValueDefinitionOrThrow(alias, {
            onStep(step) {
                steps.push(step.kind);
            },
        });

        expect(value).toEqual({
            kind: "text",
            value: "Alice",
        });
        expect(steps).toEqual([
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.call,
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.exitExpression,
            DamlLfStepKind.return,
            DamlLfStepKind.exitExpression,
        ]);
    });
});
