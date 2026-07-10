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
import { ILedgerReplayEnvironment } from "../../../src/debugger/replay/ledger-replay-environment-builder.js";
import { ReplayEntrypoint } from "../../../src/debugger/replay/replay-entrypoint.js";

describe("DamlLfEvaluator ledger effects", () => {
    it("emits state-effect steps for exercised choices", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "ok",
            }),
        });
        const evaluator = new DamlLfEvaluator(
            DamlLfCompilation.createOrThrow(
                new DamlLfWorkspace([
                    new DamlLfPackage({
                        packageId: "pkg-main",
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
        const environment: ILedgerReplayEnvironment = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
            contracts: new Map([
                [
                    "00abc",
                    {
                        contractId: "00abc",
                        templateId: {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            entityName: "Vault",
                        },
                        payload: {
                            owner: "Alice",
                        },
                        history: {},
                    },
                ],
            ]),
            packageIds: ["pkg-main"],
        };

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            environment,
            {
                onStep(step) {
                    steps.push(step.kind);
                },
            },
        );

        expect(result.effects).toEqual([
            {
                kind: "exercise",
                contractId: "00abc",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                choice: "Archive",
                argument: {},
            },
        ]);
        expect(steps).toEqual([
            DamlLfStepKind.stateEffect,
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.exitExpression,
        ]);
    });
});
