import {
    OperationDeadline,
    RequestOptions,
    TimeoutError,
    ValidationError,
} from "../../../../src";
import { describe, expect, it, vi } from "vitest";

function clock(...samples: readonly unknown[]): () => number {
    const remainingSamples = [...samples];

    return vi.fn(() => {
        if (remainingSamples.length === 0) {
            throw new Error("Clock sample was not listed by this test");
        }

        return remainingSamples.shift() as number;
    });
}

describe("OperationDeadline", () => {
    it("samples the clock exactly once during construction", () => {
        const now = clock(1_000);

        new OperationDeadline({ timeoutMs: 100, now });

        expect(now).toHaveBeenCalledTimes(1);
    });

    it("returns a positive safe integer before the deadline", () => {
        const deadline = new OperationDeadline({
            timeoutMs: 100,
            now: clock(1_000, 1_099),
        });

        const remainingTimeoutMs = deadline.remainingTimeoutMs();

        expect(remainingTimeoutMs).toBe(1);
        expect(Number.isSafeInteger(remainingTimeoutMs)).toBe(true);
        expect(remainingTimeoutMs).toBeGreaterThan(0);
    });

    it("does not increase the remaining timeout when the clock moves backwards", () => {
        const deadline = new OperationDeadline({
            timeoutMs: 100,
            now: clock(1_000, 1_025, 1_010),
        });

        expect(deadline.remainingTimeoutMs()).toBe(75);
        expect(deadline.remainingTimeoutMs()).toBe(75);
    });

    it("remains expired when the clock moves backwards after expiry", () => {
        const deadline = new OperationDeadline({
            timeoutMs: 100,
            now: clock(1_000, 1_100, 900),
        });

        expect(() => deadline.remainingTimeoutMs()).toThrow(TimeoutError);
        expect(() => deadline.remainingTimeoutMs()).toThrow(TimeoutError);
    });

    it("creates distinct request options with the current remaining timeout", () => {
        const deadline = new OperationDeadline({
            timeoutMs: 100,
            now: clock(1_000, 1_025, 1_035),
        });

        const firstOptions = deadline.createRequestOptions();

        const secondOptions = deadline.createRequestOptions();

        expect(firstOptions).toBeInstanceOf(RequestOptions);
        expect(firstOptions.timeoutMs).toBe(75);
        expect(secondOptions).toBeInstanceOf(RequestOptions);
        expect(secondOptions.timeoutMs).toBe(65);
        expect(secondOptions).not.toBe(firstOptions);
    });

    it.each([
        0,
        -1,
        1.5,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.MAX_SAFE_INTEGER + 1,
    ])("rejects an invalid timeout of %p", timeoutMs => {
        expect(() => new OperationDeadline({ timeoutMs, now: clock(1_000) })).toThrow(ValidationError);
    });

    it.each([
        undefined,
        null,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
    ])("rejects an invalid constructor clock sample of %p", sample => {
        expect(() => new OperationDeadline({
            timeoutMs: 100,
            now: clock(sample),
        })).toThrow(ValidationError);
    });

    it.each([
        undefined,
        null,
        Number.NaN,
        Number.NEGATIVE_INFINITY,
        1.5,
        Number.MAX_SAFE_INTEGER + 1,
    ])("rejects an invalid later clock sample of %p", sample => {
        const deadline = new OperationDeadline({
            timeoutMs: 100,
            now: clock(1_000, sample),
        });

        expect(() => deadline.remainingTimeoutMs()).toThrow(ValidationError);
    });

    it("rejects an end time that would overflow the safe integer range", () => {
        expect(() => new OperationDeadline({
            timeoutMs: 1,
            now: clock(Number.MAX_SAFE_INTEGER),
        })).toThrow(ValidationError);
    });
});
