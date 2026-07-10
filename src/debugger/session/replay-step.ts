import { ReplayPhase } from "./replay-phase.js";
import { ReplayStackFrame } from "./replay-stack-frame.js";
import { ReplayStateDelta } from "./replay-state-delta.js";
import { ReplayValuePreview } from "./replay-value-preview.js";

export class ReplayStep {
    public readonly stepIndex: number;
    public readonly phase: ReplayPhase;
    public readonly stackFrames: readonly ReplayStackFrame[];
    public readonly locals: readonly unknown[];
    public readonly arguments: readonly unknown[];
    public readonly valuePreview?: ReplayValuePreview;
    public readonly stateDelta?: ReplayStateDelta;

    public constructor(init: {
        stepIndex: number;
        phase: ReplayPhase;
        stackFrames?: readonly ReplayStackFrame[];
        locals?: readonly unknown[];
        arguments?: readonly unknown[];
        valuePreview?: ReplayValuePreview;
        stateDelta?: ReplayStateDelta;
    }) {
        this.stepIndex = init.stepIndex;
        this.phase = init.phase;
        this.stackFrames = init.stackFrames ?? [];
        this.locals = init.locals ?? [];
        this.arguments = init.arguments ?? [];
        this.valuePreview = init.valuePreview;
        this.stateDelta = init.stateDelta;
    }
}
