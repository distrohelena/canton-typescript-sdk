import { TimeoutError } from "../errors/timeout-error.js";
import { ValidationError } from "../errors/validation-error.js";
import { RequestOptions } from "./request-options.js";

export class OperationDeadline {
    private readonly endsAtMs: number;
    private readonly now: () => number;
    private remainingMs: number;

    public constructor(init: { timeoutMs: number; now?: () => number }) {
        if (!Number.isSafeInteger(init.timeoutMs) || init.timeoutMs <= 0) {
            throw new ValidationError("operation deadline timeout must be a positive safe integer");
        }

        this.now = init.now ?? Date.now;

        const startedAtMs = this.safeNow();

        this.endsAtMs = startedAtMs + init.timeoutMs;

        if (!Number.isSafeInteger(this.endsAtMs)) {
            throw new ValidationError("operation deadline end time must be a safe integer");
        }

        this.remainingMs = init.timeoutMs;
    }

    public remainingTimeoutMs(): number {
        const computedRemainingMs = Math.max(0, this.endsAtMs - this.safeNow());

        this.remainingMs = Math.min(this.remainingMs, computedRemainingMs);

        if (this.remainingMs === 0) {
            throw new TimeoutError("operation deadline has expired");
        }

        return this.remainingMs;
    }

    public createRequestOptions(): RequestOptions {
        return new RequestOptions({ timeoutMs: this.remainingTimeoutMs() });
    }

    private safeNow(): number {
        const now = this.now();

        if (!Number.isSafeInteger(now)) {
            throw new ValidationError("operation deadline clock must return a safe integer");
        }

        return now;
    }
}
