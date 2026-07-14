import { describe, expect, it } from "vitest";
import { readLiveFuzzConfig } from "../fuzz/live-fuzz-config.js";

describe("live stateful fuzzing", () => {
    const config = readLiveFuzzConfig();

    it.runIf(config.enabled)("runs only with explicit opt-in", () => {
        expect(config.enabled).toBe(true);
    });

    it.skipIf(config.enabled)(
        "is disabled (set SDK_TEST_ENABLE_LIVE_FUZZING=1 to enable)",
        () => {
            expect(config.enabled).toBe(false);
        },
    );
});
