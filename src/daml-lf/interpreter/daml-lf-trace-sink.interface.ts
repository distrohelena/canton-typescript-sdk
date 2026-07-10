import { DamlLfExpression } from "../model/daml-lf-expression.js";
import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";
import { DamlLfRuntimeFrame } from "./daml-lf-runtime-frame.js";
import { DamlLfStepKind } from "./daml-lf-step-kind.js";

export interface IDamlLfTraceStep {
    readonly kind: DamlLfStepKind;
    readonly expression: DamlLfExpression;
    readonly frame: DamlLfRuntimeFrame;
    readonly value?: IDamlLfRuntimeValue;
}

export interface IDamlLfTraceSink {
    onStep(step: IDamlLfTraceStep): void;
}
