import { DamlLfExpression } from "../model/daml-lf-expression.js";
import { IDamlLfRuntimeValue } from "./daml-lf-runtime-value.js";
import { DamlLfRuntimeFrame } from "./daml-lf-runtime-frame.js";
import { DamlLfStepKind } from "./daml-lf-step-kind.js";

export interface IDamlLfReplayEffect {
    readonly kind: "create" | "exercise" | "archive" | "fetch" | "lookup";
    readonly contractId?: string;
    readonly templateId?: {
        readonly packageId?: string;
        readonly moduleName?: string;
        readonly entityName?: string;
    };
    readonly choice?: string;
    readonly argument?: unknown;
    readonly payload?: unknown;
}

export interface IDamlLfTraceStep {
    readonly kind: DamlLfStepKind;
    readonly expression: DamlLfExpression;
    readonly frame: DamlLfRuntimeFrame;
    readonly value?: IDamlLfRuntimeValue;
    readonly stateEffect?: IDamlLfReplayEffect;
}

export interface IDamlLfTraceSink {
    onStep(step: IDamlLfTraceStep): void;
}
