import { describe, expect, it } from "vitest";
import {
    DamlLfCompilation,
    DamlLfExpression,
    DamlLfLanguageVersion,
    DamlLfModule,
    DamlLfPackage,
    DamlLfType,
    DamlLfValueDefinition,
    DamlLfWorkspace,
    DarSourceBundleLoader,
} from "../../../../src/daml-lf/index.js";
import { DamlLfEvaluator } from "../../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfRuntimeFrame } from "../../../../src/daml-lf/interpreter/daml-lf-runtime-frame.js";
import { DamlLfStepKind } from "../../../../src/daml-lf/interpreter/daml-lf-step-kind.js";
import { IDamlLfTraceSink } from "../../../../src/daml-lf/interpreter/daml-lf-trace-sink.interface.js";
import { LedgerReplaySessionLoader } from "../../../../src/debugger/replay/ledger-replay-session-loader.js";
import {
    ILedgerReplayEnvironment,
    IReplayTransactionSnapshot,
} from "../../../../src/debugger/replay/ledger-replay-environment-builder.js";
import { ReplayEntrypoint } from "../../../../src/debugger/replay/replay-entrypoint.js";
import { ReplayEntrypointDefinitionResolver } from "../../../../src/debugger/replay/replay-entrypoint-definition-resolver.js";
import { DamlSourceMapper } from "../../../../src/debugger/source/daml-source-mapper.js";
import { SourceIndexedCompilation } from "../../../../src/debugger/source/source-indexed-compilation.js";
import { ReplaySessionRequest } from "../../../../src/debugger/session/replay-session-request.js";
import { createSourceMappedDarFixture } from "../../../fixtures/daml-lf/source-mapped-dar-fixture.js";

