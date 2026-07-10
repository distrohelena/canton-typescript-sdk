import { ReplaySessionMetadata } from "./replay-session-metadata.js";
import { ReplayStep } from "./replay-step.js";

export class ReplaySession {
    public readonly sessionId?: string;
    public readonly metadata?: ReplaySessionMetadata;
    public readonly currentStep?: ReplayStep;

    public constructor(init?: {
        sessionId?: string;
        metadata?: ReplaySessionMetadata;
        currentStep?: ReplayStep;
    }) {
        this.sessionId = init?.sessionId;
        this.metadata = init?.metadata;
        this.currentStep = init?.currentStep;
    }
}
