import { DamlLfCompilation } from "../daml-lf-compilation.js";
import { DamlLfExpression } from "../model/daml-lf-expression.js";
import { DamlLfValueDefinition } from "../model/daml-lf-value-definition.js";
import { DamlLfBuiltinDispatch } from "./daml-lf-builtin-dispatch.js";
import { DamlLfLexicalScope } from "./daml-lf-lexical-scope.js";
import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";
import { DamlLfRuntimeFrame } from "./daml-lf-runtime-frame.js";
import { DamlLfStepKind } from "./daml-lf-step-kind.js";
import { IDamlLfTraceSink } from "./daml-lf-trace-sink.interface.js";

interface ITextRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "text";
    readonly value: string;
}

interface IUnitRuntimeValue extends IDamlLfRuntimeValue {
    readonly kind: "unit";
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
        const frame = new DamlLfRuntimeFrame({
            frameId: `frame-${this.nextFrameNumber++}`,
            definition,
            scope: new DamlLfLexicalScope(),
        });

        return this.evaluateExpressionOrThrow(
            definition.expression,
            frame,
            traceSink,
        );
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

        const value = this.resolveExpressionValue(expression);

        traceSink?.onStep({
            kind: DamlLfStepKind.exitExpression,
            expression,
            frame,
            value,
        });

        return value;
    }

    private resolveExpressionValue(
        expression: DamlLfExpression,
    ): IDamlLfRuntimeValue {
        if (expression.textLiteral !== undefined) {
            return {
                kind: "text",
                value: expression.textLiteral,
            } satisfies ITextRuntimeValue;
        }

        return {
            kind: "unit",
        } satisfies IUnitRuntimeValue;
    }
}