describe("LedgerReplaySessionLoader", () => {
    it("attaches source locations from the resolved dar executable mapping", async () => {
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-sample",
                    packageName: "sample",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [
                                new DamlLfValueDefinition({
                                    name: "archiveVaultHandler",
                                    type: new DamlLfType({}),
                                    expression: new DamlLfExpression({
                                        textLiteral: "archived",
                                    }),
                                }),
                            ],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        executables: [
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveVaultHandler",
                                path: "src/Main.daml",
                                startLine: 3,
                                startColumn: 1,
                                endLine: 4,
                                endColumn: 13,
                                precision: "exact",
                                entrypointKind: "exercise",
                                templateName: "Vault",
                                choiceName: "Archive",
                            },
                        ],
                    }),
                ),
            ],
        );
        const snapshot: IReplayTransactionSnapshot = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            events: [
                {
                    event: {
                        oneofKind: "exercised",
                        exercised: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            choiceArgument: {},
                        },
                    },
                },
            ],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
        };
        const environment: ILedgerReplayEnvironment = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            entrypoint: snapshot.entrypoint,
            contracts: new Map(),
            packageIds: ["pkg-sample"],
        };
        const loader = new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return snapshot;
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return environment;
                },
            },
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: {
                validateOrThrow(): void {}
            },
            sessionIdFactory: () => "session-1",
        });

        const session = await loader.loadOrThrowAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(session.steps[0]?.sourceLocation?.path).toBe("src/Main.daml");
        expect(session.steps[0]?.sourceLocation?.startLine).toBe(3);
    });

    it("preserves evaluator call and return phases in replay steps", async () => {
        const greeting = new DamlLfValueDefinition({
            name: "greeting",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                lambda: {
                    parameters: ["value"],
                    body: new DamlLfExpression({
                        variableName: "value",
                    }),
                },
            }),
        });
        const alias = new DamlLfValueDefinition({
            name: "archiveVaultHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: new DamlLfExpression({
                        valueReference: {
                            packageId: "pkg-sample",
                            moduleName: "Main",
                            definitionName: "greeting",
                        },
                        sourceLocation: {
                            startLine: 4,
                            startColumn: 0,
                            endLine: 4,
                            endColumn: 18,
                        },
                    }),
                    arguments: [
                        new DamlLfExpression({
                            textLiteral: "archived",
                        }),
                    ],
                },
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-sample",
                    packageName: "sample",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [greeting, alias],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        executables: [
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveVaultHandler",
                                path: "src/Main.daml",
                                startLine: 3,
                                startColumn: 1,
                                endLine: 4,
                                endColumn: 13,
                                entrypointKind: "exercise",
                                templateName: "Vault",
                                choiceName: "Archive",
                            },
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "greeting",
                                path: "src/Main.daml",
                                startLine: 5,
                                startColumn: 1,
                                endLine: 5,
                                endColumn: 18,
                                precision: "exact",
                            },
                        ],
                    }),
                ),
            ],
        );
        const snapshot: IReplayTransactionSnapshot = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            events: [
                {
                    event: {
                        oneofKind: "exercised",
                        exercised: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            choiceArgument: {},
                        },
                    },
                },
            ],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
        };
        const loader = new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return snapshot;
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint: snapshot.entrypoint,
                        contracts: new Map(),
                        packageIds: ["pkg-sample"],
                    };
                },
            },
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: {
                validateOrThrow(): void {}
            },
            sessionIdFactory: () => "session-2",
        });

        const session = await loader.loadOrThrowAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(session.steps.map((step) => step.phase)).toContain("call");
        expect(session.steps.map((step) => step.phase)).toContain("return");
        expect(
            session.steps.find((step) => step.phase === "call")?.sourceLocation
                ?.startLine,
        ).toBe(5);
        expect(
            session.steps.find((step) => step.phase === "return")?.sourceLocation
                ?.startLine,
        ).toBe(5);
        expect(
            session.steps.find((step) => step.phase === "call")?.stackFrames.map(
                (frame) => frame.name,
            ),
        ).toEqual(["Vault.Archive", "greeting"]);
        expect(
            session.steps.find((step) => step.phase === "return")?.stackFrames.map(
                (frame) => frame.name,
            ),
        ).toEqual(["Vault.Archive", "greeting"]);
    });

    it("labels generated helper frames from the enclosing executable span", async () => {
        const entrypointDefinition = new DamlLfValueDefinition({
            name: "archiveVaultHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "entrypoint",
            }),
        });
        const generatedHelper = new DamlLfValueDefinition({
            name: "$$$$sc_Vault_1",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "helper",
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-sample",
                    packageName: "sample",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [entrypointDefinition, generatedHelper],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        executables: [
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveVaultHandler",
                                path: "src/Main.daml",
                                startLine: 907,
                                startColumn: 1,
                                endLine: 921,
                                endColumn: 43,
                                entrypointKind: "exercise",
                                templateName: "BaseVaultSnapshot",
                                choiceName: "ReportNAV",
                            },
                        ],
                    }),
                ),
            ],
        );
        const snapshot: IReplayTransactionSnapshot = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            events: [],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "BaseVaultSnapshot",
                },
                contractId: "00abc",
                choice: "ReportNAV",
                argument: {},
            }),
        };
        const loader = new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return snapshot;
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint: snapshot.entrypoint,
                        contracts: new Map(),
                        packageIds: ["pkg-sample"],
                    };
                },
            },
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: {
                evaluateReplayEntrypointOrThrow(
                    _definition,
                    _environment,
                    traceSink,
                ) {
                    traceSink?.onStep({
                        kind: DamlLfStepKind.enterExpression,
                        expression: new DamlLfExpression({
                            textLiteral: "helper-body",
                            sourceLocation: {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                startLine: 909,
                                startColumn: 26,
                                endLine: 909,
                                endColumn: 38,
                            },
                        }),
                        frame: new DamlLfRuntimeFrame({
                            frameId: "frame-1",
                            packageId: "pkg-sample",
                            moduleName: "Main",
                            definition: generatedHelper,
                        }),
                        locals: [
                            {
                                name: "bound",
                                value: {
                                    kind: "text",
                                    value: "helper",
                                },
                            },
                        ],
                    });

                    return {
                        value: {
                            kind: "text",
                            value: "done",
                        },
                        effects: [],
                    };
                },
            },
            determinismValidator: {
                validateOrThrow(): void {}
            },
            sessionIdFactory: () => "session-generated-frame",
        });

        const session = await loader.loadOrThrowAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(session.steps[0]?.stackFrames.map((frame) => frame.name)).toEqual([
            "BaseVaultSnapshot.ReportNAV",
        ]);
        expect(session.scopesByStep[0]?.map((scope) => scope.name)).toEqual([
            "BaseVaultSnapshot.ReportNAV",
        ]);
    });

    it("suppresses called definitions that have no source-map entry", async () => {
        const helper = new DamlLfValueDefinition({
            name: "helper",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "archived",
            }),
        });
        const definition = new DamlLfValueDefinition({
            name: "archiveVaultHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                valueReference: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    definitionName: "helper",
                },
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-sample",
                    packageName: "sample",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [helper, definition],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        executables: [
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveVaultHandler",
                                path: "src/Main.daml",
                                startLine: 3,
                                startColumn: 1,
                                endLine: 4,
                                endColumn: 13,
                                entrypointKind: "exercise",
                                templateName: "Vault",
                                choiceName: "Archive",
                            },
                        ],
                    }),
                ),
            ],
        );
        const snapshot: IReplayTransactionSnapshot = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            events: [
                {
                    event: {
                        oneofKind: "exercised",
                        exercised: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            choiceArgument: {},
                        },
                    },
                },
            ],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
        };
        const loader = new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return snapshot;
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint: snapshot.entrypoint,
                        contracts: new Map(),
                        packageIds: ["pkg-sample"],
                    };
                },
            },
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: {
                validateOrThrow(): void {}
            },
            sessionIdFactory: () => "session-2",
        });

        const session = await loader.loadOrThrowAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(
            session.steps.some((step) =>
                step.stackFrames.some((frame) => frame.name === "helper"),
            ),
        ).toBe(false);
    });

    it("projects evaluator locals into replay steps", async () => {
        const definition = new DamlLfValueDefinition({
            name: "archiveVaultHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                letExpression: {
                    bindings: [
                        {
                            name: "greeting",
                            value: new DamlLfExpression({
                                textLiteral: "archived",
                            }),
                        },
                    ],
                    body: new DamlLfExpression({
                        variableName: "greeting",
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
                            definitions: [definition],
                        }),
                    ],
                }),
            ]),
        );
        const session = await new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync() {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
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
                                        choiceArgument: {},
                                    },
                                },
                            },
                        ],
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
                    };
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(snapshot) {
                    return {
                        kind: "transaction",
                        offset: snapshot.offset,
                        actAs: snapshot.actAs ?? [],
                        readAs: snapshot.readAs ?? [],
                        entrypoint: snapshot.entrypoint,
                        contracts: new Map(),
                    };
                },
            },
            definitionResolver: {
                resolveEntrypointDefinitionOrThrow() {
                    return {
                        packageId: "pkg-main",
                        moduleName: "Main",
                        definition,
                    };
                },
            },
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: {
                validateOrThrow() {
                    return undefined;
                },
            },
            sessionIdFactory: () => "session-1",
        }).loadOrThrowAsync(new ReplaySessionRequest({ offset: "42" }));

        expect(
            session.steps.some((step) =>
                step.locals.some(
                    (local) =>
                        typeof local === "object"
                        && local !== null
                        && "name" in local
                        && "value" in local
                        && local.name === "greeting"
                        && local.value === "archived",
                ),
            ),
        ).toBe(true);
        expect(
            session.steps.some((step) =>
                step.scopes.some(
                    (scope) =>
                        scope.frameId !== undefined
                        && scope.variables.some(
                            (local) =>
                                typeof local === "object"
                                && local !== null
                                && "name" in local
                                && "value" in local
                                && local.name === "greeting"
                                && local.value === "archived",
                        ),
                ),
            ),
        ).toBe(true);
    });

    it("replays nested exercise choice bodies through the session loader", async () => {
        const archiveMirrorHandler = new DamlLfValueDefinition({
            name: "archiveMirrorHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                recordConstruction: {
                    fields: [
                        {
                            name: "m_exercise",
                            value: new DamlLfExpression({
                                lambda: {
                                    parameters: ["self", "choiceArg"],
                                    body: new DamlLfExpression({
                                        updateExpression: {
                                            kind: "create",
                                            templateId: {
                                                packageId: "pkg-sample",
                                                moduleName: "Main",
                                                templateName: "Audit",
                                            },
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
                                                                recordProjection: {
                                                                    fieldName: "note",
                                                                    record: new DamlLfExpression({
                                                                        variableName: "choiceArg",
                                                                    }),
                                                                },
                                                            }),
                                                        },
                                                    ],
                                                },
                                            }),
                                        },
                                    }),
                                },
                            }),
                        },
                    ],
                },
            }),
        });
        const archiveVaultRoot = new DamlLfValueDefinition({
            name: "archiveVaultRoot",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                recordConstruction: {
                    fields: [
                        {
                            name: "m_exercise",
                            value: new DamlLfExpression({
                                lambda: {
                                    parameters: ["_", "this", "arg"],
                                    body: new DamlLfExpression({
                                        updateExpression: {
                                            kind: "exercise",
                                            templateId: {
                                                packageId: "pkg-sample",
                                                moduleName: "Main",
                                                templateName: "MirrorVault",
                                            },
                                            choiceName: "ArchiveMirror",
                                            contractId: new DamlLfExpression({
                                                variableName: "this",
                                            }),
                                            argument: new DamlLfExpression({
                                                variableName: "arg",
                                            }),
                                        },
                                    }),
                                },
                            }),
                        },
                    ],
                },
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-sample",
                    packageName: "sample",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [archiveVaultRoot, archiveMirrorHandler],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        executables: [
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveVaultRoot",
                                path: "src/Main.daml",
                                startLine: 3,
                                startColumn: 1,
                                endLine: 6,
                                endColumn: 20,
                                entrypointKind: "exercise",
                                templateName: "Vault",
                                choiceName: "Archive",
                            },
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveMirrorHandler",
                                path: "src/Main.daml",
                                startLine: 8,
                                startColumn: 1,
                                endLine: 12,
                                endColumn: 20,
                                entrypointKind: "exercise",
                                templateName: "MirrorVault",
                                choiceName: "ArchiveMirror",
                            },
                        ],
                    }),
                ),
            ],
        );
        const snapshot: IReplayTransactionSnapshot = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            events: [
                {
                    event: {
                        oneofKind: "exercised",
                        exercised: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            choiceArgument: {
                                note: "nested",
                            },
                        },
                    },
                },
            ],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {
                    note: "nested",
                },
            }),
        };
        const loader = new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return snapshot;
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint: snapshot.entrypoint,
                        contracts: new Map([
                            [
                                "00abc",
                                {
                                    contractId: "00abc",
                                    payload: {
                                        owner: "Alice",
                                    },
                                    history: {},
                                },
                            ],
                            [
                                "00def",
                                {
                                    contractId: "00def",
                                    payload: {
                                        owner: "Bob",
                                    },
                                    history: {},
                                },
                            ],
                        ]),
                        packageIds: ["pkg-sample"],
                    };
                },
            },
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: {
                validateOrThrow(): void {}
            },
            sessionIdFactory: () => "session-nested",
        });

        const session = await loader.loadOrThrowAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(
            session.steps.some(
                (step) =>
                    step.stateDelta?.kind === "exercise"
                    && step.stateDelta.targetContractId === "00abc",
            ),
        ).toBe(true);
        expect(
            session.steps.some(
                (step) =>
                    step.stateDelta?.kind === "create"
                    && step.stateDelta.createdContractId !== undefined
                    && step.stateDelta.templateId?.entityName === "Audit",
            ),
        ).toBe(true);
        expect(
            session.steps.some(
                (step) => step.sourceLocation?.startLine === 8,
            ),
        ).toBe(true);
        expect(
            session.steps.some((step) =>
                step.stackFrames.some(
                    (frame) => frame.name === "Vault.Archive",
                ),
            ),
        ).toBe(true);
        expect(
            session.steps.some((step) =>
                step.stackFrames.some(
                    (frame) => frame.name === "MirrorVault.ArchiveMirror",
                ),
            ),
        ).toBe(true);
    });

    it("renders empty text values in step previews without aborting session loading", async () => {
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-sample",
                    packageName: "sample",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [
                                new DamlLfValueDefinition({
                                    name: "archiveVaultHandler",
                                    type: new DamlLfType({}),
                                    expression: new DamlLfExpression({
                                        textLiteral: "",
                                    }),
                                }),
                            ],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        executables: [
                            {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                definitionName: "archiveVaultHandler",
                                path: "src/Main.daml",
                                startLine: 3,
                                startColumn: 1,
                                endLine: 3,
                                endColumn: 18,
                                precision: "exact",
                                entrypointKind: "exercise",
                                templateName: "Vault",
                                choiceName: "Archive",
                            },
                        ],
                    }),
                ),
            ],
        );
        const snapshot: IReplayTransactionSnapshot = {
            kind: "transaction",
            offset: "42",
            actAs: ["Alice"],
            readAs: [],
            events: [
                {
                    event: {
                        oneofKind: "exercised",
                        exercised: {
                            contractId: "00abc",
                            templateId: {
                                packageId: "pkg-sample",
                                moduleName: "Main",
                                entityName: "Vault",
                            },
                            choice: "Archive",
                            choiceArgument: {},
                        },
                    },
                },
            ],
            entrypoint: new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
        };
        const loader = new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return snapshot;
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint: snapshot.entrypoint,
                        contracts: new Map(),
                        packageIds: ["pkg-sample"],
                    };
                },
            },
            definitionResolver: new ReplayEntrypointDefinitionResolver(
                indexedCompilation,
            ),
            evaluator: new DamlLfEvaluator(compilation),
            determinismValidator: {
                validateOrThrow(): void {}
            },
            sessionIdFactory: () => "session-empty-text",
        });

        const session = await loader.loadOrThrowAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(
            session.steps.some((step) => step.valuePreview?.display === "\"\""),
        ).toBe(true);
    });

    it("suppresses fallback-only expression and call events", async () => {
        const session = await loadControlledTraceAsync("fallback", [
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.call,
            DamlLfStepKind.return,
            DamlLfStepKind.exitExpression,
        ]);

        expect(session.steps).toEqual([]);
    });

    it("retains a ledger effect with fallback source and latest locals", async () => {
        const session = await loadControlledTraceAsync("fallback", [
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.stateEffect,
        ]);

        expect(session.steps).toHaveLength(1);
        expect(session.steps[0]?.phase).toBe("stateEffect");
        expect(session.steps[0]?.sourceLocation?.precision).toBe("fallback");
        expect(session.steps[0]?.locals).toEqual([
            expect.objectContaining({ name: "value", value: "after" }),
        ]);
    });

    it("projects ledger effect details onto retained state-effect steps", async () => {
        const session = await loadControlledTraceAsync(
            "exact",
            [DamlLfStepKind.enterExpression, DamlLfStepKind.stateEffect],
            undefined,
            undefined,
            {
                kind: "exercise",
                contractId: "00exercise",
                templateId: {
                    packageId: "pkg-controlled",
                    moduleName: "Main",
                    entityName: "Controlled",
                },
                choice: "Run",
                argument: {
                    amount: "12.0",
                },
            },
        );

        expect(session.steps.map((step) => step.phase)).toEqual([
            "stateEffect",
        ]);
        expect(session.steps[0]?.stateDelta).toEqual(
            expect.objectContaining({
                kind: "exercise",
                eventOrdinal: 0,
                comparisonKey: "event-0",
                targetContractId: "00exercise",
                templateId: {
                    packageId: "pkg-controlled",
                    moduleName: "Main",
                    entityName: "Controlled",
                },
                choice: "Run",
                choiceArgument: {
                    amount: "12.0",
                },
            }),
        );
    });

    it("retains exact calls, returns, and visible local changes on exact expressions", async () => {
        const session = await loadControlledTraceAsync("exact", [
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.exitExpression,
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.call,
            DamlLfStepKind.return,
        ], {
            startLine: 2,
            startColumn: 0,
            endLine: 2,
            endColumn: 24,
        });

        expect(session.steps.map((step) => step.phase)).toEqual([
            "enterExpression",
            "exitExpression",
            "enterExpression",
            "call",
            "return",
        ]);
        expect(session.steps.map((step) => step.stepIndex)).toEqual([0, 1, 2, 3, 4]);
    });

    it("collapses same-line exact expressions when stack and locals do not change", async () => {
        const definition = new DamlLfValueDefinition({
            name: "controlledTrace",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({ textLiteral: "ignored" }),
        });
        const helper = new DamlLfValueDefinition({
            name: "helper",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({ textLiteral: "helper" }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-controlled",
                    packageName: "controlled",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [definition, helper],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-controlled",
                        definitionName: "controlledTrace",
                        executables: [
                            {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                definitionName: "controlledTrace",
                                path: "src/Main.daml",
                                startLine: 10,
                                startColumn: 1,
                                endLine: 10,
                                endColumn: 50,
                                precision: "exact",
                            },
                        ],
                    }),
                ),
            ],
        );
        const entrypoint = new ReplayEntrypoint({
            kind: "exercise",
            templateId: {
                packageId: "pkg-controlled",
                moduleName: "Main",
                entityName: "Controlled",
            },
            contractId: "00controlled",
            choice: "Run",
            argument: {},
        });
        const frame = new DamlLfRuntimeFrame({
            frameId: "controlled-frame",
            packageId: "pkg-controlled",
            moduleName: "Main",
            definition,
        });
        const helperFrame = new DamlLfRuntimeFrame({
            frameId: "helper-frame",
            packageId: "pkg-controlled",
            moduleName: "Main",
            definition: helper,
        });

        const session = await new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        events: [],
                        entrypoint,
                    };
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint,
                        contracts: new Map(),
                        packageIds: ["pkg-controlled"],
                    };
                },
            },
            definitionResolver: {
                resolveEntrypointDefinitionOrThrow() {
                    return {
                        packageId: "pkg-controlled",
                        moduleName: "Main",
                        definition,
                    };
                },
            },
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: {
                evaluateReplayEntrypointOrThrow(
                    _definition: DamlLfValueDefinition,
                    _environment: ILedgerReplayEnvironment,
                    traceSink?: IDamlLfTraceSink,
                ) {
                    for (const step of [
                        {
                            frame,
                            expression: new DamlLfExpression({
                                textLiteral: "ignored-1",
                                sourceLocation: {
                                    packageId: "pkg-controlled",
                                    moduleName: "Main",
                                    startLine: 9,
                                    startColumn: 0,
                                    endLine: 9,
                                    endColumn: 10,
                                },
                            }),
                            locals: [{ name: "value", value: { kind: "text", value: "same" } }],
                        },
                        {
                            frame,
                            expression: new DamlLfExpression({
                                textLiteral: "ignored-2",
                                sourceLocation: {
                                    packageId: "pkg-controlled",
                                    moduleName: "Main",
                                    startLine: 9,
                                    startColumn: 11,
                                    endLine: 9,
                                    endColumn: 20,
                                },
                            }),
                            locals: [{ name: "value", value: { kind: "text", value: "same" } }],
                        },
                        {
                            frame: helperFrame,
                            expression: new DamlLfExpression({
                                textLiteral: "ignored-3",
                                sourceLocation: {
                                    packageId: "pkg-controlled",
                                    moduleName: "Main",
                                    startLine: 9,
                                    startColumn: 21,
                                    endLine: 9,
                                    endColumn: 30,
                                },
                            }),
                            locals: [],
                        },
                    ] as const) {
                        traceSink?.onStep({
                            kind: DamlLfStepKind.enterExpression,
                            expression: step.expression,
                            frame: step.frame,
                            locals: step.locals,
                        });
                    }

                    return {
                        value: { kind: "unit", value: {} },
                        effects: [],
                    };
                },
            },
            determinismValidator: {
                validateOrThrow(): void {},
            },
            sessionIdFactory: () => "same-line-collapse",
        }).loadOrThrowAsync(new ReplaySessionRequest({ offset: "42" }));

        expect(session.steps.map((step) => step.sourceLocation?.startColumn)).toEqual([
            1,
            22,
        ]);
        expect(session.steps.map((step) => step.stackFrames.length)).toEqual([
            1,
            2,
        ]);
    });

    it("suppresses pure value-reference reads and constant-definition transitions", async () => {
        const entrypoint = new DamlLfValueDefinition({
            name: "entrypoint",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({ textLiteral: "entrypoint" }),
        });
        const helper = new DamlLfValueDefinition({
            name: "helper",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                valueReference: {
                    packageId: "pkg-controlled",
                    moduleName: "Main",
                    definitionName: "constantText",
                },
            }),
        });
        const constantText = new DamlLfValueDefinition({
            name: "constantText",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "constant",
            }),
        });
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "pkg-controlled",
                    packageName: "controlled",
                    packageVersion: "1.0.0",
                    languageVersion: new DamlLfLanguageVersion({
                        major: 2,
                        minor: "dev",
                        patch: 0,
                    }),
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [entrypoint, helper, constantText],
                        }),
                    ],
                }),
            ]),
        );
        const indexedCompilation = SourceIndexedCompilation.createOrThrow(
            compilation,
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-controlled",
                        executables: [
                            {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                definitionName: "entrypoint",
                                path: "src/Main.daml",
                                startLine: 10,
                                startColumn: 1,
                                endLine: 10,
                                endColumn: 50,
                                precision: "exact",
                                entrypointKind: "exercise",
                                templateName: "Controlled",
                                choiceName: "Run",
                            },
                            {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                definitionName: "helper",
                                path: "src/Main.daml",
                                startLine: 10,
                                startColumn: 10,
                                endLine: 10,
                                endColumn: 30,
                                precision: "exact",
                            },
                            {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                definitionName: "constantText",
                                path: "src/Main.daml",
                                startLine: 5,
                                startColumn: 1,
                                endLine: 5,
                                endColumn: 20,
                                precision: "exact",
                            },
                        ],
                    }),
                ),
            ],
        );
        const entrypointFrame = new DamlLfRuntimeFrame({
            frameId: "entry-frame",
            packageId: "pkg-controlled",
            moduleName: "Main",
            definition: entrypoint,
        });
        const helperFrame = new DamlLfRuntimeFrame({
            frameId: "helper-frame",
            packageId: "pkg-controlled",
            moduleName: "Main",
            definition: helper,
        });
        const constantFrame = new DamlLfRuntimeFrame({
            frameId: "const-frame",
            packageId: "pkg-controlled",
            moduleName: "Main",
            definition: constantText,
        });

        const session = await new LedgerReplaySessionLoader({
            updateLoader: {
                async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        events: [],
                        entrypoint: new ReplayEntrypoint({
                            kind: "exercise",
                            templateId: {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                entityName: "Controlled",
                            },
                            contractId: "00controlled",
                            choice: "Run",
                            argument: {},
                        }),
                    };
                },
            },
            environmentBuilder: {
                async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                    return {
                        kind: "transaction",
                        offset: "42",
                        actAs: ["Alice"],
                        readAs: [],
                        entrypoint: new ReplayEntrypoint({
                            kind: "exercise",
                            templateId: {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                entityName: "Controlled",
                            },
                            contractId: "00controlled",
                            choice: "Run",
                            argument: {},
                        }),
                        contracts: new Map(),
                        packageIds: ["pkg-controlled"],
                    };
                },
            },
            definitionResolver: {
                resolveEntrypointDefinitionOrThrow() {
                    return {
                        packageId: "pkg-controlled",
                        moduleName: "Main",
                        definition: entrypoint,
                    };
                },
            },
            sourceMapper: new DamlSourceMapper(indexedCompilation),
            evaluator: {
                evaluateReplayEntrypointOrThrow(
                    _definition: DamlLfValueDefinition,
                    _environment: ILedgerReplayEnvironment,
                    traceSink?: IDamlLfTraceSink,
                ) {
                    const helperReference = new DamlLfExpression({
                        valueReference: {
                            packageId: "pkg-controlled",
                            moduleName: "Main",
                            definitionName: "helper",
                        },
                        sourceLocation: {
                            packageId: "pkg-controlled",
                            moduleName: "Main",
                            startLine: 9,
                            startColumn: 0,
                            endLine: 9,
                            endColumn: 30,
                        },
                    });
                    const constantReference = new DamlLfExpression({
                        valueReference: {
                            packageId: "pkg-controlled",
                            moduleName: "Main",
                            definitionName: "constantText",
                        },
                        sourceLocation: {
                            packageId: "pkg-controlled",
                            moduleName: "Main",
                            startLine: 9,
                            startColumn: 9,
                            endLine: 9,
                            endColumn: 29,
                        },
                    });

                    traceSink?.onStep({
                        kind: DamlLfStepKind.enterExpression,
                        expression: new DamlLfExpression({
                            application: {
                                function: helperReference,
                                arguments: [],
                            },
                            sourceLocation: {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                startLine: 9,
                                startColumn: 0,
                                endLine: 9,
                                endColumn: 30,
                            },
                        }),
                        frame: entrypointFrame,
                        locals: [],
                    });
                    traceSink?.onStep({
                        kind: DamlLfStepKind.enterExpression,
                        expression: helperReference,
                        frame: helperFrame,
                        locals: [],
                    });
                    traceSink?.onStep({
                        kind: DamlLfStepKind.call,
                        expression: constantReference,
                        frame: constantFrame,
                        locals: [],
                    });
                    traceSink?.onStep({
                        kind: DamlLfStepKind.enterExpression,
                        expression: new DamlLfExpression({
                            textLiteral: "constant",
                            sourceLocation: {
                                packageId: "pkg-controlled",
                                moduleName: "Main",
                                startLine: 4,
                                startColumn: 0,
                                endLine: 4,
                                endColumn: 19,
                            },
                        }),
                        frame: constantFrame,
                        locals: [],
                    });
                    traceSink?.onStep({
                        kind: DamlLfStepKind.return,
                        expression: constantReference,
                        frame: constantFrame,
                        locals: [],
                        value: {
                            kind: "text",
                            value: "constant",
                        },
                    });
                    traceSink?.onStep({
                        kind: DamlLfStepKind.exitExpression,
                        expression: helperReference,
                        frame: helperFrame,
                        locals: [],
                        value: {
                            kind: "text",
                            value: "constant",
                        },
                    });

                    return {
                        value: { kind: "unit", value: {} },
                        effects: [],
                    };
                },
            },
            determinismValidator: {
                validateOrThrow(): void {},
            },
            sessionIdFactory: () => "constant-read-filter",
        }).loadOrThrowAsync(new ReplaySessionRequest({ offset: "42" }));

        expect(session.steps.map((step) => step.phase)).toEqual([
            "enterExpression",
        ]);
        expect(session.steps[0]?.sourceLocation).toEqual(
            expect.objectContaining({
                startLine: 10,
                startColumn: 1,
                endLine: 10,
                endColumn: 31,
            }),
        );
    });

    it("suppresses definition-only non-state events without native LF locations", async () => {
        const session = await loadControlledTraceAsync("exact", [
            DamlLfStepKind.enterExpression,
            DamlLfStepKind.call,
            DamlLfStepKind.return,
            DamlLfStepKind.exitExpression,
        ]);

        expect(session.steps).toEqual([]);
    });

    it("uses compiler expression-location sidecar entries when LF omits a location", async () => {
        const session = await loadControlledTraceAsync(
            "exact",
            [DamlLfStepKind.enterExpression],
            undefined,
            [
                {
                    packageId: "pkg-controlled",
                    moduleName: "Main",
                    definitionName: "controlledTrace",
                    expressionPath: [],
                    path: "src/Main.daml",
                    startLine: 868,
                    startColumn: 8,
                    endLine: 868,
                    endColumn: 54,
                },
            ],
        );

        expect(session.steps).toHaveLength(1);
        expect(session.steps[0]?.sourceLocation).toEqual(
            expect.objectContaining({
                path: "src/Main.daml",
                startLine: 869,
                startColumn: 9,
                endLine: 869,
                endColumn: 55,
                precision: "exact",
            }),
        );
    });

    it("uses the native LF expression location ahead of fallback definition metadata", async () => {
        const session = await loadControlledTraceAsync(
            "fallback",
            [DamlLfStepKind.enterExpression],
            {
                startLine: 540,
                startColumn: 8,
                endLine: 540,
                endColumn: 32,
            },
        );

        expect(session.steps).toHaveLength(1);
        expect(session.steps[0]?.sourceLocation).toEqual(
            expect.objectContaining({
                path: "src/Main.daml",
                startLine: 541,
                startColumn: 9,
                endLine: 541,
                endColumn: 33,
                precision: "exact",
            }),
        );
    });
});

