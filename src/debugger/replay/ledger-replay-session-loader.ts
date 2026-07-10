import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";
import {
    IDamlLfReplayEffect,
    IDamlLfTraceSink,
    IDamlLfTraceStep,
} from "../../daml-lf/interpreter/daml-lf-trace-sink.interface.js";
import {
    IDamlLfReplayEnvironment,
    IDamlLfReplayEvaluationResult,
} from "../../daml-lf/interpreter/daml-lf-evaluator.js";
import { ReplayPhase } from "../session/replay-phase.js";
import { ReplayScope } from "../session/replay-scope.js";
import { ReplaySourceLocation } from "../session/replay-source-location.js";
import { ReplaySessionMetadata } from "../session/replay-session-metadata.js";
import { ReplayStackFrame } from "../session/replay-stack-frame.js";
import { ReplayStateDelta } from "../session/replay-state-delta.js";
import { ReplayStep } from "../session/replay-step.js";
import { ReplayValuePreview } from "../session/replay-value-preview.js";
import {
    ILedgerReplayEnvironment,
    IReplayTransactionSnapshot,
} from "./ledger-replay-environment-builder.js";
import { ResolvedReplayEntrypointDefinition } from "./replay-entrypoint-definition-resolver.js";
import { ReplaySessionRequest } from "../session/replay-session-request.js";
import { DamlSourceMapper } from "../source/daml-source-mapper.js";

interface IReplayUpdateLoader {
    loadOrThrowAsync(offset: string): Promise<IReplayTransactionSnapshot>;
}

interface IReplayEnvironmentBuilder {
    buildOrThrowAsync(
        snapshot: IReplayTransactionSnapshot,
    ): Promise<ILedgerReplayEnvironment>;
}

interface IReplayDefinitionResolver {
    resolveEntrypointDefinitionOrThrow(
        entrypoint: IReplayTransactionSnapshot["entrypoint"],
    ): ResolvedReplayEntrypointDefinition;
}

interface IReplayEvaluator {
    evaluateReplayEntrypointOrThrow(
        definition: DamlLfValueDefinition,
        environment: IDamlLfReplayEnvironment,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfReplayEvaluationResult;
}

interface IReplayDeterminismValidator {
    validateOrThrow(
        snapshot: IReplayTransactionSnapshot,
        replayedEffects: readonly IDamlLfReplayEffect[],
    ): void;
}

export interface ILoadedReplaySession {
    readonly sessionId: string;
    readonly metadata: ReplaySessionMetadata;
    readonly steps: readonly ReplayStep[];
    readonly scopesByStep: readonly (readonly ReplayScope[])[];
    readonly currentStepIndex: number;
}

interface IProjectedReplayStep {
    readonly step: ReplayStep;
    readonly scopes: readonly ReplayScope[];
}

export class LedgerReplaySessionLoader {
    public constructor(
        private readonly dependencies: {
            updateLoader: IReplayUpdateLoader;
            environmentBuilder: IReplayEnvironmentBuilder;
            definitionResolver: IReplayDefinitionResolver;
            sourceMapper?: DamlSourceMapper;
            evaluator: IReplayEvaluator;
            determinismValidator: IReplayDeterminismValidator;
            sessionIdFactory?: () => string;
        },
    ) {}

    public async loadOrThrowAsync(
        request: ReplaySessionRequest,
    ): Promise<ILoadedReplaySession> {
        const snapshot = await this.dependencies.updateLoader.loadOrThrowAsync(
            request.offset,
        );
        const environment =
            await this.dependencies.environmentBuilder.buildOrThrowAsync(
                snapshot,
            );
        const definition =
            this.dependencies.definitionResolver.resolveEntrypointDefinitionOrThrow(
                snapshot.entrypoint,
            );
        const traceSteps: IDamlLfTraceStep[] = [];
        const evaluation =
            this.dependencies.evaluator.evaluateReplayEntrypointOrThrow(
                definition.definition,
                environment,
                {
                    onStep: (step) => {
                        traceSteps.push(step);
                    },
                },
            );

        this.dependencies.determinismValidator.validateOrThrow(
            snapshot,
            evaluation.effects,
        );

        const sessionId =
            this.dependencies.sessionIdFactory?.() ?? crypto.randomUUID();
        const projectedSteps = this.projectReplaySteps(traceSteps);
        const steps = projectedSteps.map((item) => item.step);

        return {
            sessionId,
            metadata: new ReplaySessionMetadata({
                sessionId,
                offset: snapshot.offset,
                stepCount: steps.length,
            }),
            steps,
            scopesByStep: projectedSteps.map((item) => item.scopes),
            currentStepIndex: 0,
        };
    }

