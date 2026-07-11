import { describe, expect, it } from "vitest";
import {
    LedgerReplayDebuggerClient,
    ReplayDeterminismException,
    ReplayPhase,
    ReplaySessionRequest,
    ReplayStepAdvanceResult,
    ReplayValuePreview,
} from "../../../src/debugger/index.js";

describe("debugger public surface", () => {
    it("stores a replay session request offset", () => {
        const request = new ReplaySessionRequest({
            offset: "0000000000000001",
        });

        expect(request.offset).toBe("0000000000000001");
    });

    it("stores step advance results", () => {
        const result = new ReplayStepAdvanceResult({
            sessionId: "session-1",
            step: {
                stepId: "step-1",
                stepIndex: 1,
                phase: ReplayPhase.enterExpression,
                stackFrames: [],
                scopes: [],
                locals: [],
                arguments: [],
                stateDelta: {
                    kind: "create",
                    eventOrdinal: 0,
                    comparisonKey: "event-0",
                },
                valuePreview: undefined,
            },
            isTerminal: false,
            nextStepIndex: 2,
        });

        expect(result.nextStepIndex).toBe(2);
        expect(result.step).toEqual(
            expect.objectContaining({
                stepId: "step-1",
                stepIndex: 1,
                scopes: [],
                stateDelta: expect.objectContaining({
                    kind: "create",
                    eventOrdinal: 0,
                    comparisonKey: "event-0",
                }),
            }),
        );
    });

    it("exports the debugger client and replay exceptions", () => {
        expect(LedgerReplayDebuggerClient).toBeTypeOf("function");
        expect(new ReplayDeterminismException("mismatch")).toBeInstanceOf(Error);
    });

    it("stores value previews for replay steps", () => {
        const preview = new ReplayValuePreview({
            kind: "record",
            display: "Main.Vault(owner = Alice)",
        });

        expect(preview.display).toContain("Vault");
    });
});
