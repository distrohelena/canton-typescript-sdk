export class ReplaySessionMetadata {
    public readonly sessionId?: string;
    public readonly offset?: string;
    public readonly stepCount?: number;

    public constructor(init?: {
        sessionId?: string;
        offset?: string;
        stepCount?: number;
    }) {
        this.sessionId = init?.sessionId;
        this.offset = init?.offset;
        this.stepCount = init?.stepCount;
    }
}
