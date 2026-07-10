import { ValidationError } from "../../core/errors/validation-error.js";
import { ILoadedReplaySession } from "../replay/ledger-replay-session-loader.js";
import { ReplayScope } from "./replay-scope.js";
import { ReplaySession } from "./replay-session.js";
import { ReplaySessionMetadata } from "./replay-session-metadata.js";
import { ReplayStackFrame } from "./replay-stack-frame.js";
import { ReplayStep } from "./replay-step.js";
import { ReplayStepAdvanceResult } from "./replay-step-advance-result.js";

interface IStoredReplaySession extends ILoadedReplaySession {}

export class InMemoryReplaySessionStore {
    private readonly sessions = new Map<string, IStoredReplaySession>();

    public put(session: ILoadedReplaySession): ReplaySession {
        this.sessions.set(session.sessionId, session);

        return this.toReplaySession(session);
    }

    public getSessionMetadataOrThrow(sessionId: string): ReplaySessionMetadata {
        return this.getRecordOrThrow(sessionId).metadata;
    }

    public getCurrentStepOrThrow(sessionId: string): ReplayStep {
        const record = this.getRecordOrThrow(sessionId);
        return record.steps[record.currentStepIndex]!;
    }

    public advanceOrThrow(sessionId: string): ReplayStepAdvanceResult {
        const record = this.getRecordOrThrow(sessionId);
        const nextIndex = Math.min(
            record.currentStepIndex + 1,
            record.steps.length - 1,
        );

        record.currentStepIndex = nextIndex;

        return this.toAdvanceResult(record);
    }

    public continueOrThrow(sessionId: string): ReplayStepAdvanceResult {
        const record = this.getRecordOrThrow(sessionId);
        record.currentStepIndex = record.steps.length - 1;
        return this.toAdvanceResult(record);
    }

    public getStackOrThrow(sessionId: string): readonly ReplayStackFrame[] {
        return this.getCurrentStepOrThrow(sessionId).stackFrames;
    }

    public getScopesOrThrow(
        sessionId: string,
        frameId: string,
    ): readonly ReplayScope[] {
        const currentStep = this.getCurrentStepOrThrow(sessionId);
        const frame = currentStep.stackFrames.find(
            (candidate) => candidate.frameId === frameId,
        );

        if (frame === undefined) {
            return [];
        }

        return [
            new ReplayScope({
                frameId,
                name: frame.name,
                variables: currentStep.locals,
            }),
        ];
    }

    public getTraceSliceOrThrow(
        sessionId: string,
        startIndex: number,
        endIndex: number,
    ): readonly ReplayStep[] {
        return this.getRecordOrThrow(sessionId).steps.slice(startIndex, endIndex);
    }

    public dispose(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    private getRecordOrThrow(sessionId: string): IStoredReplaySession {
        const session = this.sessions.get(sessionId);

        if (session === undefined) {
            throw new ValidationError(
                `replay session '${sessionId}' does not exist`,
            );
        }

        return session;
    }

    private toReplaySession(session: IStoredReplaySession): ReplaySession {
        return new ReplaySession({
            sessionId: session.sessionId,
            metadata: session.metadata,
            currentStep: session.steps[session.currentStepIndex],
        });
    }

    private toAdvanceResult(
        session: IStoredReplaySession,
    ): ReplayStepAdvanceResult {
        return new ReplayStepAdvanceResult({
            sessionId: session.sessionId,
            step: session.steps[session.currentStepIndex]!,
            isTerminal: session.currentStepIndex >= session.steps.length - 1,
            nextStepIndex:
                session.currentStepIndex >= session.steps.length - 1
                    ? undefined
                    : session.currentStepIndex + 1,
        });
    }
}
