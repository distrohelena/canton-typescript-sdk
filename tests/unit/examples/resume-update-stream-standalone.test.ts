import { describe, expect, it } from "vitest";
import { runResumeUpdateStreamStandaloneAsync } from "../../../examples/shared/resume-update-stream-standalone.js";

describe("resume update-stream standalone lifecycle", () => {
    it("preserves a workflow failure when client disposal also fails and disposes exactly once", async () => {
        const workflowFailure = new Error("workflow failed");

        const cleanupFailure = new Error("cleanup failed");

        let disposeCalls = 0;

        await expect(
            runResumeUpdateStreamStandaloneAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;

                    throw cleanupFailure;
                },
                runWorkflowAsync: async () => {
                    throw workflowFailure;
                },
            }),
        ).rejects.toBe(workflowFailure);
        expect(disposeCalls).toBe(1);
    });

    it("surfaces a disposal failure after a successful workflow and disposes exactly once", async () => {
        const cleanupFailure = new Error("cleanup failed");

        let disposeCalls = 0;

        await expect(
            runResumeUpdateStreamStandaloneAsync({
                disposeAsync: async () => {
                    disposeCalls += 1;

                    throw cleanupFailure;
                },
                runWorkflowAsync: async () => undefined,
            }),
        ).rejects.toBe(cleanupFailure);
        expect(disposeCalls).toBe(1);
    });
});
