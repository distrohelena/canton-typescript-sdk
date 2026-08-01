export const WORKFLOW_TIMEOUT_ERROR_MESSAGE = "Workflow timed out.";

export interface WorkflowDeadline {
    readonly idleProbeMs: () => number;
    readonly remainingMs: () => number;
}

export function createWorkflowDeadline(init: {
    readonly timeoutMs: number;
    readonly now?: () => number;
}): WorkflowDeadline {
    if (!Number.isSafeInteger(init.timeoutMs) || init.timeoutMs <= 0) {
        throw new RangeError("timeoutMs must be a positive safe integer.");
    }

    const now = init.now ?? Date.now;

    const startedAtMs = safeNow(now);

    const endsAtMs = startedAtMs + init.timeoutMs;

    if (!Number.isSafeInteger(endsAtMs)) {
        throw new RangeError("now and timeoutMs must form a safe deadline.");
    }

    const idleProbeMs = Math.max(1, Math.min(2_000, Math.floor(init.timeoutMs / 4)));

    let remainingMs = init.timeoutMs;

    const remaining = (): number => {
        const currentRemainingMs = Math.max(0, endsAtMs - safeNow(now));

        remainingMs = Math.min(remainingMs, currentRemainingMs);

        if (remainingMs === 0) {
            throw new Error(WORKFLOW_TIMEOUT_ERROR_MESSAGE);
        }

        return remainingMs;
    };

    return {
        idleProbeMs: () => Math.min(idleProbeMs, remaining()),
        remainingMs: remaining,
    };
}

function safeNow(now: () => number): number {
    const value = now();

    if (!Number.isSafeInteger(value)) {
        throw new RangeError("now must return a safe integer millisecond timestamp.");
    }

    return value;
}
