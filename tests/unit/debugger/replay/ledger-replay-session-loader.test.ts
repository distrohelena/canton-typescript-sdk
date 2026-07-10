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
        expect(
            session.steps
                .filter((step) => step.phase === "exitExpression")
                .at(-1)
                ?.stackFrames.map((frame) => frame.name),
        ).toEqual(["archiveVaultHandler"]);
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
});
