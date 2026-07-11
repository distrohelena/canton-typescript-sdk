import { ReplayPhase } from "./replay-phase.js";
import { ReplayScope } from "./replay-scope.js";
import { ReplaySourceLocation } from "./replay-source-location.js";
import { ReplayStackFrame } from "./replay-stack-frame.js";
import { ReplayStateDelta } from "./replay-state-delta.js";
import { ReplayValuePreview } from "./replay-value-preview.js";

export class ReplayStep {
    public readonly stepId: string;
    public readonly stepIndex: number;
    public readonly phase: ReplayPhase;
    public readonly stackFrames: readonly ReplayStackFrame[];
    public readonly scopes: readonly ReplayScope[];
    public readonly locals: readonly unknown[];
    public readonly arguments: readonly unknown[];
    public readonly sourceLocation?: ReplaySourceLocation;
    public readonly valuePreview?: ReplayValuePreview;
    public readonly stateDelta?: ReplayStateDelta;

    public constructor(init: {
        stepId?: string;
        stepIndex: number;
        phase: ReplayPhase;
        stackFrames?: readonly ReplayStackFrame[];
        scopes?: readonly ReplayScope[];
        locals?: readonly unknown[];
        arguments?: readonly unknown[];
        sourceLocation?: ReplaySourceLocation;
        valuePreview?: ReplayValuePreview;
        stateDelta?: ReplayStateDelta;
    }) {
        this.stepId = init.stepId ?? `step-${init.stepIndex}`;
        this.stepIndex = init.stepIndex;
        this.phase = init.phase;
        this.stackFrames = init.stackFrames ?? [];
        this.scopes = init.scopes ?? [];
        this.locals = init.locals ?? [];
        this.arguments = init.arguments ?? [];
        this.sourceLocation = init.sourceLocation;
        this.valuePreview = init.valuePreview;
        this.stateDelta = init.stateDelta;
    }
}
