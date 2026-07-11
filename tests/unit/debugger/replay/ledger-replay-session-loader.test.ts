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
                textLiteral: "archived",
            }),
        });
        const alias = new DamlLfValueDefinition({
            name: "archiveVaultHandler",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
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
        ).toEqual(["archiveVaultHandler", "greeting"]);
        expect(
            session.steps.find((step) => step.phase === "return")?.stackFrames.map(
                (frame) => frame.name,
            ),
        ).toEqual(["archiveVaultHandler", "greeting"]);
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
                (step) => step.stateDelta?.kind === "exercise",
            ),
        ).toBe(true);
        expect(
            session.steps.some(
                (step) => step.stateDelta?.kind === "create",
            ),
        ).toBe(true);
        expect(
            session.steps.some(
                (step) => step.sourceLocation?.startLine === 8,
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

    it("retains exact calls and returns while collapsing repeated exact expressions", async () => {
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
            "call",
            "return",
        ]);
        expect(session.steps.map((step) => step.stepIndex)).toEqual([0, 1, 2]);
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
    const traceExpression = new DamlLfExpression({
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
                                ? { kind: "exercise", choice: "Run" }
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
