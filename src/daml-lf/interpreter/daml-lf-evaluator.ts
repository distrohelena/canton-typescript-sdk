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
        });

        const value = this.resolveExpressionValue(expression, traceSink);

        traceSink?.onStep({
            kind: DamlLfStepKind.exitExpression,
            expression,
            frame,
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
        traceSink?: IDamlLfTraceSink,
    ): IDamlLfRuntimeValue {
        if (expression.textLiteral !== undefined) {
            return {
                kind: "text",
                value: expression.textLiteral,
            } satisfies ITextRuntimeValue;
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
                value,
            });

            return value;
        }

        return {
            kind: "unit",
        } satisfies IUnitRuntimeValue;
    }
}