async function loadControlledTraceAsync(
    precision: "exact" | "fallback",
    kinds: readonly DamlLfStepKind[],
    expressionSourceLocation?: {
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    },
    expressionLocations?: readonly {
        packageId: string;
        moduleName: string;
        definitionName: string;
        expressionPath: readonly number[];
        path: string;
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    }[],
    stateEffectOverride?: {
        kind: "create" | "exercise" | "archive" | "fetch" | "lookup";
        contractId?: string;
        templateId?: {
            packageId?: string;
            moduleName?: string;
            entityName?: string;
        };
        choice?: string;
        argument?: unknown;
        payload?: unknown;
    },
) {
    const definition = new DamlLfValueDefinition({
        name: "controlledTrace",
        type: new DamlLfType({}),
        expression: new DamlLfExpression({ textLiteral: "ignored" }),
    });
    const compilation = DamlLfCompilation.createOrThrow(
        new DamlLfWorkspace([
            new DamlLfPackage({
                packageId: "pkg-controlled",
                packageName: "controlled",
                packageVersion: "1.0.0",
                languageVersion: new DamlLfLanguageVersion({
                    major: 2,
                    minor: "dev",
                    patch: 0,
                }),
                modules: [
                    new DamlLfModule({
                        name: "Main",
                        definitions: [definition],
                    }),
                ],
            }),
        ]),
    );
    const indexedCompilation = SourceIndexedCompilation.createOrThrow(
        compilation,
        [
            await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                createSourceMappedDarFixture({
                    packageId: "pkg-controlled",
                    definitionName: "controlledTrace",
                    executables: [
                        {
                            packageId: "pkg-controlled",
                            moduleName: "Main",
                            definitionName: "controlledTrace",
                            path: "src/Main.daml",
                            startLine: 3,
                            startColumn: 1,
                            endLine: 3,
                            endColumn: 25,
                            precision,
                        },
                    ],
                    expressionLocations,
                }),
            ),
        ],
    );
    const entrypoint = new ReplayEntrypoint({
        kind: "exercise",
        templateId: {
            packageId: "pkg-controlled",
            moduleName: "Main",
            entityName: "Controlled",
        },
        contractId: "00controlled",
        choice: "Run",
        argument: {},
    });
    const frame = new DamlLfRuntimeFrame({
        frameId: "controlled-frame",
        packageId: "pkg-controlled",
        moduleName: "Main",
        definition,
    });
    const traceExpression =
        expressionSourceLocation === undefined
            ? definition.expression
            : new DamlLfExpression({
                  textLiteral: "ignored",
                  sourceLocation: expressionSourceLocation,
              });

    return new LedgerReplaySessionLoader({
        updateLoader: {
            async loadOrThrowAsync(): Promise<IReplayTransactionSnapshot> {
                return {
                    kind: "transaction",
                    offset: "42",
                    actAs: ["Alice"],
                    readAs: [],
                    events: [],
                    entrypoint,
                };
            },
        },
        environmentBuilder: {
            async buildOrThrowAsync(): Promise<ILedgerReplayEnvironment> {
                return {
                    kind: "transaction",
                    offset: "42",
                    actAs: ["Alice"],
                    readAs: [],
                    entrypoint,
                    contracts: new Map(),
                    packageIds: ["pkg-controlled"],
                };
            },
        },
        definitionResolver: {
            resolveEntrypointDefinitionOrThrow() {
                return {
                    packageId: "pkg-controlled",
                    moduleName: "Main",
                    definition,
                };
            },
        },
        sourceMapper: new DamlSourceMapper(indexedCompilation),
        evaluator: {
            evaluateReplayEntrypointOrThrow(
                _definition: DamlLfValueDefinition,
                _environment: ILedgerReplayEnvironment,
                traceSink?: IDamlLfTraceSink,
            ) {
                for (const [index, kind] of kinds.entries()) {
                    traceSink?.onStep({
                        kind,
                        expression: traceExpression,
                        frame,
                        locals: [
                            {
                                name: "value",
                                value: {
                                    kind: "text",
                                    value:
                                        kind === DamlLfStepKind.stateEffect
                                            ? "after"
                                            : `before-${index}`,
                                },
                            },
                        ],
                        stateEffect:
                            kind === DamlLfStepKind.stateEffect
                                ? (stateEffectOverride ?? {
                                      kind: "exercise",
                                      choice: "Run",
                                  })
                                : undefined,
                    });
                }

                return {
                    value: { kind: "unit", value: {} },
                    effects: [],
                };
            },
        },
        determinismValidator: {
            validateOrThrow(): void {},
        },
        sessionIdFactory: () => "controlled-session",
    }).loadOrThrowAsync(new ReplaySessionRequest({ offset: "42" }));
}
