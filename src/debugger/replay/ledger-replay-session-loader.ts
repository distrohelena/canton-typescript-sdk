import { DamlLfValueDefinition } from "../../daml-lf/model/daml-lf-value-definition.js";
import { DamlLfExpression } from "../../daml-lf/model/daml-lf-expression.js";
import {
    IDamlLfReplayEffect,
    IDamlLfTraceSink,
    IDamlLfTraceStep,
} from "../../daml-lf/interpreter/daml-lf-trace-sink.interface.js";
import { IDamlLfRuntimeValue } from "../../daml-lf/interpreter/daml-lf-runtime-value.js";
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
    IHydratedReplayContract,
    IReplayTransactionSnapshot,
} from "./ledger-replay-environment-builder.js";
import { ResolvedReplayEntrypointDefinition } from "./replay-entrypoint-definition-resolver.js";
import { ReplaySessionRequest } from "../session/replay-session-request.js";
import { DamlSourceMapper } from "../source/daml-source-mapper.js";
import { DamlLfTemplateId } from "../../daml-lf/model/daml-lf-template-id.js";
import {
    SourceMappingPrecision,
} from "../source/source-mapping-precision.js";
import { attachReplayRecordId } from "./replay-ledger-value-normalizer.js";

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
    resolveChoiceDefinitionOrThrow?(
        templateId: DamlLfTemplateId,
        choiceName: string,
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
    readonly traceStep: IDamlLfTraceStep;
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
                {
                    ...environment,
                    observedCreateContractIds: snapshot.events.flatMap((event) =>
                        event.event?.oneofKind === "created"
                        && event.event.created?.contractId !== undefined
                            ? [event.event.created.contractId]
                            : [],
                    ),
                    entrypoint: {
                        ...environment.entrypoint,
                        argument:
                            definition.entrypointArgumentRecordId === undefined
                                ? environment.entrypoint.argument
                                : attachReplayRecordId(
                                    environment.entrypoint.argument,
                                    definition.entrypointArgumentRecordId,
                                ),
                    },
                    definitionResolver: this.dependencies.definitionResolver,
                    entrypointExpression: definition.replayExpression,
                    entrypointBindingMode: definition.replayBindingMode,
                },
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
        const projectedSteps = this.projectReplaySteps(traceSteps, environment);
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
        environment: ILedgerReplayEnvironment,
    ): readonly IProjectedReplayStep[] {
        const rawSteps = this.projectRawReplaySteps(traceSteps, environment);

        if (this.dependencies.sourceMapper === undefined) {
            return rawSteps;
        }

        return this.projectNavigableReplaySteps(rawSteps);
    }

    private projectRawReplaySteps(
        traceSteps: readonly IDamlLfTraceStep[],
        environment: ILedgerReplayEnvironment,
    ): readonly IProjectedReplayStep[] {
        const activeFrames: ReplayStackFrame[] = [];
        const frameScopes = new Map<string, ReplayScope>();
        const frameExpressionDepth = new Map<string, number>();
        const frameCallDepth = new Map<string, number>();
        const contractTypeById = this.createContractTypeIndex(environment.contracts);
        let eventOrdinal = 0;

        return traceSteps.map((traceStep, stepIndex) => {
            this.rememberFrameScope(frameScopes, traceStep, contractTypeById);
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
                stepId: `step-${stepIndex}`,
                stepIndex,
                phase: this.toReplayPhase(traceStep),
                stackFrames,
                scopes,
                locals: currentScope?.variables ?? [],
                arguments:
                    traceStep.stateEffect?.argument === undefined
                        ? []
                        : [traceStep.stateEffect.argument],
                valuePreview: this.createValuePreview(traceStep),
                stateDelta:
                    traceStep.stateEffect === undefined
                        ? undefined
                        : this.createStateDelta(
                            traceStep.stateEffect,
                            eventOrdinal,
                        ),
                sourceLocation: this.createSourceLocation(traceStep),
            });

            if (traceStep.stateEffect !== undefined) {
                this.rememberStateEffectContractType(
                    traceStep.stateEffect,
                    contractTypeById,
                );
                eventOrdinal += 1;
            }

            this.finalizeStackForStep(
                traceStep,
                activeFrames,
                frameExpressionDepth,
                frameCallDepth,
            );

            return {
                step: projectedStep,
                scopes,
                traceStep,
            };
        });
    }

    private projectNavigableReplaySteps(
        rawSteps: readonly IProjectedReplayStep[],
    ): readonly IProjectedReplayStep[] {
        const navigableSteps: IProjectedReplayStep[] = [];
        let previousVisibleExpressionKey: string | undefined;

        for (const rawStep of rawSteps) {
            const { step, traceStep } = rawStep;

            if (step.phase === ReplayPhase.stateEffect) {
                previousVisibleExpressionKey = undefined;
                navigableSteps.push(rawStep);
                continue;
            }

            if (
                step.sourceLocation?.precision
                !== SourceMappingPrecision.exact
            ) {
                continue;
            }

            if (
                step.phase === ReplayPhase.call
                || step.phase === ReplayPhase.return
            ) {
                if (!this.shouldRetainDefinitionTransition(step, traceStep)) {
                    continue;
                }

                previousVisibleExpressionKey = undefined;
                navigableSteps.push(rawStep);
                continue;
            }

            if (
                traceStep.kind !== "enterExpression"
                && traceStep.kind !== "exitExpression"
            ) {
                continue;
            }

            const previousStep = navigableSteps.at(-1)?.step;

            if (
                !this.shouldRetainExpressionStep(
                    step,
                    traceStep,
                    previousStep,
                )
            ) {
                continue;
            }

            const visibleExpressionKey =
                this.createVisibleExpressionKey(step);

            if (visibleExpressionKey === previousVisibleExpressionKey) {
                continue;
            }

            previousVisibleExpressionKey = visibleExpressionKey;
            navigableSteps.push(rawStep);
        }

        return navigableSteps.map((item, stepIndex) => ({
            ...item,
            step: new ReplayStep({
                stepId: item.step.stepId,
                stepIndex,
                phase: item.step.phase,
                stackFrames: item.step.stackFrames,
                scopes: item.step.scopes,
                locals: item.step.locals,
                arguments: item.step.arguments,
                sourceLocation: item.step.sourceLocation,
                valuePreview: item.step.valuePreview,
                stateDelta: item.step.stateDelta,
            }),
        }));
    }

    private createSourceLocationKey(source: ReplaySourceLocation): string {
        return [
            source.path,
            source.startLine,
            source.startColumn,
            source.endLine,
            source.endColumn,
        ].join(":");
    }

    private createVisibleExpressionKey(step: ReplayStep): string {
        const source = step.sourceLocation;

        return [
            source === undefined
                ? "no-source"
                : [
                    source.path,
                    source.startLine,
                    source.endLine,
                ].join(":"),
            step.stackFrames.map((frame) => frame.frameId ?? frame.name ?? "?").join(">"),
            JSON.stringify(step.locals),
        ].join("|");
    }

    private shouldRetainDefinitionTransition(
        step: ReplayStep,
        traceStep: IDamlLfTraceStep,
    ): boolean {
        return this.isMeaningfulDefinitionExpression(
            traceStep.frame.definition.expression,
        )
            || this.hasVisibleLocalsChange(undefined, step);
    }

    private shouldRetainExpressionStep(
        step: ReplayStep,
        traceStep: IDamlLfTraceStep,
        previousStep: ReplayStep | undefined,
    ): boolean {
        if (this.hasVisibleLocalsChange(previousStep, step)) {
            return true;
        }

        return this.isMeaningfulDebuggerExpression(traceStep.expression);
    }

    private hasVisibleLocalsChange(
        previousStep: ReplayStep | undefined,
        currentStep: ReplayStep,
    ): boolean {
        return JSON.stringify(previousStep?.locals ?? [])
            !== JSON.stringify(currentStep.locals);
    }

    private isMeaningfulDebuggerExpression(
        expression: DamlLfExpression,
    ): boolean {
        if (
            expression.application !== undefined
            || expression.letExpression !== undefined
            || expression.caseExpression !== undefined
            || expression.updateExpression !== undefined
            || expression.lambda !== undefined
        ) {
            return true;
        }

        if (
            expression.valueReference !== undefined
            && this.dependencies.sourceMapper !== undefined
        ) {
            try {
                const referencedDefinition =
                    this.dependencies.sourceMapper.getValueDefinitionOrThrow(
                        expression.valueReference.packageId,
                        expression.valueReference.moduleName,
                        expression.valueReference.definitionName,
                    );

                return this.isMeaningfulDefinitionExpression(
                    referencedDefinition.expression,
                );
            } catch {
                return false;
            }
        }

        return false;
    }

    private isMeaningfulDefinitionExpression(
        expression: DamlLfExpression,
    ): boolean {
        return (
            expression.application !== undefined
            || expression.letExpression !== undefined
            || expression.caseExpression !== undefined
            || expression.updateExpression !== undefined
            || expression.lambda !== undefined
        );
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

    private createStateDelta(
        effect: IDamlLfReplayEffect,
        eventOrdinal: number,
    ): ReplayStateDelta {
        const common = {
            kind: effect.kind,
            eventOrdinal,
            comparisonKey: `event-${eventOrdinal}`,
        } as const;

        switch (effect.kind) {
            case "create":
                return new ReplayStateDelta({
                    ...common,
                    createdContractId: effect.contractId,
                    templateId: effect.templateId,
                    payload: effect.payload,
                });
            case "exercise":
                return new ReplayStateDelta({
                    ...common,
                    targetContractId: effect.contractId,
                    templateId: effect.templateId,
                    choice: effect.choice,
                    choiceArgument: effect.argument,
                    payload: effect.payload,
                });
            case "archive":
                return new ReplayStateDelta({
                    ...common,
                    targetContractId: effect.contractId,
                    templateId: effect.templateId,
                });
            default:
                return new ReplayStateDelta(common);
        }
    }

    private stringifyRuntimeValue(value: IDamlLfRuntimeValue): string {
        if ("value" in value && typeof value.value === "string") {
            return value.value.length > 0 ? value.value : "\"\"";
        }

        if ("value" in value) {
            try {
                const serialized = JSON.stringify(value.value);

                if (typeof serialized === "string" && serialized.length > 0) {
                    return serialized;
                }
            }
            catch {
                // Fall through to a lossy scalar representation when preview
                // values are not JSON-serializable.
            }

            if (value.value === undefined) {
                return "undefined";
            }

            if (value.value === null) {
                return "null";
            }

            return String(value.value);
        }

        return typeof value.kind === "string" ? value.kind : "value";
    }

    private rememberFrameScope(
        frameScopes: Map<string, ReplayScope>,
        traceStep: IDamlLfTraceStep,
        contractTypeById: ReadonlyMap<string, string>,
    ): void {
        const frameName = this.resolveFrameName(traceStep);

        frameScopes.set(
            traceStep.frame.frameId,
            new ReplayScope({
                frameId: traceStep.frame.frameId,
                name: frameName,
                variables: traceStep.locals.map((local) => ({
                    name: local.name,
                    kind: local.value.kind,
                    value: this.stringifyRuntimeValue(local.value),
                    contractType: this.resolveRuntimeValueContractType(
                        local.value,
                        contractTypeById,
                    ),
                })),
            }),
        );
    }

    private createContractTypeIndex(
        contracts: ReadonlyMap<string, IHydratedReplayContract>,
    ): Map<string, string> {
        const index = new Map<string, string>();

        for (const [contractId, contract] of contracts.entries()) {
            const contractType = this.formatTemplateType(contract.templateId);

            if (contractType !== undefined) {
                index.set(contractId, contractType);
            }
        }

        return index;
    }

    private rememberStateEffectContractType(
        effect: IDamlLfReplayEffect,
        contractTypeById: Map<string, string>,
    ): void {
        if (effect.kind !== "create" || effect.contractId === undefined) {
            return;
        }

        const contractType = this.formatTemplateType(effect.templateId);

        if (contractType !== undefined) {
            contractTypeById.set(effect.contractId, contractType);
        }
    }

    private resolveRuntimeValueContractType(
        value: IDamlLfRuntimeValue,
        contractTypeById: ReadonlyMap<string, string>,
    ): string | undefined {
        if (
            value.kind === "contractId"
            && "value" in value
            && typeof value.value === "string"
        ) {
            return contractTypeById.get(value.value);
        }

        if (
            value.kind === "contractId[]"
            && "value" in value
            && Array.isArray(value.value)
        ) {
            for (const contractId of value.value) {
                if (typeof contractId !== "string") {
                    continue;
                }

                const contractType = contractTypeById.get(contractId);

                if (contractType !== undefined) {
                    return contractType;
                }
            }
        }

        return undefined;
    }

    private formatTemplateType(
        templateId:
            | {
                packageId?: string;
                moduleName?: string;
                entityName?: string;
            }
            | undefined,
    ): string | undefined {
        if (
            templateId?.moduleName !== undefined
            && templateId.entityName !== undefined
        ) {
            return `${templateId.moduleName}:${templateId.entityName}`;
        }

        return templateId?.entityName;
    }

    private prepareStackForStep(
        traceStep: IDamlLfTraceStep,
        activeFrames: ReplayStackFrame[],
        frameExpressionDepth: Map<string, number>,
        frameCallDepth: Map<string, number>,
    ): void {
        const frame = new ReplayStackFrame({
            frameId: traceStep.frame.frameId,
            name: this.resolveFrameName(traceStep),
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

    private resolveFrameName(traceStep: IDamlLfTraceStep): string {
        const definitionName = traceStep.frame.definition.name;
        const generatedHelper = this.isGeneratedHelperDefinitionName(
            definitionName,
        );

        if (this.dependencies.sourceMapper === undefined) {
            return generatedHelper
                ? this.formatGeneratedHelperLabel(definitionName)
                : definitionName;
        }

        try {
            const source = this.dependencies.sourceMapper.getDefinitionSourceOrThrow(
                traceStep.frame.packageId,
                traceStep.frame.moduleName,
                definitionName,
            );
            const label = this.formatExecutableFrameLabel(source);

            if (label !== undefined) {
                return generatedHelper
                    ? this.formatGeneratedHelperLabel(label)
                    : label;
            }
        } catch {
            // Fall through to source-span and effect-based resolution when the
            // current frame definition has no executable metadata of its own.
        }

        const sourceLocation = this.createSourceLocation(traceStep);

        if (
            sourceLocation?.path !== undefined
            && sourceLocation.startLine !== undefined
            && sourceLocation.startColumn !== undefined
        ) {
            const enclosingSource =
                this.dependencies.sourceMapper.findExecutableSourceAt(
                    sourceLocation.path,
                    sourceLocation.startLine,
                    sourceLocation.startColumn,
                );
            const label = enclosingSource === undefined
                ? undefined
                : this.formatExecutableFrameLabel(enclosingSource);

            if (label !== undefined) {
                return generatedHelper
                    ? this.formatGeneratedHelperLabel(label)
                    : label;
            }
        }

        const effectLabel = this.formatReplayEffectFrameLabel(
            traceStep.stateEffect,
        );

        if (effectLabel !== undefined) {
            return generatedHelper
                ? this.formatGeneratedHelperLabel(effectLabel)
                : effectLabel;
        }

        return generatedHelper
            ? this.formatGeneratedHelperLabel(definitionName)
            : definitionName;
    }

    private isGeneratedHelperDefinitionName(definitionName: string): boolean {
        return /^\$+/.test(definitionName);
    }

    private formatGeneratedHelperLabel(context: string): string {
        return `generated helper from ${context}`;
    }

    private formatExecutableFrameLabel(source: {
        entrypointKind?: "create" | "exercise";
        templateName?: string;
        choiceName?: string;
    }): string | undefined {
        if (
            source.entrypointKind === "exercise"
            && source.templateName !== undefined
            && source.choiceName !== undefined
        ) {
            return `${source.templateName}.${source.choiceName}`;
        }

        if (
            source.entrypointKind === "create"
            && source.templateName !== undefined
        ) {
            return `${source.templateName}.create`;
        }

        return undefined;
    }

    private formatReplayEffectFrameLabel(
        effect: IDamlLfReplayEffect | undefined,
    ): string | undefined {
        if (effect?.templateId?.entityName === undefined) {
            return undefined;
        }

        if (effect.kind === "create") {
            return `${effect.templateId.entityName}.create`;
        }

        if (
            effect.kind === "exercise"
            && effect.choice !== undefined
        ) {
            return `${effect.templateId.entityName}.${effect.choice}`;
        }

        return undefined;
    }

    private createSourceLocation(
        traceStep: IDamlLfTraceStep,
    ): ReplaySourceLocation | undefined {
        if (this.dependencies.sourceMapper === undefined) {
            return undefined;
        }

        try {
            const compilerExpressionSource =
                this.dependencies.sourceMapper.getExpressionSource(
                    traceStep.expression,
                );

            if (compilerExpressionSource !== undefined) {
                return new ReplaySourceLocation({
                    path: compilerExpressionSource.path,
                    startLine: compilerExpressionSource.startLine + 1,
                    startColumn: compilerExpressionSource.startColumn + 1,
                    endLine: compilerExpressionSource.endLine + 1,
                    endColumn: compilerExpressionSource.endColumn + 1,
                    precision: SourceMappingPrecision.exact,
                });
            }

            const expressionSource = traceStep.expression.sourceLocation;

            if (expressionSource !== undefined) {
                const packageId =
                    expressionSource.packageId ?? traceStep.frame.packageId;
                const moduleName =
                    expressionSource.moduleName ?? traceStep.frame.moduleName;
                const moduleSource =
                    this.dependencies.sourceMapper.getModuleSourceOrThrow(
                        packageId,
                        moduleName,
                    );

                return new ReplaySourceLocation({
                    path: moduleSource.path,
                    startLine: expressionSource.startLine + 1,
                    startColumn: expressionSource.startColumn + 1,
                    endLine: expressionSource.endLine + 1,
                    endColumn: expressionSource.endColumn + 1,
                    precision: SourceMappingPrecision.exact,
                });
            }

            if (traceStep.stateEffect === undefined) {
                return undefined;
            }

            const source =
                this.dependencies.sourceMapper.getDefinitionSourceOrThrow(
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
                precision: source.precision,
            });
        } catch {
            return undefined;
        }
    }
}
