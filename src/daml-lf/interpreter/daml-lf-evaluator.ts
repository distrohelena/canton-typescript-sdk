import { ValidationError } from "../../core/errors/validation-error.js";
import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfExpression } from "../model/daml-lf-expression.js";
import { DamlLfValueDefinition } from "../model/daml-lf-value-definition.js";
import { DamlLfBuiltinDispatch } from "./daml-lf-builtin-dispatch.js";
import { DamlLfLexicalScope } from "./daml-lf-lexical-scope.js";
import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";
import { DamlLfRuntimeFrame } from "./daml-lf-runtime-frame.js";
import { DamlLfStepKind } from "./daml-lf-step-kind.js";
import {
    IDamlLfReplayEffect,
    IDamlLfTraceSink,
} from "./daml-lf-trace-sink.interface.js";

interface ITextRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "text";
    readonly value: string;
}

interface IBooleanRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "boolean";
    readonly value: boolean;
}

interface IUnitRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "unit";
}

interface IClosureRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "closure";
    readonly parameters: readonly string[];
    readonly body: DamlLfExpression;
    readonly frame: DamlLfRuntimeFrame;
}

interface ILedgerValueRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "ledgerValue";
    readonly value: unknown;
}

interface IBuiltinRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "builtin";
    readonly builtinFunction: string;
    readonly appliedArguments: readonly IDamlLfRuntimeValue[];
}

export interface IDamlLfReplayEnvironment {
    readonly offset: string;
    readonly entrypoint: {
        readonly kind: "create" | "exercise";
        readonly templateId?: {
            readonly packageId?: string;
            readonly moduleName?: string;
            readonly entityName?: string;
        };
        readonly contractId?: string;
        readonly choice?: string;
        readonly argument?: unknown;
    };
    readonly contracts?: ReadonlyMap<string, { readonly payload: unknown }>;
}

export interface IDamlLfReplayEvaluationResult {
    readonly value: IDamlLfRuntimeValue;
    readonly effects: readonly IDamlLfReplayEffect[];
}

export class DamlLfEvaluator {
    private nextFrameNumber = 1;

    public constructor(
        private readonly compilation: DamlLfCompilation,
        private readonly builtinDispatch = new DamlLfBuiltinDispatch(),
    ) {
        void this.compilation;
    }

    public getCompilation(): DamlLfCompilation {
        return this.compilation;
    }

    public getBuiltinDispatch(): DamlLfBuiltinDispatch {
        return this.builtinDispatch;
    }

    public evaluateValueDefinitionOrThrow(
        definition: DamlLfValueDefinition,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        const frame = this.createFrame(definition);

        return this.evaluateExpressionOrThrow(
            definition.expression,
            frame,
            traceSink,
        );
    }

