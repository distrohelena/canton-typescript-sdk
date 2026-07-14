import * as fc from "fast-check";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfEvaluator } from "../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";

export const evaluatorCaseArbitrary = fc.constantFrom(
    "textLiteral",
    "numericLiteral",
    "int64Literal",
    "letExpression",
    "lambdaApplication",
    "builtinConstructor",
    "builtinUnit",
    "builtinFalse",
    "equalCase",
    "greaterCase",
    "appendText",
    "recordConstruction",
    "listConstruction",
    "optionalConstruction",
    "variantCase",
    "enumCase",
    "boolCase",
);

export type EvaluatorCaseName =
    | "textLiteral"
    | "numericLiteral"
    | "int64Literal"
    | "letExpression"
    | "lambdaApplication"
    | "builtinConstructor"
    | "builtinUnit"
    | "builtinFalse"
    | "equalCase"
    | "greaterCase"
    | "appendText"
    | "recordConstruction"
    | "listConstruction"
    | "optionalConstruction"
    | "variantCase"
    | "enumCase"
    | "boolCase";

export interface EvaluatorInput {
    readonly text: string;
    readonly numeric: string;
    readonly int64: bigint;
    readonly party: string;
}

export const evaluatorInputArbitrary = fc.record({
    text: fc.string({ maxLength: 16 }),
    numeric: fc.integer({ min: -100_000, max: 100_000 }).map((value) =>
        `${value}.0000000000`,
    ),
    int64: fc.bigInt({ min: -(2n ** 63n), max: 2n ** 63n - 1n }),
    party: fc.string({ minLength: 1, maxLength: 16 }),
});

export interface BuiltEvaluatorCase {
    readonly evaluator: DamlLfEvaluator;
    readonly definition: DamlLfValueDefinition;
}

export function buildEvaluatorCase(
    caseName: EvaluatorCaseName,
    input: EvaluatorInput,
): BuiltEvaluatorCase {
    const expression = expressionForCase(caseName, input);

    const definition = new DamlLfValueDefinition({
        name: `property-${caseName}`,
        type: new DamlLfType({}),
        expression,
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
                        definitions: [definition],
                    }),
                ],
            }),
        ]),
    );

    return {
        evaluator: new DamlLfEvaluator(compilation),
        definition,
    };
}

function expressionForCase(
    caseName: EvaluatorCaseName,
    input: EvaluatorInput,
): DamlLfExpression {
    switch (caseName) {
        case "textLiteral":
            return new DamlLfExpression({ textLiteral: input.text });
        case "numericLiteral":
            return new DamlLfExpression({ numericLiteral: input.numeric });
        case "int64Literal":
            return new DamlLfExpression({
                int64Literal: input.int64.toString(),
            });
        case "letExpression":
            return new DamlLfExpression({
                letExpression: {
                    bindings: [{ name: "value", value: new DamlLfExpression({ textLiteral: input.text }) }],
                    body: new DamlLfExpression({ variableName: "value" }),
                },
            });
        case "lambdaApplication":
            return new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        lambda: {
                            parameters: ["value"],
                            body: new DamlLfExpression({
                                variableName: "value",
                            }),
                        },
                    }),
                    arguments: [
                        new DamlLfExpression({ textLiteral: input.text }),
                    ],
                },
            });
        case "builtinConstructor":
            return new DamlLfExpression({ builtinConstructor: "true" });
        case "builtinUnit":
            return new DamlLfExpression({ builtinConstructor: "unit" });
        case "builtinFalse":
            return new DamlLfExpression({ builtinConstructor: "false" });
        case "equalCase":
            return booleanCase(
                new DamlLfExpression({
                    application: {
                        function: new DamlLfExpression({
                            builtinFunction: "equal",
                        }),
                        arguments: [
                            new DamlLfExpression({ textLiteral: input.text }),
                            new DamlLfExpression({ textLiteral: input.text }),
                        ],
                    },
                }),
                "equal",
            );
        case "greaterCase":
            return booleanCase(
                new DamlLfExpression({
                    application: {
                        function: new DamlLfExpression({
                            builtinFunction: "greater",
                        }),
                        arguments: [
                            new DamlLfExpression({
                                int64Literal: input.int64.toString(),
                            }),
                            new DamlLfExpression({ int64Literal: "0" }),
                        ],
                    },
                }),
                "greater",
            );
        case "appendText":
            return new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        builtinFunction: "appendText",
                    }),
                    arguments: [
                        new DamlLfExpression({ textLiteral: input.text }),
                        new DamlLfExpression({ textLiteral: input.text }),
                    ],
                },
            });
        case "recordConstruction":
            return new DamlLfExpression({
                recordConstruction: {
                    fields: [
                        {
                            name: "text",
                            value: new DamlLfExpression({
                                textLiteral: input.text,
                            }),
                        },
                        {
                            name: "party",
                            value: new DamlLfExpression({
                                textLiteral: input.party,
                            }),
                        },
                    ],
                },
            });
        case "listConstruction":
            return new DamlLfExpression({
                listConstruction: {
                    front: [
                        new DamlLfExpression({ textLiteral: input.text }),
                        new DamlLfExpression({ textLiteral: input.party }),
                    ],
                },
            });
        case "optionalConstruction":
            return new DamlLfExpression({
                optionalConstruction: {
                    value: new DamlLfExpression({ textLiteral: input.text }),
                },
            });
        case "variantCase":
            return new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        variantConstruction: {
                            constructorName: "Value",
                            argument: new DamlLfExpression({
                                textLiteral: input.text,
                            }),
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "variant",
                            constructorName: "Value",
                            binderName: "value",
                            body: new DamlLfExpression({
                                variableName: "value",
                            }),
                        },
                    ],
                },
            });
        case "enumCase":
            return new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        enumConstruction: { constructorName: "Active" },
                    }),
                    alternatives: [
                        {
                            patternKind: "enum",
                            constructorName: "Active",
                            body: new DamlLfExpression({
                                textLiteral: input.text,
                            }),
                        },
                    ],
                },
            });
        case "boolCase":
            return booleanCase(
                new DamlLfExpression({ builtinConstructor: "true" }),
                "bool",
            );
    }
}

function booleanCase(
    scrutinee: DamlLfExpression,
    label: string,
): DamlLfExpression {
    return new DamlLfExpression({
        caseExpression: {
            scrutinee,
            alternatives: [
                {
                    patternKind: "builtinCon",
                    builtinConstructor: "true",
                    body: new DamlLfExpression({ textLiteral: `${label}:true` }),
                },
                {
                    patternKind: "default",
                    body: new DamlLfExpression({ textLiteral: `${label}:false` }),
                },
            ],
        },
    });
}
