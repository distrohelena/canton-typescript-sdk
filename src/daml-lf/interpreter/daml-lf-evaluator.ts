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

interface IUnitRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "unit";
}

interface IClosureRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "closure";
    readonly parameters: readonly string[];
    readonly body: DamlLfExpression;
    readonly frame: DamlLfRuntimeFrame;
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
            value: this.evaluateExpressionOrThrow(
                definition.expression,
                frame,
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

        return {
            kind: "unit",
        } satisfies IUnitRuntimeValue;
    }

    private applyFunctionOrThrow(
        functionValue: IDamlLfRuntimeValue,
        argumentValues: readonly IDamlLfRuntimeValue[],
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (functionValue.kind !== "closure") {
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
