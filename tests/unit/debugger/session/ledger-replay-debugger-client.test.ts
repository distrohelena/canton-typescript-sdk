import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../../src/daml-lf/daml-lf-compilation.js";
import { DarSourceBundle } from "../../../../src/daml-lf/container/dar-source-bundle.js";
import { DamlLfWorkspace } from "../../../../src/daml-lf/daml-lf-workspace.js";
import { DamlLfEvaluator } from "../../../../src/daml-lf/interpreter/daml-lf-evaluator.js";
import { DamlLfExpression } from "../../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfModule } from "../../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../../src/daml-lf/model/daml-lf-value-definition.js";
import {
    ILedgerReplayEnvironment,
    IReplayTransactionSnapshot,
} from "../../../../src/debugger/replay/ledger-replay-environment-builder.js";
import { LedgerReplaySessionLoader } from "../../../../src/debugger/replay/ledger-replay-session-loader.js";
import { ReplayDeterminismValidator } from "../../../../src/debugger/replay/replay-determinism-validator.js";
import { InMemoryReplaySessionStore } from "../../../../src/debugger/session/in-memory-replay-session-store.js";
import {
    LedgerReplayDebuggerClient,
    ReplayDeterminismException,
    ReplaySessionRequest,
    ReplayUnsupportedLfConstructException,
} from "../../../../src/debugger/index.js";
import { ReplayEntrypoint } from "../../../../src/debugger/replay/replay-entrypoint.js";
import { DamlSourceMapper } from "../../../../src/debugger/source/daml-source-mapper.js";
import { SourceIndexedCompilation } from "../../../../src/debugger/source/source-indexed-compilation.js";

