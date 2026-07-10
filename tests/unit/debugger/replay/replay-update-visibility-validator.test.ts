import { describe, expect, it } from "vitest";
import { ReplayUnsupportedUpdateException } from "../../../../src/debugger/index.js";
import {
    validateReplayVisibilityOrThrow,
} from "../../../../src/debugger/replay/replay-update-visibility-validator.js";

describe("validateReplayVisibilityOrThrow", () => {
    it("rejects filtered updates missing replay-critical exercised details", () => {
        expect(() =>
            validateReplayVisibilityOrThrow({
                updateId: "tx-1",
                offset: "42",
                events: [
                    {
                        event: {
                            oneofKind: "exercised",
                            exercised: {
                                contractId: "00abc",
                                choice: "Archive",
                            },
                        },
                    },
                ],
            }),
        ).toThrow(ReplayUnsupportedUpdateException);
    });
});
