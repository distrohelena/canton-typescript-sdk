import { ReplayStep } from "./replay-step.js";

export class ReplayStepAdvanceResult {
    public readonly sessionId: string;
    public readonly step: ReplayStep;
    public readonly isTerminal: boolean;
    public readonly nextStepIndex?: number;

    public constructor(init: {
        sessionId: string;
        step: {
            stepIndex: number;
            phase: ReplayStep["phase"];
            stackFrames?: ReplayStep["stackFrames"];
            locals?: ReplayStep["locals"];
            arguments?: ReplayStep["arguments"];
            valuePreview?: ReplayStep["valuePreview"];
            stateDelta?: ReplayStep["stateDelta"];
        } | ReplayStep;
        isTerminal: boolean;
        nextStepIndex?: number;
    }) {
        this.sessionId = init.sessionId;
        this.step =
            init.step instanceof ReplayStep
                ? init.step
                : new ReplayStep(init.step);
        this.isTerminal = init.isTerminal;
        this.nextStepIndex = init.nextStepIndex;
    }
}