describe("LedgerReplayDebuggerClient", () => {
    it("records state-effect steps for exercised choices", async () => {
        const client = createClient();

        const session = await client.loadSessionAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(session.metadata?.stepCount).toBeGreaterThan(0);
        expect(session.currentStep).toEqual(
            expect.objectContaining({
                stepId: expect.any(String),
                stateDelta: expect.objectContaining({
                    kind: "exercise",
                    eventOrdinal: 0,
                    comparisonKey: "event-0",
                }),
            }),
        );
    });

    it("steps through only projected exact locations and state effects", async () => {
        const client = createClient();

        const session = await client.loadSessionAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );
        const trace = await client.getTraceSliceAsync("session-1", 0, 20);

        expect(trace.map((step) => step.stepIndex)).toEqual(
            trace.map((_, index) => index),
        );
        expect(session.metadata?.stepCount).toBe(trace.length);
        expect(
            trace
                .filter((step) => step.phase !== "stateEffect")
                .every((step) => step.sourceLocation?.precision === "exact"),
        ).toBe(true);
    });

    it("stepOver skips nested call execution and lands after the current frame resumes", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        await client.stepIntoAsync("session-1");
        await client.stepIntoAsync("session-1");
        const result = await client.stepOverAsync("session-1");

        expect(result.sessionId).toBe("session-1");
        expect(result.step.phase).toBe("enterExpression");
        expect(result.step.stackFrames).toEqual([
            expect.objectContaining({ name: "Archive" }),
        ]);
    });

    it("returns stacks, scopes, and trace slices from the precomputed session", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        const trace = await client.getTraceSliceAsync("session-1", 0, 20);
        const nestedFrameIndex = trace.findIndex(
            (step) => step.stackFrames.length === 2,
        );

        for (let index = 0; index < nestedFrameIndex; index += 1) {
            await client.stepIntoAsync("session-1");
        }

        await expect(client.getStackAsync("session-1")).resolves.toEqual([
            expect.objectContaining({ name: "Archive" }),
            expect.objectContaining({ name: "Greeting" }),
        ]);
        await expect(
            client.getScopesAsync("session-1", "frame-1"),
        ).resolves.toEqual([
            expect.objectContaining({
                frameId: "frame-1",
                variables: [
                    expect.objectContaining({
                        name: "greeting",
                        value: "ok",
                    }),
                ],
            }),
        ]);
        await expect(
            client.getScopesAsync("session-1", "frame-2"),
        ).resolves.toEqual([
            expect.objectContaining({
                frameId: "frame-2",
                variables: [],
            }),
        ]);
        await expect(
            client.getTraceSliceAsync("session-1", 0, 10),
        ).resolves.toBeInstanceOf(Array);
    });

    it("exposes all in-scope variables on the current step grouped by frame", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        const trace = await client.getTraceSliceAsync("session-1", 0, 20);
        const nestedFrameIndex = trace.findIndex(
            (step) => step.stackFrames.length === 2,
        );

        for (let index = 0; index < nestedFrameIndex; index += 1) {
            await client.stepIntoAsync("session-1");
        }

        await expect(
            client.getCurrentStepAsync("session-1"),
        ).resolves.toEqual(
            expect.objectContaining({
                locals: [],
                scopes: [
                    expect.objectContaining({
                        frameId: "frame-1",
                        variables: [
                            expect.objectContaining({
                                name: "greeting",
                                value: "ok",
                            }),
                        ],
                    }),
                    expect.objectContaining({
                        frameId: "frame-2",
                        variables: [],
                    }),
                ],
            }),
        );
    });

    it("stepOut leaves the current frame and resumes in the caller", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        await client.stepIntoAsync("session-1");
        await client.stepIntoAsync("session-1");
        await client.stepIntoAsync("session-1");

        const result = await client.stepOutAsync("session-1");

        expect(result.step.phase).toBe("exitExpression");
        expect(result.step.stackFrames).toEqual([
            expect.objectContaining({ name: "Archive" }),
        ]);
    });

    it("stepBack rewinds one projected step without replaying", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        await client.stepIntoAsync("session-1");
        await client.stepIntoAsync("session-1");

        const result = await client.stepBackAsync("session-1");

        expect(result.sessionId).toBe("session-1");
        expect(result.step.stepIndex).toBe(1);
        expect(result.nextStepIndex).toBe(2);
    });

    it("stepBack stays at the first step when already at index zero", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        const result = await client.stepBackAsync("session-1");

        expect(result.step.stepIndex).toBe(0);
        expect(result.nextStepIndex).toBe(1);
    });

    it("jumpToStep selects an existing projected step by id", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        const trace = await client.getTraceSliceAsync("session-1", 0, 20);
        const targetStep = trace.find((step) => step.stateDelta?.eventOrdinal === 0);

        expect(targetStep).toBeDefined();

        const result = await client.jumpToStepAsync(
            "session-1",
            targetStep?.stepId ?? "",
        );

        expect(result.step.stepId).toBe(targetStep?.stepId);
        expect(result.step.stateDelta?.eventOrdinal).toBe(0);
    });

    it("supports the full required session method set", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));

        await expect(
            client.getSessionMetadataAsync("session-1"),
        ).resolves.toBeDefined();
        await expect(client.getCurrentStepAsync("session-1")).resolves.toBeDefined();
        await expect(client.stepIntoAsync("session-1")).resolves.toBeDefined();
        await expect(client.stepBackAsync("session-1")).resolves.toBeDefined();
        await expect(client.stepOutAsync("session-1")).resolves.toBeDefined();
        await expect(
            client.jumpToStepAsync("session-1", "step-0"),
        ).resolves.toBeDefined();
        await expect(client.continueAsync("session-1")).resolves.toBeDefined();
        await expect(client.disposeSessionAsync("session-1")).resolves.toBeUndefined();
    });

    it("rejects replay traces whose observed effects diverge from evaluation output", async () => {
        const client = createClient();

        await expect(
            client.loadSessionAsync(new ReplaySessionRequest({ offset: "99" })),
        ).rejects.toThrow(ReplayDeterminismException);
    });

    it("rejects replay when evaluation reaches an unsupported lf construct", async () => {
        const client = createClient();

        await expect(
            client.loadSessionAsync(new ReplaySessionRequest({ offset: "100" })),
        ).rejects.toThrow(ReplayUnsupportedLfConstructException);
    });
});

