import { describe, expect, it } from "vitest";
import {
    WORKFLOW_TIMEOUT_ERROR_MESSAGE,
    createWorkflowDeadline,
} from "../../../examples/shared/workflow-deadline.js";

describe("workflow deadline", () => {
    it("uses one absolute deadline and derives the idle probe from it", () => {
        let currentTime = 10_000;

        const deadline = createWorkflowDeadline({
            timeoutMs: 8_000,
            now: () => currentTime,
        });

        expect(deadline.idleProbeMs()).toBe(2_000);
        expect(deadline.remainingMs()).toBe(8_000);

        currentTime += 1_500;

        expect(deadline.remainingMs()).toBe(6_500);

        currentTime -= 1_000;

        expect(deadline.remainingMs()).toBe(6_500);
    });

    it("caps the idle probe by the remaining budget and fails stably at expiry", () => {
        let currentTime = 0;

        const deadline = createWorkflowDeadline({
            timeoutMs: 7,
            now: () => currentTime,
        });

        expect(deadline.idleProbeMs()).toBe(1);

        currentTime = 6;
        expect(deadline.idleProbeMs()).toBe(1);

        currentTime = 7;
        expect(() => deadline.remainingMs()).toThrow(
            WORKFLOW_TIMEOUT_ERROR_MESSAGE,
        );
        expect(() => deadline.idleProbeMs()).toThrow(
            WORKFLOW_TIMEOUT_ERROR_MESSAGE,
        );
    });

    it("uses the minimum one-millisecond idle probe for very short budgets", () => {
        const deadline = createWorkflowDeadline({ timeoutMs: 1, now: () => 100 });

        expect(deadline.idleProbeMs()).toBe(1);
        expect(deadline.remainingMs()).toBe(1);
    });

    it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.MAX_SAFE_INTEGER + 1])(
        "rejects an invalid timeout %s",
        timeoutMs => {
            expect(() => createWorkflowDeadline({ timeoutMs })).toThrow(
                /timeoutMs/i,
            );
        },
    );

    it("rejects a clock that cannot represent a safe absolute deadline", () => {
        expect(() =>
            createWorkflowDeadline({
                timeoutMs: 1,
                now: () => Number.MAX_SAFE_INTEGER,
            }),
        ).toThrow(/now/i);
    });
});