    public evaluateReplayEntrypointOrThrow(
        definition: DamlLfValueDefinition,
        environment: IDamlLfReplayEnvironment,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfReplayEvaluationResult {
        const frame = this.createFrame(definition);
        const effects = this.createReplayEffects(environment);

        for (const effect of effects) {
            traceSink?.onStep({
                kind: DamlLfStepKind.stateEffect,
                expression: definition.expression,
                frame,
                locals: frame.scope.snapshotBindings(),
                stateEffect: effect,
            });
        }

        return {
            value: this.evaluateReplayExpressionOrThrow(
                definition.expression,
                frame,
                environment,
                traceSink,
            ),
            effects,
        };
    }

    private evaluateExpressionOrThrow(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        traceSink?.onStep({
            kind: DamlLfStepKind.enterExpression,
            expression,
            frame,
            locals: frame.scope.snapshotBindings(),
        });

        const value = this.resolveExpressionValue(expression, frame, traceSink);

        traceSink?.onStep({
            kind: DamlLfStepKind.exitExpression,
            expression,
            frame,
            locals: frame.scope.snapshotBindings(),
            value,
        });

        return value;
    }

    private createReplayEffects(
        environment: IDamlLfReplayEnvironment,
    ): readonly IDamlLfReplayEffect[] {
        if (environment.entrypoint.kind === "exercise") {
            return [
                {
                    kind: "exercise",
                    contractId: environment.entrypoint.contractId,
                    templateId: environment.entrypoint.templateId,
                    choice: environment.entrypoint.choice,
                    argument: environment.entrypoint.argument,
                },
            ];
        }

        return [
            {
                kind: "create",
                templateId: environment.entrypoint.templateId,
                payload: environment.entrypoint.argument,
            },
        ];
    }

    private createFrame(definition: DamlLfValueDefinition): DamlLfRuntimeFrame {
        const identity =
            this.compilation.getValueDefinitionIdentityOrThrow(definition);

        return new DamlLfRuntimeFrame({
            frameId: `frame-${this.nextFrameNumber++}`,
            packageId: identity.packageId,
            moduleName: identity.moduleName,
            definition,
            scope: new DamlLfLexicalScope(),
        });
    }

    private resolveExpressionValue(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (expression.textLiteral !== undefined) {
            return {
                kind: "text",
                value: expression.textLiteral,
            } satisfies ITextRuntimeValue;
        }

        if (expression.variableName !== undefined) {
            const value = frame.scope.getBinding(expression.variableName);

            if (value === undefined) {
                throw new ValidationError(
                    `daml lf variable '${expression.variableName}' is not bound`,
                );
            }

            return value;
        }

        if (expression.builtinConstructor !== undefined) {
            switch (expression.builtinConstructor) {
                case "true":
                    return {
                        kind: "boolean",
                        value: true,
                    } satisfies IBooleanRuntimeValue;
                case "false":
                    return {
                        kind: "boolean",
                        value: false,
                    } satisfies IBooleanRuntimeValue;
                default:
                    return {
                        kind: "unit",
                    } satisfies IUnitRuntimeValue;
            }
        }

        if (expression.builtinFunction !== undefined) {
            return {
                kind: "builtin",
                builtinFunction: expression.builtinFunction,
                appliedArguments: [],
            } satisfies IBuiltinRuntimeValue;
        }

        if (expression.lambda !== undefined) {
            return {
                kind: "closure",
                parameters: expression.lambda.parameters,
                body: expression.lambda.body,
                frame,
            } satisfies IClosureRuntimeValue;
        }

        if (expression.application !== undefined) {
            const functionValue = this.evaluateExpressionOrThrow(
                expression.application.function,
                frame,
                traceSink,
            );
            const argumentValues = expression.application.arguments.map((argument) =>
                this.evaluateExpressionOrThrow(argument, frame, traceSink),
            );

            return this.applyFunctionOrThrow(
                functionValue,
                argumentValues,
                traceSink,
            );
        }

        if (expression.letExpression !== undefined) {
            const scopedFrame = this.deriveFrame(
                frame,
                frame.scope.createChild(),
            );

            for (const binding of expression.letExpression.bindings) {
                const boundValue = this.evaluateExpressionOrThrow(
                    binding.value,
                    scopedFrame,
                    traceSink,
                );

                scopedFrame.scope.setBinding(binding.name, boundValue);
            }

            return this.evaluateExpressionOrThrow(
                expression.letExpression.body,
                scopedFrame,
                traceSink,
            );
        }

        if (expression.recordConstruction !== undefined) {
            return this.hydrateRuntimeValue(
                Object.fromEntries(
                    expression.recordConstruction.fields.map((field) => [
                        field.name,
                        this.unwrapRuntimeValue(
                            this.evaluateExpressionOrThrow(
                                field.value,
                                frame,
                                traceSink,
                            ),
                        ),
                    ]),
                ),
            );
        }

        if (expression.recordProjection !== undefined) {
            const recordValue = this.evaluateExpressionOrThrow(
                expression.recordProjection.record,
                frame,
                traceSink,
            );
            const rawValue = this.unwrapRuntimeValue(recordValue);

            if (
                rawValue === null
                || typeof rawValue !== "object"
                || Array.isArray(rawValue)
            ) {
                throw new ValidationError(
                    `daml lf record projection requires an object value for field '${expression.recordProjection.fieldName}'`,
                );
            }

            return this.hydrateRuntimeValue(
                (rawValue as Record<string, unknown>)[
                    expression.recordProjection.fieldName
                ],
            );
        }

        if (expression.variantConstruction !== undefined) {
            return this.hydrateRuntimeValue({
                constructor: expression.variantConstruction.constructorName,
                value: this.unwrapRuntimeValue(
                    this.evaluateExpressionOrThrow(
                        expression.variantConstruction.argument,
                        frame,
                        traceSink,
                    ),
                ),
            });
        }

        if (expression.optionalConstruction !== undefined) {
            return expression.optionalConstruction.value === undefined
                ? ({
                    kind: "unit",
                } satisfies IUnitRuntimeValue)
                : this.evaluateExpressionOrThrow(
                    expression.optionalConstruction.value,
                    frame,
                    traceSink,
                );
        }

        if (expression.enumConstruction !== undefined) {
            return this.hydrateRuntimeValue(
                expression.enumConstruction.constructorName,
            );
        }

        if (expression.listConstruction !== undefined) {
            const front = expression.listConstruction.front.map((item) =>
                this.unwrapRuntimeValue(
                    this.evaluateExpressionOrThrow(item, frame, traceSink),
                ),
            );
            const tail =
                expression.listConstruction.tail === undefined
                    ? []
                    : this.unwrapRuntimeValue(
                        this.evaluateExpressionOrThrow(
                            expression.listConstruction.tail,
                            frame,
                            traceSink,
                        ),
                    );

            if (!Array.isArray(tail)) {
                throw new ValidationError(
                    "daml lf list construction requires an array tail",
                );
            }

            return this.hydrateRuntimeValue([...front, ...tail]);
        }

        if (expression.caseExpression !== undefined) {
            const scrutinee = this.evaluateExpressionOrThrow(
                expression.caseExpression.scrutinee,
                frame,
                traceSink,
            );
            const matchingAlternative =
                expression.caseExpression.alternatives.find((alternative) =>
                    this.matchesCaseAlternative(alternative, scrutinee),
                );

            if (matchingAlternative === undefined) {
                throw new ValidationError(
                    "daml lf case expression did not match any alternative",
                );
            }

            if (
                (matchingAlternative.patternKind === "variant"
                    || matchingAlternative.patternKind === "optionalSome"
                    || matchingAlternative.patternKind === "cons")
            ) {
                const rawValue = this.unwrapRuntimeValue(scrutinee);

                if (
                    matchingAlternative.patternKind === "optionalSome"
                    || matchingAlternative.patternKind === "cons"
                    || (
                        rawValue !== null
                        && typeof rawValue === "object"
                        && "value" in rawValue
                    )
                ) {
                    const scopedFrame = this.deriveFrame(
                        frame,
                        frame.scope.createChild(),
                    );
                    if (
                        matchingAlternative.patternKind === "cons"
                        && Array.isArray(rawValue)
                    ) {
                        if (matchingAlternative.headBinderName !== undefined) {
                            scopedFrame.scope.setBinding(
                                matchingAlternative.headBinderName,
                                this.hydrateRuntimeValue(rawValue[0]),
                            );
                        }

                        if (matchingAlternative.tailBinderName !== undefined) {
                            scopedFrame.scope.setBinding(
                                matchingAlternative.tailBinderName,
                                this.hydrateRuntimeValue(rawValue.slice(1)),
                            );
                        }
                    }

                    else if (matchingAlternative.binderName !== undefined) {
                        scopedFrame.scope.setBinding(
                            matchingAlternative.binderName,
                            this.hydrateRuntimeValue(
                                matchingAlternative.patternKind === "optionalSome"
                                    ? rawValue
                                    : (rawValue as { value: unknown }).value,
                            ),
                        );
                    }

                    return this.evaluateExpressionOrThrow(
                        matchingAlternative.body,
                        scopedFrame,
                        traceSink,
                    );
                }
            }

            return this.evaluateExpressionOrThrow(
                matchingAlternative.body,
                frame,
                traceSink,
            );
        }

        if (expression.valueReference !== undefined) {
            const definition = this.compilation.getValueDefinitionOrThrow(
                expression.valueReference.packageId,
                expression.valueReference.moduleName,
                expression.valueReference.definitionName,
            );
            const frame = this.createFrame(definition);

            traceSink?.onStep({
                kind: DamlLfStepKind.call,
                expression,
                frame,
                locals: frame.scope.snapshotBindings(),
            });

            const value = this.evaluateExpressionOrThrow(
                definition.expression,
                frame,
                traceSink,
            );

            traceSink?.onStep({
                kind: DamlLfStepKind.return,
                expression,
                frame,
                locals: frame.scope.snapshotBindings(),
                value,
            });

            return value;
        }

        throw new ValidationError("daml lf expression is not supported yet");
    }

    private evaluateReplayExpressionOrThrow(
        expression: DamlLfExpression,
        frame: DamlLfRuntimeFrame,
        environment: IDamlLfReplayEnvironment,
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (expression.lambda === undefined) {
            return this.evaluateExpressionOrThrow(expression, frame, traceSink);
        }

        const bindingValues = this.resolveEntrypointBindingValues(environment);
        const scopedFrame = this.deriveFrame(
            frame,
            frame.scope.createChild(),
        );

        for (let index = 0; index < expression.lambda.parameters.length; index += 1) {
            const bindingValue = bindingValues[index];

            if (bindingValue === undefined) {
                break;
            }

            scopedFrame.scope.setBinding(
                expression.lambda.parameters[index]!,
                this.hydrateRuntimeValue(bindingValue),
            );
        }

        return this.evaluateExpressionOrThrow(
            expression.lambda.body,
            scopedFrame,
            traceSink,
        );
    }

    private resolveEntrypointBindingValues(
        environment: IDamlLfReplayEnvironment,
    ): readonly unknown[] {
        if (environment.entrypoint.kind === "create") {
            return environment.entrypoint.argument === undefined
                ? []
                : [environment.entrypoint.argument];
        }

        const contractPayload =
            environment.entrypoint.contractId === undefined
                ? undefined
                : environment.contracts?.get(environment.entrypoint.contractId)?.payload;

        return [
            contractPayload,
            environment.entrypoint.argument,
        ].filter((value) => value !== undefined);
    }

    private hydrateRuntimeValue(value: unknown): IDamlLfRuntimeValue {
        if (value === undefined || value === null) {
            return {
                kind: "unit",
            } satisfies IUnitRuntimeValue;
        }

        if (typeof value === "string") {
            return {
                kind: "text",
                value,
            } satisfies ITextRuntimeValue;
        }

        if (typeof value === "boolean") {
            return {
                kind: "boolean",
                value,
            } satisfies IBooleanRuntimeValue;
        }

        return {
            kind: "ledgerValue",
            value,
        } satisfies ILedgerValueRuntimeValue;
    }

    private unwrapRuntimeValue(value: IDamlLfRuntimeValue): unknown {
        if ("value" in value) {
            return value.value;
        }

        if (value.kind === "unit") {
            return null;
        }

        return value.kind;
    }

    private matchesBuiltinConstructor(
        builtinConstructor: DamlLfExpression["builtinConstructor"],
        runtimeValue: IDamlLfRuntimeValue,
    ): boolean {
        switch (builtinConstructor) {
            case "true":
                return runtimeValue.kind === "boolean" && runtimeValue.value === true;
            case "false":
                return runtimeValue.kind === "boolean" && runtimeValue.value === false;
            case "unit":
                return runtimeValue.kind === "unit";
            default:
                return false;
        }
    }

    private matchesCaseAlternative(
        alternative: NonNullable<DamlLfExpression["caseExpression"]>["alternatives"][number],
        runtimeValue: IDamlLfRuntimeValue,
    ): boolean {
        if (alternative.patternKind === "default") {
            return true;
        }

        if (alternative.patternKind === "builtinCon") {
            return this.matchesBuiltinConstructor(
                alternative.builtinConstructor,
                runtimeValue,
            );
        }

        if (alternative.patternKind === "optionalNone") {
            return runtimeValue.kind === "unit";
        }

        if (alternative.patternKind === "optionalSome") {
            return runtimeValue.kind !== "unit";
        }

        if (alternative.patternKind === "enum") {
            return (
                runtimeValue.kind === "text"
                && runtimeValue.value === alternative.constructorName
            );
        }

        if (alternative.patternKind === "nil") {
            return Array.isArray(this.unwrapRuntimeValue(runtimeValue))
                && this.unwrapRuntimeValue(runtimeValue).length === 0;
        }

        if (alternative.patternKind === "cons") {
            return Array.isArray(this.unwrapRuntimeValue(runtimeValue))
                && this.unwrapRuntimeValue(runtimeValue).length > 0;
        }

        const rawValue = this.unwrapRuntimeValue(runtimeValue);

        return (
            rawValue !== null
            && typeof rawValue === "object"
            && "constructor" in rawValue
            && (rawValue as { constructor?: unknown }).constructor
                === alternative.constructorName
        );
    }

    private applyFunctionOrThrow(
        functionValue: IDamlLfRuntimeValue,
        argumentValues: readonly IDamlLfRuntimeValue[],
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (functionValue.kind !== "closure") {
            if (functionValue.kind === "builtin") {
                return this.builtinDispatch.applyOrThrow(
                    functionValue as IBuiltinRuntimeValue,
                    argumentValues,
                );
            }

            throw new ValidationError(
                `daml lf expression is not callable (${functionValue.kind})`,
            );
        }

        const closure = functionValue as IClosureRuntimeValue;
        const boundParameterCount = Math.min(
            closure.parameters.length,
            argumentValues.length,
        );
        const remainingParameters = closure.parameters.slice(boundParameterCount);
        const remainingArguments = argumentValues.slice(boundParameterCount);
        const scope = closure.frame.scope.createChild();

        for (let index = 0; index < boundParameterCount; index += 1) {
            scope.setBinding(closure.parameters[index]!, argumentValues[index]!);
        }

        const appliedFrame = this.deriveFrame(closure.frame, scope);

        const intermediateValue =
            remainingParameters.length === 0
                ? this.evaluateExpressionOrThrow(
                    closure.body,
                    appliedFrame,
                    traceSink,
                )
                : ({
                    kind: "closure",
                    parameters: remainingParameters,
                    body: closure.body,
                    frame: appliedFrame,
                } satisfies IClosureRuntimeValue);

        return remainingArguments.length === 0
            ? intermediateValue
            : this.applyFunctionOrThrow(
                intermediateValue,
                remainingArguments,
                traceSink,
            );
    }

    private deriveFrame(
        frame: DamlLfRuntimeFrame,
        scope: DamlLfLexicalScope,
    ): DamlLfRuntimeFrame {
        return new DamlLfRuntimeFrame({
            frameId: frame.frameId,
            packageId: frame.packageId,
            moduleName: frame.moduleName,
            definition: frame.definition,
            scope,
        });
    }
}
