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
import { ReplaySessionMetadata } from "../session/replay-session-metadata.js";
import { ReplayStackFrame } from "../session/replay-stack-frame.js";
import { ReplayStateDelta } from "../session/replay-state-delta.js";
import { ReplayStep } from "../session/replay-step.js";
import { ReplayValuePreview } from "../session/replay-value-preview.js";
import {
    ILedgerReplayEnvironment,
    IReplayTransactionSnapshot,
} from "./ledger-replay-environment-builder.js";
import { ReplaySessionRequest } from "../session/replay-session-request.js";

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
        snapshot: IReplayTransactionSnapshot,
        environment: ILedgerReplayEnvironment,
    ): DamlLfValueDefinition;
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
                snapshot,
                environment,
            );
        const steps: ReplayStep[] = [];
        const evaluation =
            this.dependencies.evaluator.evaluateReplayEntrypointOrThrow(
                definition,
                environment,
                {
                    onStep: (step) => {
                        steps.push(
                            this.toReplayStep(step, steps.length, environment),
                        );
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
        environment: ILedgerReplayEnvironment,
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
            locals: [],
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
            sourceLocation: undefined,
        });
    }

    private toReplayPhase(traceStep: IDamlLfTraceStep): ReplayPhase {
        switch (traceStep.kind) {
            case "stateEffect":
                return ReplayPhase.stateEffect;
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
}