    private projectReplaySteps(
        traceSteps: readonly IDamlLfTraceStep[],
    ): readonly IProjectedReplayStep[] {
        const activeFrames: ReplayStackFrame[] = [];
        const frameScopes = new Map<string, ReplayScope>();
        const frameExpressionDepth = new Map<string, number>();
        const frameCallDepth = new Map<string, number>();

        return traceSteps.map((traceStep, stepIndex) => {
            this.rememberFrameScope(frameScopes, traceStep);
            this.prepareStackForStep(
                traceStep,
                activeFrames,
                frameExpressionDepth,
                frameCallDepth,
            );

            const stackFrames = activeFrames.map(
                (frame) =>
                    new ReplayStackFrame({
                        frameId: frame.frameId,
                        name: frame.name,
                    }),
            );
            const scopes = stackFrames.map((frame) =>
                this.cloneScope(
                    frameScopes.get(frame.frameId ?? "") ?? new ReplayScope({
                        frameId: frame.frameId,
                        name: frame.name,
                        variables: [],
                    }),
                ),
            );
            const currentScope = scopes.find(
                (scope) => scope.frameId === traceStep.frame.frameId,
            );
            const projectedStep = new ReplayStep({
                stepIndex,
                phase: this.toReplayPhase(traceStep),
                stackFrames,
                locals: currentScope?.variables ?? [],
                arguments:
                    traceStep.stateEffect?.argument === undefined
                        ? []
                        : [traceStep.stateEffect.argument],
                valuePreview: this.createValuePreview(traceStep),
                stateDelta:
                    traceStep.stateEffect === undefined
                        ? undefined
                        : new ReplayStateDelta({
                            kind: traceStep.stateEffect.kind,
                        }),
                sourceLocation: this.createSourceLocation(traceStep),
            });

            this.finalizeStackForStep(
                traceStep,
                activeFrames,
                frameExpressionDepth,
                frameCallDepth,
            );

            return {
                step: projectedStep,
                scopes,
            };
        });
    }

    private toReplayPhase(traceStep: IDamlLfTraceStep): ReplayPhase {
        switch (traceStep.kind) {
            case "stateEffect":
                return ReplayPhase.stateEffect;
            case "call":
                return ReplayPhase.call;
            case "return":
                return ReplayPhase.return;
            case "enterExpression":
                return ReplayPhase.enterExpression;
            case "exitExpression":
                return ReplayPhase.exitExpression;
            default:
                return ReplayPhase.enterExpression;
        }
    }

    private createValuePreview(
        traceStep: IDamlLfTraceStep,
    ): ReplayValuePreview | undefined {
        if (traceStep.stateEffect !== undefined) {
            const display = traceStep.stateEffect.contractId
                ?? traceStep.stateEffect.choice
                ?? traceStep.stateEffect.kind;

            return new ReplayValuePreview({
                kind: traceStep.stateEffect.kind,
                display,
            });
        }

        if (traceStep.value === undefined) {
            return undefined;
        }

        return new ReplayValuePreview({
            kind: traceStep.value.kind,
            display: this.stringifyRuntimeValue(traceStep.value),
        });
    }

    private stringifyRuntimeValue(value: Record<string, unknown>): string {
        if ("value" in value && typeof value.value === "string") {
            return value.value;
        }

        if ("value" in value) {
            return JSON.stringify(value.value);
        }

        return value.kind ?? "value";
    }

