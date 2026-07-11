import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import {
    DAML_LF_PARTY_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
} from "../../../src/daml-lf/interpreter/daml-lf-runtime-value.js";
import { DamlLfDataType } from "../../../src/daml-lf/model/daml-lf-data-type.js";
import { DamlLfEvaluator } from "../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfStepKind } from "../../../src/daml-lf/interpreter/daml-lf-step-kind.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
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

    it("evaluates let-bound variables through lambda application", () => {
        const definition = new DamlLfValueDefinition({
            name: "applyGreeting",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                letExpression: {
                    bindings: [
                        {
                            name: "greeting",
                            value: new DamlLfExpression({
                                textLiteral: "Alice",
                            }),
                        },
                    ],
                    body: new DamlLfExpression({
                        application: {
                            function: new DamlLfExpression({
                                lambda: {
                                    parameters: ["name"],
                                    body: new DamlLfExpression({
                                        variableName: "name",
                                    }),
                                },
                            }),
                            arguments: [
                                new DamlLfExpression({
                                    variableName: "greeting",
                                }),
                            ],
                        },
                    }),
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );
        const steps: {
            kind: DamlLfStepKind;
            locals: readonly { name: string; value: string }[];
        }[] = [];

        const value = evaluator.evaluateValueDefinitionOrThrow(definition, {
            onStep(step) {
                steps.push({
                    kind: step.kind,
                    locals: step.locals.map((local) => ({
                        name: local.name,
                        value:
                            "value" in local.value
                                ? String(local.value.value)
                                : local.value.kind,
                    })),
                });
            },
        });

        expect(value).toEqual({
            kind: "text",
            value: "Alice",
        });
        expect(
            steps.some(
                (step) =>
                    step.locals.some(
                        (local) =>
                            local.name === "greeting"
                            && local.value === "Alice",
                    ),
            ),
        ).toBe(true);
        expect(
            steps.some(
                (step) =>
                    step.locals.some(
                        (local) =>
                            local.name === "name" && local.value === "Alice",
                    ),
            ),
        ).toBe(true);
    });

    it("evaluates record construction and field projection", () => {
        const definition = new DamlLfValueDefinition({
            name: "ownerName",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                letExpression: {
                    bindings: [
                        {
                            name: "person",
                            value: new DamlLfExpression({
                                recordConstruction: {
                                    fields: [
                                        {
                                            name: "owner",
                                            value: new DamlLfExpression({
                                                textLiteral: "Alice",
                                            }),
                                        },
                                    ],
                                },
                            }),
                        },
                    ],
                    body: new DamlLfExpression({
                        recordProjection: {
                            fieldName: "owner",
                            record: new DamlLfExpression({
                                variableName: "person",
                            }),
                        },
                    }),
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "Alice",
        });
    });

    it("evaluates record updates", () => {
        const definition = new DamlLfValueDefinition({
            name: "renameOwner",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                recordUpdate: {
                    fieldName: "owner",
                    record: new DamlLfExpression({
                        recordConstruction: {
                            fields: [
                                {
                                    name: "owner",
                                    value: new DamlLfExpression({
                                        textLiteral: "Alice",
                                    }),
                                },
                                {
                                    name: "note",
                                    value: new DamlLfExpression({
                                        textLiteral: "original",
                                    }),
                                },
                            ],
                        },
                    }),
                    value: new DamlLfExpression({
                        textLiteral: "Bob",
                    }),
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "ledgerValue",
            value: {
                owner: "Bob",
                note: "original",
            },
            contractId: undefined,
        });
    });

    it("preserves callable record fields through projection", () => {
        const definition = new DamlLfValueDefinition({
            name: "applyProjectedFunction",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        recordProjection: {
                            fieldName: "projected",
                            record: new DamlLfExpression({
                                recordConstruction: {
                                    fields: [
                                        {
                                            name: "projected",
                                            value: new DamlLfExpression({
                                                lambda: {
                                                    parameters: ["name"],
                                                    body: new DamlLfExpression({
                                                        variableName: "name",
                                                    }),
                                                },
                                            }),
                                        },
                                    ],
                                },
                            }),
                        },
                    }),
                    arguments: [
                        new DamlLfExpression({
                            textLiteral: "Alice",
                        }),
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        expect(evaluator.evaluateValueDefinitionOrThrow(definition)).toEqual({
            kind: "text",
            value: "Alice",
        });
    });

    it("evaluates case expressions over builtin boolean constructors", () => {
        const definition = new DamlLfValueDefinition({
            name: "decision",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        builtinConstructor: "true",
                    }),
                    alternatives: [
                        {
                            patternKind: "builtinCon",
                            builtinConstructor: "true",
                            body: new DamlLfExpression({
                                textLiteral: "approved",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "rejected",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "approved",
        });
    });

    it("evaluates variant construction and case matching", () => {
        const definition = new DamlLfValueDefinition({
            name: "statusText",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        variantConstruction: {
                            constructorName: "Approved",
                            argument: new DamlLfExpression({
                                textLiteral: "Alice",
                            }),
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "variant",
                            constructorName: "Approved",
                            binderName: "owner",
                            body: new DamlLfExpression({
                                variableName: "owner",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "unknown",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "Alice",
        });
    });

    it("projects unlabeled ledger records by semantic field name", () => {
        const definition = new DamlLfValueDefinition({
            name: "projectAdmin",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["identity"],
                    body: new DamlLfExpression({
                        recordProjection: {
                            fieldName: "admin",
                            record: new DamlLfExpression({
                                variableName: "identity",
                            }),
                        },
                    }),
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
                                definitions: [
                                    new DamlLfDataType({
                                        name: "VaultIdentity",
                                        fields: [
                                            new DamlLfField({
                                                name: "admin",
                                                type: new DamlLfType({}),
                                            }),
                                        ],
                                    }),
                                    definition,
                                ],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const result = evaluator.evaluateReplayEntrypointOrThrow(definition, {
            offset: "42",
            entrypoint: {
                kind: "create",
                argument: {
                    0: "Alice",
                    [DAML_LF_RECORD_ID_MARKER_KEY]: {
                        packageId: "sample-hash",
                        moduleName: "Sample.Module",
                        entityName: "VaultIdentity",
                    },
                },
            },
        });

        expect(result.value).toEqual({
            kind: "text",
            value: "Alice",
        });
    });

    it("hydrates replay party markers as party runtime values", () => {
        const definition = new DamlLfValueDefinition({
            name: "identity",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["party"],
                    body: new DamlLfExpression({
                        variableName: "party",
                    }),
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const result = evaluator.evaluateReplayEntrypointOrThrow(definition, {
            offset: "42",
            entrypoint: {
                kind: "create",
                argument: {
                    [DAML_LF_PARTY_MARKER_KEY]: "Alice::1220abc",
                },
            },
        });

        expect(result.value).toEqual({
            kind: "party",
            value: "Alice::1220abc",
        });
    });

    it("projects nested unlabeled ledger records using semantic field types", () => {
        const vaultIdentityReference = {
            packageId: "sample-hash",
            moduleName: "Sample.Module",
            name: "VaultIdentity",
        };
        const definition = new DamlLfValueDefinition({
            name: "projectNestedAdmin",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["snapshot"],
                    body: new DamlLfExpression({
                        recordProjection: {
                            fieldName: "admin",
                            record: new DamlLfExpression({
                                recordProjection: {
                                    fieldName: "vaultIdentity",
                                    record: new DamlLfExpression({
                                        variableName: "snapshot",
                                    }),
                                },
                            }),
                        },
                    }),
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
                                definitions: [
                                    new DamlLfDataType({
                                        name: "VaultIdentity",
                                        fields: [
                                            new DamlLfField({
                                                name: "admin",
                                                type: new DamlLfType({}),
                                            }),
                                            new DamlLfField({
                                                name: "name",
                                                type: new DamlLfType({}),
                                            }),
                                        ],
                                    }),
                                    new DamlLfDataType({
                                        name: "Snapshot",
                                        fields: [
                                            new DamlLfField({
                                                name: "vaultIdentity",
                                                type: new DamlLfType({
                                                    typeConReference:
                                                        vaultIdentityReference,
                                                }),
                                            }),
                                        ],
                                    }),
                                    definition,
                                ],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const result = evaluator.evaluateReplayEntrypointOrThrow(definition, {
            offset: "42",
            entrypoint: {
                kind: "create",
                argument: {
                    0: {
                        0: "Alice",
                        1: "Vault",
                    },
                    [DAML_LF_RECORD_ID_MARKER_KEY]: {
                        packageId: "sample-hash",
                        moduleName: "Sample.Module",
                        entityName: "Snapshot",
                    },
                },
            },
        });

        expect(result.value).toEqual({
            kind: "text",
            value: "Alice",
        });
    });

    it("evaluates optional some/none case matching", () => {
        const definition = new DamlLfValueDefinition({
            name: "noteText",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        optionalConstruction: {
                            value: new DamlLfExpression({
                                textLiteral: "hello",
                            }),
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "optionalSome",
                            binderName: "note",
                            body: new DamlLfExpression({
                                variableName: "note",
                            }),
                        },
                        {
                            patternKind: "optionalNone",
                            body: new DamlLfExpression({
                                textLiteral: "missing",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "hello",
        });
    });

    it("evaluates builtin equality through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "isOwner",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        application: {
                            function: new DamlLfExpression({
                                builtinFunction: "equal",
                            }),
                            arguments: [
                                new DamlLfExpression({
                                    textLiteral: "Alice",
                                }),
                                new DamlLfExpression({
                                    textLiteral: "Alice",
                                }),
                            ],
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "builtinCon",
                            builtinConstructor: "true",
                            body: new DamlLfExpression({
                                textLiteral: "yes",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "no",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "yes",
        });
    });

    it("evaluates enum construction and case matching", () => {
        const definition = new DamlLfValueDefinition({
            name: "statusLabel",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        enumConstruction: {
                            constructorName: "Active",
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "enum",
                            constructorName: "Active",
                            body: new DamlLfExpression({
                                textLiteral: "active",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "inactive",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "active",
        });
    });

    it("evaluates list construction and cons case matching", () => {
        const definition = new DamlLfValueDefinition({
            name: "headValue",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        listConstruction: {
                            front: [
                                new DamlLfExpression({
                                    textLiteral: "head",
                                }),
                            ],
                            tail: new DamlLfExpression({
                                listConstruction: {
                                    front: [],
                                },
                            }),
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "cons",
                            headBinderName: "head",
                            tailBinderName: "tail",
                            body: new DamlLfExpression({
                                variableName: "head",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "empty",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "head",
        });
    });

    it("evaluates int64 comparison builtins through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "isPositive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        application: {
                            function: new DamlLfExpression({
                                builtinFunction: "greater",
                            }),
                            arguments: [
                                new DamlLfExpression({
                                    int64Literal: "5",
                                }),
                                new DamlLfExpression({
                                    int64Literal: "0",
                                }),
                            ],
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "builtinCon",
                            builtinConstructor: "true",
                            body: new DamlLfExpression({
                                textLiteral: "positive",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "not-positive",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "positive",
        });
    });

    it("evaluates appendText builtin through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "fullName",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        builtinFunction: "appendText",
                    }),
                    arguments: [
                        new DamlLfExpression({
                            textLiteral: "Alice",
                        }),
                        new DamlLfExpression({
                            textLiteral: " Smith",
                        }),
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "Alice Smith",
        });
    });

    it("evaluates EXPLODE_TEXT builtin through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "firstCharacter",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                caseExpression: {
                    scrutinee: new DamlLfExpression({
                        application: {
                            function: new DamlLfExpression({
                                builtinFunction: "EXPLODE_TEXT",
                            }),
                            arguments: [
                                new DamlLfExpression({
                                    textLiteral: "AB",
                                }),
                            ],
                        },
                    }),
                    alternatives: [
                        {
                            patternKind: "cons",
                            headBinderName: "head",
                            tailBinderName: "tail",
                            body: new DamlLfExpression({
                                variableName: "head",
                            }),
                        },
                        {
                            patternKind: "default",
                            body: new DamlLfExpression({
                                textLiteral: "empty",
                            }),
                        },
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "A",
        });
    });

    it("evaluates IMPLODE_TEXT builtin through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "implodeText",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        builtinFunction: "IMPLODE_TEXT",
                    }),
                    arguments: [
                        new DamlLfExpression({
                            listConstruction: {
                                front: [
                                    new DamlLfExpression({
                                        textLiteral: "A",
                                    }),
                                    new DamlLfExpression({
                                        textLiteral: "B",
                                    }),
                                ],
                            },
                        }),
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "AB",
        });
    });

    it("evaluates PARTY_TO_TEXT builtin through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "partyToText",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        builtinFunction: "PARTY_TO_TEXT",
                    }),
                    arguments: [
                        new DamlLfExpression({
                            textLiteral: "Alice::1220",
                        }),
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "Alice::1220",
        });
    });

    it("evaluates FOLDL builtin through application", () => {
        const definition = new DamlLfValueDefinition({
            name: "foldText",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        builtinFunction: "FOLDL",
                    }),
                    arguments: [
                        new DamlLfExpression({
                            lambda: {
                                parameters: ["acc"],
                                body: new DamlLfExpression({
                                    lambda: {
                                        parameters: ["item"],
                                        body: new DamlLfExpression({
                                            application: {
                                                function: new DamlLfExpression({
                                                    builtinFunction: "appendText",
                                                }),
                                                arguments: [
                                                    new DamlLfExpression({
                                                        variableName: "acc",
                                                    }),
                                                    new DamlLfExpression({
                                                        variableName: "item",
                                                    }),
                                                ],
                                            },
                                        }),
                                    },
                                }),
                            },
                        }),
                        new DamlLfExpression({
                            textLiteral: "",
                        }),
                        new DamlLfExpression({
                            listConstruction: {
                                front: [
                                    new DamlLfExpression({
                                        textLiteral: "A",
                                    }),
                                    new DamlLfExpression({
                                        textLiteral: "B",
                                    }),
                                ],
                            },
                        }),
                    ],
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
                                definitions: [definition],
                            }),
                        ],
                    }),
                ]),
            ),
        );

        const value = evaluator.evaluateValueDefinitionOrThrow(definition);

        expect(value).toEqual({
            kind: "text",
            value: "AB",
        });
    });
});
