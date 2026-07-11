import { ReplaySession } from "./session/replay-session.js";
import { ReplaySessionMetadata } from "./session/replay-session-metadata.js";
import { ReplaySessionRequest } from "./session/replay-session-request.js";
import { ReplayScope } from "./session/replay-scope.js";
import { ReplayStackFrame } from "./session/replay-stack-frame.js";
import { ReplayStep } from "./session/replay-step.js";
import { ReplayStepAdvanceResult } from "./session/replay-step-advance-result.js";
import { InMemoryReplaySessionStore } from "./session/in-memory-replay-session-store.js";
import { LedgerReplaySessionLoader } from "./replay/ledger-replay-session-loader.js";

export class LedgerReplayDebuggerClient {
    private readonly sessionStore: InMemoryReplaySessionStore;

    public constructor(
        private readonly dependencies: {
            sessionLoader: LedgerReplaySessionLoader;
            sessionStore?: InMemoryReplaySessionStore;
        },
    ) {
        this.sessionStore =
            this.dependencies.sessionStore ?? new InMemoryReplaySessionStore();
    }

    public async loadSessionAsync(
        request: ReplaySessionRequest,
    ): Promise<ReplaySession> {
        const loadedSession =
            await this.dependencies.sessionLoader.loadOrThrowAsync(request);

        return this.getStore().put(loadedSession);
    }

    public async getSessionMetadataAsync(
        sessionId: string,
    ): Promise<ReplaySessionMetadata> {
        return this.getStore().getSessionMetadataOrThrow(sessionId);
    }

    public async getCurrentStepAsync(sessionId: string): Promise<ReplayStep> {
        return this.getStore().getCurrentStepOrThrow(sessionId);
    }

    public async stepIntoAsync(
        sessionId: string,
    ): Promise<ReplayStepAdvanceResult> {
        return this.getStore().advanceIntoOrThrow(sessionId);
    }

    public async stepBackAsync(
        sessionId: string,
    ): Promise<ReplayStepAdvanceResult> {
        return this.getStore().advanceBackOrThrow(sessionId);
    }

    public async stepOverAsync(
        sessionId: string,
    ): Promise<ReplayStepAdvanceResult> {
        return this.getStore().advanceOverOrThrow(sessionId);
    }

    public async stepOutAsync(
        sessionId: string,
    ): Promise<ReplayStepAdvanceResult> {
        return this.getStore().advanceOutOrThrow(sessionId);
    }

    public async continueAsync(
        sessionId: string,
    ): Promise<ReplayStepAdvanceResult> {
        return this.getStore().continueOrThrow(sessionId);
    }

    public async jumpToStepAsync(
        sessionId: string,
        stepId: string,
    ): Promise<ReplayStepAdvanceResult> {
        return this.getStore().setCurrentStepByIdOrThrow(sessionId, stepId);
    }

    public async getStackAsync(
        sessionId: string,
    ): Promise<readonly ReplayStackFrame[]> {
        return this.getStore().getStackOrThrow(sessionId);
    }

    public async getScopesAsync(
        sessionId: string,
        frameId: string,
    ): Promise<readonly ReplayScope[]> {
        return this.getStore().getScopesOrThrow(sessionId, frameId);
    }

    public async getTraceSliceAsync(
        sessionId: string,
        startIndex: number,
        endIndex: number,
    ): Promise<readonly ReplayStep[]> {
        return this.getStore().getTraceSliceOrThrow(
            sessionId,
            startIndex,
            endIndex,
        );
    }

    public async disposeSessionAsync(sessionId: string): Promise<void> {
        this.getStore().dispose(sessionId);
    }

    private getStore(): InMemoryReplaySessionStore {
        return this.sessionStore;
    }
}