function createClient(): LedgerReplayDebuggerClient {
    const greeting = new DamlLfValueDefinition({
        name: "Greeting",
        type: new DamlLfType({}),
        expression: new DamlLfExpression({
            textLiteral: "ok",
            sourceLocation: {
                startLine: 5,
                startColumn: 0,
                endLine: 5,
                endColumn: 18,
            },
        }),
    });
    const definition = new DamlLfValueDefinition({
        name: "Archive",
        type: new DamlLfType({}),
        expression: new DamlLfExpression({
            letExpression: {
                bindings: [
                        {
                            name: "greeting",
                            value: new DamlLfExpression({
                                textLiteral: "ok",
                                sourceLocation: {
                                    startLine: 3,
                                    startColumn: 0,
                                    endLine: 3,
                                    endColumn: 18,
                                },
                            }),
                    },
                ],
                body: new DamlLfExpression({
                    valueReference: {
                        packageId: "pkg-main",
                        moduleName: "Sample.Module",
                        definitionName: "Greeting",
                    },
                    sourceLocation: {
                        startLine: 4,
                        startColumn: 0,
                        endLine: 4,
                        endColumn: 18,
                    },
                }),
            },
            sourceLocation: {
                startLine: 2,
                startColumn: 0,
                endLine: 5,
                endColumn: 18,
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
                        name: "Sample.Module",
                        definitions: [greeting, definition],
                    }),
                ],
            }),
        ]),
    );
    const realEvaluator = new DamlLfEvaluator(compilation);
    const sourceMapper = new DamlSourceMapper(
        SourceIndexedCompilation.createOrThrow(compilation, [
            new DarSourceBundle({
                sourceFiles: [],
                metadata: {
                    executables: [
                        {
                            packageId: "pkg-main",
                            moduleName: "Sample.Module",
                            definitionName: "Archive",
                            path: "src/Sample.daml",
                            startLine: 3,
                            startColumn: 1,
                            endLine: 4,
                            endColumn: 20,
                            precision: "exact",
                        },
                        {
                            packageId: "pkg-main",
                            moduleName: "Sample.Module",
                            definitionName: "Greeting",
                            path: "src/Sample.daml",
                            startLine: 6,
                            startColumn: 1,
                            endLine: 6,
                            endColumn: 20,
                            precision: "exact",
                        },
                    ],
                },
            }),
        ]),
    );
    const sessionLoader = new LedgerReplaySessionLoader({
        updateLoader: {
            async loadOrThrowAsync(offset: string): Promise<IReplayTransactionSnapshot> {
                return createSnapshot(offset);
            },
        },
        environmentBuilder: {
            async buildOrThrowAsync(
                snapshot: IReplayTransactionSnapshot,
            ): Promise<ILedgerReplayEnvironment> {
                return createEnvironment(snapshot);
            },
        },
        definitionResolver: {
            resolveEntrypointDefinitionOrThrow() {
                return {
                    packageId: "pkg-main",
                    moduleName: "Sample.Module",
                    definition,
                };
            },
        },
        evaluator: {
            evaluateReplayEntrypointOrThrow(
                resolvedDefinition: DamlLfValueDefinition,
                environment: ILedgerReplayEnvironment,
                traceSink,
            ) {
                if (environment.offset === "100") {
                    throw new ReplayUnsupportedLfConstructException(
                        "unsupported",
                    );
                }

                const result = realEvaluator.evaluateReplayEntrypointOrThrow(
                    resolvedDefinition,
                    environment,
                    traceSink,
                );

                if (environment.offset === "99") {
                    return {
                        ...result,
                        effects: result.effects.map((effect) => ({
                            ...effect,
                            choice: "Transfer",
                        })),
                    };
                }

                return result;
            },
        },
        sourceMapper,
        determinismValidator: new ReplayDeterminismValidator(),
        sessionIdFactory: () => "session-1",
    });

    return new LedgerReplayDebuggerClient({
        sessionLoader,
        sessionStore: new InMemoryReplaySessionStore(),
    });
}

function createSnapshot(offset: string): IReplayTransactionSnapshot {
    return {
        kind: "transaction",
        offset,
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
}

function createEnvironment(
    snapshot: IReplayTransactionSnapshot,
): ILedgerReplayEnvironment {
    return {
        kind: "transaction",
        offset: snapshot.offset,
        actAs: snapshot.actAs ?? [],
        readAs: snapshot.readAs ?? [],
        entrypoint: snapshot.entrypoint,
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
}
