import * as fc from "fast-check";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfEvaluator, IDamlLfReplayEnvironment } from "../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";

const templateId = {
    packageId: "property-package",
    moduleName: "Property.Module",
    templateName: "Vault",
};

const replayTemplateId = {
    packageId: templateId.packageId,
    moduleName: templateId.moduleName,
    entityName: templateId.templateName,
};

export const replayCaseArbitrary = fc.constantFrom(
    "pure",
    "block",
    "tryCatch",
    "create",
    "fetch",
    "exercise",
);

export type ReplayCaseName =
    | "pure"
    | "block"
    | "tryCatch"
    | "create"
    | "fetch"
    | "exercise";

export interface ReplayInput {
    readonly text: string;
}

export const replayInputArbitrary = fc.record({
    text: fc.string({ maxLength: 16 }),
});

export interface BuiltReplayCase {
    readonly evaluator: DamlLfEvaluator;
    readonly definition: DamlLfValueDefinition;
    readonly environment: IDamlLfReplayEnvironment;
}

export function buildReplayCase(
    caseName: ReplayCaseName,
    input: ReplayInput,
): BuiltReplayCase {
    const choiceDefinition = new DamlLfValueDefinition({
        name: "Archive",
        type: new DamlLfType({}),
        expression: new DamlLfExpression({ textLiteral: input.text }),
    });

    const definition = new DamlLfValueDefinition({
        name: `property-replay-${caseName}`,
        type: new DamlLfType({}),
        expression: expressionForCase(caseName, input),
    });

    const compilation = DamlLfCompilation.createOrThrow(
        new DamlLfWorkspace([
            new DamlLfPackage({
                packageId: "property-package",
                packageName: "property-package",
                packageVersion: "1.0.0",
                languageVersion: {
                    major: 2,
                    minor: "1",
                    patch: 0,
                    toString: () => "2.1",
                },
                modules: [
                    new DamlLfModule({
                        name: "Property.Module",
                        definitions: [definition, choiceDefinition],
                    }),
                ],
            }),
        ]),
    );

    const environment: IDamlLfReplayEnvironment = {
        offset: "42",
        entrypoint: {
            kind: caseName === "fetch" || caseName === "exercise"
                ? "exercise"
                : "create",
            templateId: replayTemplateId,
            contractId: caseName === "fetch" || caseName === "exercise"
                ? "00source"
                : undefined,
            choice: caseName === "fetch" || caseName === "exercise"
                ? "Archive"
                : undefined,
            argument: { owner: input.text },
        },
        entrypointBindingMode:
            caseName === "fetch" ? "exerciseWrapper" : undefined,
        contracts: new Map([
            [
                "00source",
                {
                    payload: { owner: input.text },
                    templateId: replayTemplateId,
                },
            ],
        ]),
        observedCreateContractIds: ["00created"],
        definitionResolver: {
            resolveChoiceDefinitionOrThrow() {
                return {
                    packageId: "property-package",
                    moduleName: "Property.Module",
                    definition: choiceDefinition,
                    replayExpression: choiceDefinition.expression,
                    replayBindingMode: "templateChoice" as const,
                };
            },
        },
    };

    return {
        evaluator: new DamlLfEvaluator(compilation),
        definition,
        environment,
    };
}

function expressionForCase(
    caseName: ReplayCaseName,
    input: ReplayInput,
): DamlLfExpression {
    const text = new DamlLfExpression({ textLiteral: input.text });

    const payload = new DamlLfExpression({
        recordConstruction: {
            fields: [{ name: "owner", value: text }],
        },
    });

    const create = new DamlLfExpression({
        updateExpression: {
            kind: "create",
            templateId,
            argument: payload,
        },
    });

    switch (caseName) {
        case "pure":
            return new DamlLfExpression({
                updateExpression: { kind: "pure", expression: text },
            });
        case "block":
            return new DamlLfExpression({
                updateExpression: {
                    kind: "block",
                    bindings: [{ name: "value", value: text }],
                    body: new DamlLfExpression({ variableName: "value" }),
                },
            });
        case "tryCatch":
            return new DamlLfExpression({
                updateExpression: {
                    kind: "tryCatch",
                    expression: new DamlLfExpression({
                        throwExpression: { exception: text },
                    }),
                    catchVariableName: "error",
                    catchExpression: new DamlLfExpression({
                        variableName: "error",
                    }),
                },
            });
        case "create":
            return create;
        case "fetch":
            return new DamlLfExpression({
                lambda: {
                    parameters: ["cid", "argument"],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "fetch",
                            templateId,
                            contractId: new DamlLfExpression({
                                variableName: "cid",
                            }),
                        },
                    }),
                },
            });
        case "exercise":
            return new DamlLfExpression({
                updateExpression: {
                    kind: "block",
                    bindings: [{ name: "cid", value: create }],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "exercise",
                            templateId,
                            choiceName: "Archive",
                            contractId: new DamlLfExpression({
                                variableName: "cid",
                            }),
                            argument: text,
                        },
                    }),
                },
            });
    }
}
