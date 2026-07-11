import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import { DamlLfDataType } from "../../../src/daml-lf/model/daml-lf-data-type.js";
import { DamlLfEvaluator } from "../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import {
    DAML_LF_CONTRACT_ID_MARKER_KEY,
    DAML_LF_RECORD_ID_MARKER_KEY,
} from "../../../src/daml-lf/interpreter/daml-lf-runtime-value.js";
import { DamlLfStepKind } from "../../../src/daml-lf/interpreter/daml-lf-step-kind.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
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

    it("binds replay environment values into entrypoint lambda parameters", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self", "choiceArg"],
                    body: new DamlLfExpression({
                        variableName: "choiceArg",
                    }),
                },
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
        const seenLocals: { name: string; value: string }[][] = [];

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
                    argument: "archived",
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
            },
            {
                onStep(step) {
                    seenLocals.push(
                        step.locals.map((local) => ({
                            name: local.name,
                            value:
                                "value" in local.value
                                    ? JSON.stringify(local.value.value)
                                    : local.value.kind,
                        })),
                    );
                },
            },
        );

        expect(result.value).toEqual({
            kind: "text",
            value: "archived",
        });
        expect(seenLocals.some((locals) =>
            locals.some(
                (local) =>
                    local.name === "self"
                    && local.value === JSON.stringify({ owner: "Alice" }),
            ),
        )).toBe(true);
        expect(seenLocals.some((locals) =>
            locals.some(
                (local) =>
                    local.name === "choiceArg"
                    && local.value === JSON.stringify("archived"),
            ),
        )).toBe(true);
    });

    it("projects fields from hydrated contract payloads", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self"],
                    body: new DamlLfExpression({
                        recordProjection: {
                            fieldName: "owner",
                            record: new DamlLfExpression({
                                variableName: "self",
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
            },
        );

        expect(result.value).toEqual({
            kind: "text",
            value: "Alice",
        });
    });

    it("preserves int64 semantics when projecting ledger-backed record fields", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self"],
                    body: new DamlLfExpression({
                        application: {
                            function: new DamlLfExpression({
                                builtinFunction: "ADD_INT64",
                            }),
                            arguments: [
                                new DamlLfExpression({
                                    recordProjection: {
                                        fieldName: "snapshotSequence",
                                        record: new DamlLfExpression({
                                            variableName: "self",
                                        }),
                                    },
                                }),
                                new DamlLfExpression({
                                    int64Literal: "1",
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
                                name: "Main",
                                definitions: [
                                    new DamlLfDataType({
                                        name: "Vault",
                                        fields: [
                                            new DamlLfField({
                                                name: "snapshotSequence",
                                                type: new DamlLfType({
                                                    builtinType: "int64" as never,
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
                                snapshotSequence: "3",
                                [DAML_LF_RECORD_ID_MARKER_KEY]: {
                                    packageId: "pkg-main",
                                    moduleName: "Main",
                                    entityName: "Vault",
                                },
                            },
                            history: {},
                        },
                    ],
                ]),
                packageIds: ["pkg-main"],
            },
        );

        expect(result.value).toEqual({
            kind: "int64",
            value: "4",
        });
    });

    it("evaluates fetch update expressions against hydrated contracts", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["selfCid"],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "fetch",
                            templateId: new DamlLfTemplateId({
                                packageId: "pkg-main",
                                moduleName: "Main",
                                templateName: "Vault",
                            }),
                            contractId: new DamlLfExpression({
                                variableName: "selfCid",
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
            },
            {
                onStep(step) {
                    steps.push(step.kind);
                },
            },
        );

        expect(result.effects).toEqual([
            {
                kind: "fetch",
                contractId: "00abc",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
            },
        ]);
        expect(result.value).toEqual({
            kind: "ledgerValue",
            value: {
                owner: "Alice",
            },
        });
        expect(steps).toContain(DamlLfStepKind.stateEffect);
    });

    it("evaluates fetch update expressions from projected contract-id fields", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self"],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "fetch",
                            templateId: new DamlLfTemplateId({
                                packageId: "pkg-main",
                                moduleName: "Main",
                                templateName: "Vault",
                            }),
                            contractId: new DamlLfExpression({
                                recordProjection: {
                                    fieldName: "linkedCid",
                                    record: new DamlLfExpression({
                                        variableName: "self",
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
                                linkedCid: {
                                    [DAML_LF_CONTRACT_ID_MARKER_KEY]: "00def",
                                },
                            },
                            history: {},
                        },
                    ],
                    [
                        "00def",
                        {
                            contractId: "00def",
                            templateId: {
                                packageId: "pkg-main",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            payload: {
                                owner: "Bob",
                            },
                            history: {},
                        },
                    ],
                ]),
                packageIds: ["pkg-main"],
            },
        );

        expect(result.effects).toEqual([
            {
                kind: "fetch",
                contractId: "00def",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
            },
        ]);
        expect(result.value).toEqual({
            kind: "ledgerValue",
            value: {
                owner: "Bob",
            },
        });
    });

    it("evaluates create update expressions and emits created state effects", () => {
        const definition = new DamlLfValueDefinition({
            name: "CreateVault",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                updateExpression: {
                    kind: "create",
                    templateId: new DamlLfTemplateId({
                        packageId: "pkg-main",
                        moduleName: "Main",
                        templateName: "Vault",
                    }),
                    argument: new DamlLfExpression({
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
                kind: "transaction",
                offset: "42",
                actAs: ["Alice"],
                readAs: [],
                entrypoint: new ReplayEntrypoint({
                    kind: "create",
                    templateId: {
                        packageId: "pkg-main",
                        moduleName: "Main",
                        entityName: "Vault",
                    },
                    argument: {
                        owner: "Alice",
                    },
                }),
                contracts: new Map(),
                packageIds: ["pkg-main"],
            },
        );

        expect(result.effects).toEqual([
            {
                kind: "create",
                contractId: "created-1",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                payload: {
                    owner: "Alice",
                },
            },
        ]);
        expect(result.value).toEqual({
            kind: "contractId",
            value: "created-1",
        });
    });

    it("emits semantic field names for created payloads built from positional records", () => {
        const definition = new DamlLfValueDefinition({
            name: "CreateVault",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                updateExpression: {
                    kind: "create",
                    templateId: new DamlLfTemplateId({
                        packageId: "pkg-main",
                        moduleName: "Main",
                        templateName: "Vault",
                    }),
                    argument: new DamlLfExpression({
                        recordConstruction: {
                            fields: [
                                {
                                    name: "0",
                                    value: new DamlLfExpression({
                                        textLiteral: "Alice",
                                    }),
                                },
                                {
                                    name: "1",
                                    value: new DamlLfExpression({
                                        textLiteral: "1.0000000000",
                                    }),
                                },
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
                                name: "Main",
                                definitions: [
                                    new DamlLfDataType({
                                        name: "Vault",
                                        fields: [
                                            new DamlLfField({
                                                name: "owner",
                                                type: new DamlLfType({}),
                                            }),
                                            new DamlLfField({
                                                name: "amount",
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
                kind: "transaction",
                offset: "42",
                actAs: ["Alice"],
                readAs: [],
                entrypoint: new ReplayEntrypoint({
                    kind: "create",
                    templateId: {
                        packageId: "pkg-main",
                        moduleName: "Main",
                        entityName: "Vault",
                    },
                    argument: {
                        owner: "Alice",
                        amount: "1.0000000000",
                    },
                }),
                contracts: new Map(),
                packageIds: ["pkg-main"],
            },
        );

        expect(result.effects).toEqual([
            {
                kind: "create",
                contractId: "created-1",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                payload: {
                    owner: "Alice",
                    amount: "1.0000000000",
                },
            },
        ]);
    });

    it("retains the top-level exercise effect for template-choice replay bodies", () => {
        const definition = new DamlLfValueDefinition({
            name: "Archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self", "this", "choiceArg"],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "create",
                            templateId: new DamlLfTemplateId({
                                packageId: "pkg-main",
                                moduleName: "Main",
                                templateName: "Audit",
                            }),
                            argument: new DamlLfExpression({
                                variableName: "choiceArg",
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

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
                    argument: {
                        note: "archived",
                    },
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
                entrypointExpression: definition.expression,
                entrypointBindingMode: "templateChoice",
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
                argument: {
                    note: "archived",
                },
            },
            {
                kind: "create",
                contractId: "created-1",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Audit",
                },
                payload: {
                    note: "archived",
                },
            },
        ]);
    });

    it("evaluates exercise update expressions through nested choice definitions", () => {
        const archiveChoiceDefinition = new DamlLfValueDefinition({
            name: "archiveVaultChoice",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self", "choiceArg"],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "create",
                            templateId: new DamlLfTemplateId({
                                packageId: "pkg-main",
                                moduleName: "Main",
                                templateName: "Audit",
                            }),
                            argument: new DamlLfExpression({
                                recordConstruction: {
                                    fields: [
                                        {
                                            name: "owner",
                                            value: new DamlLfExpression({
                                                recordProjection: {
                                                    fieldName: "owner",
                                                    record: new DamlLfExpression({
                                                        variableName: "self",
                                                    }),
                                                },
                                            }),
                                        },
                                        {
                                            name: "note",
                                            value: new DamlLfExpression({
                                                variableName: "choiceArg",
                                            }),
                                        },
                                    ],
                                },
                            }),
                        },
                    }),
                },
            }),
        });
        const definition = new DamlLfValueDefinition({
            name: "ArchiveRoot",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["self", "choiceArg"],
                    body: new DamlLfExpression({
                        updateExpression: {
                            kind: "exercise",
                            templateId: new DamlLfTemplateId({
                                packageId: "pkg-main",
                                moduleName: "Main",
                                templateName: "Vault",
                            }),
                            choiceName: "Archive",
                            contractId: new DamlLfExpression({
                                variableName: "self",
                            }),
                            argument: new DamlLfExpression({
                                variableName: "choiceArg",
                            }),
                        },
                    }),
                },
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
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
                            name: "Main",
                            definitions: [definition, archiveChoiceDefinition],
                        }),
                    ],
                }),
            ]),
        );
        const evaluator = new DamlLfEvaluator(compilation);

        const result = evaluator.evaluateReplayEntrypointOrThrow(
            definition,
            {
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
                    argument: "archived",
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
                definitionResolver: {
                    resolveChoiceDefinitionOrThrow() {
                        return {
                            packageId: "pkg-main",
                            moduleName: "Main",
                            definition: archiveChoiceDefinition,
                            replayExpression: archiveChoiceDefinition.expression,
                        };
                    },
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
                argument: "archived",
            },
            {
                kind: "create",
                contractId: "created-1",
                templateId: {
                    packageId: "pkg-main",
                    moduleName: "Main",
                    entityName: "Audit",
                },
                payload: {
                    owner: "Alice",
                    note: "archived",
                },
            },
        ]);
        expect(result.value).toEqual({
            kind: "contractId",
            value: "created-1",
        });
    });
});
