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
    readonly currentStepIndex: number;
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
        const steps: ReplayStep[] = [];
        const evaluation =
            this.dependencies.evaluator.evaluateReplayEntrypointOrThrow(
                definition.definition,
                environment,
                {
                    onStep: (step) => {
                        steps.push(this.toReplayStep(step, steps.length));
                    },
                },
            );

        this.dependencies.determinismValidator.validateOrThrow(
            snapshot,
            evaluation.effects,
        );

        const sessionId =
            this.dependencies.sessionIdFactory?.() ?? crypto.randomUUID();

        return {
            sessionId,
            metadata: new ReplaySessionMetadata({
                sessionId,
                offset: snapshot.offset,
                stepCount: steps.length,
            }),
            steps,
            currentStepIndex: 0,
        };
    }

    private toReplayStep(
        traceStep: IDamlLfTraceStep,
        stepIndex: number,
    ): ReplayStep {
        return new ReplayStep({
            stepIndex,
            phase: this.toReplayPhase(traceStep),
            stackFrames: [
                new ReplayStackFrame({
                    frameId: traceStep.frame.frameId,
                    name: traceStep.frame.definition.name,
                }),
            ],
            locals: traceStep.locals.map((local) => ({
                name: local.name,
                kind: local.value.kind,
                value: this.stringifyRuntimeValue(local.value),
            })),
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

        return value.kind ?? "value";
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