    private rememberFrameScope(
        frameScopes: Map<string, ReplayScope>,
        traceStep: IDamlLfTraceStep,
    ): void {
        frameScopes.set(
            traceStep.frame.frameId,
            new ReplayScope({
                frameId: traceStep.frame.frameId,
                name: traceStep.frame.definition.name,
                variables: traceStep.locals.map((local) => ({
                    name: local.name,
                    kind: local.value.kind,
                    value: this.stringifyRuntimeValue(local.value),
                })),
            }),
        );
    }

    private prepareStackForStep(
        traceStep: IDamlLfTraceStep,
        activeFrames: ReplayStackFrame[],
        frameExpressionDepth: Map<string, number>,
        frameCallDepth: Map<string, number>,
    ): void {
        const frame = new ReplayStackFrame({
            frameId: traceStep.frame.frameId,
            name: traceStep.frame.definition.name,
        });

        if (traceStep.kind === "call") {
            this.pushFrameIfMissing(activeFrames, frame);
            frameCallDepth.set(
                traceStep.frame.frameId,
                (frameCallDepth.get(traceStep.frame.frameId) ?? 0) + 1,
            );
            return;
        }

        this.pushFrameIfMissing(activeFrames, frame);

        if (traceStep.kind === "enterExpression") {
            frameExpressionDepth.set(
                traceStep.frame.frameId,
                (frameExpressionDepth.get(traceStep.frame.frameId) ?? 0) + 1,
            );
        }
    }

    private finalizeStackForStep(
        traceStep: IDamlLfTraceStep,
        activeFrames: ReplayStackFrame[],
        frameExpressionDepth: Map<string, number>,
        frameCallDepth: Map<string, number>,
    ): void {
        if (traceStep.kind === "exitExpression") {
            const nextDepth =
                (frameExpressionDepth.get(traceStep.frame.frameId) ?? 1) - 1;

            if (nextDepth <= 0) {
                frameExpressionDepth.delete(traceStep.frame.frameId);

                if ((frameCallDepth.get(traceStep.frame.frameId) ?? 0) === 0) {
                    this.popFrameIfTop(activeFrames, traceStep.frame.frameId);
                }
            }

            else {
                frameExpressionDepth.set(traceStep.frame.frameId, nextDepth);
            }

            return;
        }

        if (traceStep.kind === "return") {
            const nextCallDepth =
                (frameCallDepth.get(traceStep.frame.frameId) ?? 1) - 1;

            if (nextCallDepth <= 0) {
                frameCallDepth.delete(traceStep.frame.frameId);
            }

            else {
                frameCallDepth.set(traceStep.frame.frameId, nextCallDepth);
            }

            this.popFrameIfTop(activeFrames, traceStep.frame.frameId);
        }
    }

    private pushFrameIfMissing(
        activeFrames: ReplayStackFrame[],
        frame: ReplayStackFrame,
    ): void {
        const activeIndex = activeFrames.findIndex(
            (candidate) => candidate.frameId === frame.frameId,
        );

        if (activeIndex >= 0) {
            activeFrames.splice(activeIndex + 1);
            return;
        }

        activeFrames.push(frame);
    }

    private popFrameIfTop(
        activeFrames: ReplayStackFrame[],
        frameId: string,
    ): void {
        if (activeFrames.at(-1)?.frameId === frameId) {
            activeFrames.pop();
        }
    }

    private cloneScope(scope: ReplayScope): ReplayScope {
        return new ReplayScope({
            frameId: scope.frameId,
            name: scope.name,
            variables: [...scope.variables],
        });
    }

    private createSourceLocation(
        traceStep: IDamlLfTraceStep,
    ): ReplaySourceLocation | undefined {
        if (this.dependencies.sourceMapper === undefined) {
            return undefined;
        }

        const source = this.dependencies.sourceMapper.getDefinitionSourceOrThrow(
            traceStep.frame.packageId,
            traceStep.frame.moduleName,
            traceStep.frame.definition.name,
        );

        return new ReplaySourceLocation({
            path: source.path,
            startLine: source.startLine,
            startColumn: source.startColumn,
            endLine: source.endLine,
            endColumn: source.endColumn,
        });
    }
}
