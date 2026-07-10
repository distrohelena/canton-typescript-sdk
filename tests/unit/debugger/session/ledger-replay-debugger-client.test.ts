import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../../src/daml-lf/daml-lf-compilation.js";
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

describe("LedgerReplayDebuggerClient", () => {
    it("records state-effect steps for exercised choices", async () => {
        const client = createClient();

        const session = await client.loadSessionAsync(
            new ReplaySessionRequest({ offset: "42" }),
        );

        expect(session.metadata?.stepCount).toBeGreaterThan(0);
        expect(session.currentStep?.stateDelta?.kind).toBeDefined();
    });

    it("stepOver returns the new current step and terminal state", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));
        const result = await client.stepOverAsync("session-1");

        expect(result.sessionId).toBe("session-1");
        expect(result.step.stepIndex).toBeGreaterThan(0);
    });

    it("returns stacks, scopes, and trace slices from the precomputed session", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));

        await expect(client.getStackAsync("session-1")).resolves.toBeInstanceOf(
            Array,
        );
        await expect(
            client.getScopesAsync("session-1", "frame-1"),
        ).resolves.toBeInstanceOf(Array);
        await expect(
            client.getTraceSliceAsync("session-1", 0, 10),
        ).resolves.toBeInstanceOf(Array);
    });

    it("supports the full required session method set", async () => {
        const client = createClient();

        await client.loadSessionAsync(new ReplaySessionRequest({ offset: "42" }));

        await expect(
            client.getSessionMetadataAsync("session-1"),
        ).resolves.toBeDefined();
        await expect(client.getCurrentStepAsync("session-1")).resolves.toBeDefined();
        await expect(client.stepIntoAsync("session-1")).resolves.toBeDefined();
        await expect(client.stepOutAsync("session-1")).resolves.toBeDefined();
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
    const definition = new DamlLfValueDefinition({
        name: "Archive",
        type: new DamlLfType({}),
        expression: new DamlLfExpression({
            textLiteral: "ok",
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
                        definitions: [definition],
                    }),
                ],
            }),
        ]),
    );
    const realEvaluator = new DamlLfEvaluator(compilation);
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
