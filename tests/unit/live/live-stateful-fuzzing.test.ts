import { afterEach, describe, expect, it } from "vitest";
import { propertyParameters } from "../../property/property-test-options.js";
import { readLiveFuzzConfig } from "../../live/fuzz/live-fuzz-config.js";

const environmentKeys = [
    "SDK_TEST_ENABLE_LIVE_FUZZING",
    "FUZZ_NUM_RUNS",
    "FUZZ_SEED",
    "FUZZ_PATH",
    "FUZZ_LIVE_MAX_COMMANDS",
    "FUZZ_LIVE_POLL_TIMEOUT_MS",
    "FUZZ_LIVE_POLL_INTERVAL_MS",
    "FUZZ_LIVE_TEST_TIMEOUT_MS",
    "FUZZ_LIVE_CLEANUP_TIMEOUT_MS",
    "FUZZ_LIVE_REQUIRE_ARCHIVE",
    "FUZZ_LIVE_RUN_ID",
    "FUZZ_LIVE_ISSUER_PARTY",
    "FUZZ_LIVE_OWNER_PARTY",
] as const;

const originalEnvironment = new Map(
    environmentKeys.map((key) => [key, process.env[key]]),
);

afterEach(() => {
    for (const key of environmentKeys) {
        const value = originalEnvironment.get(key);

        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

describe("live fuzz configuration", () => {
    it("is disabled unless explicitly enabled", () => {
        delete process.env.SDK_TEST_ENABLE_LIVE_FUZZING;

        expect(readLiveFuzzConfig().enabled).toBe(false);
    });

    it("uses live defaults without changing offline property defaults", () => {
        delete process.env.FUZZ_NUM_RUNS;
        delete process.env.FUZZ_SEED;
        delete process.env.FUZZ_PATH;

        expect(readLiveFuzzConfig()).toMatchObject({
            numRuns: 20,
            maxCommands: 8,
            pollTimeoutMs: 10_000,
            pollIntervalMs: 100,
            testTimeoutMs: 300_000,
            cleanupTimeoutMs: 5_000,
        });
        expect(propertyParameters()).toEqual({ numRuns: 100 });
    });

    it("accepts reproducibility, party, and smoke options", () => {
        process.env.SDK_TEST_ENABLE_LIVE_FUZZING = "1";
        process.env.FUZZ_NUM_RUNS = "7";
        process.env.FUZZ_SEED = "123";
        process.env.FUZZ_PATH = "0:1";
        process.env.FUZZ_LIVE_REQUIRE_ARCHIVE = "1";
        process.env.FUZZ_LIVE_RUN_ID = "replay-run";
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";
        process.env.FUZZ_LIVE_OWNER_PARTY = "owner::def";

        expect(readLiveFuzzConfig()).toMatchObject({
            enabled: true,
            numRuns: 7,
            seed: 123,
            path: "0:1",
            requireArchive: true,
            runId: "replay-run",
            issuerParty: "issuer::abc",
            ownerParty: "owner::def",
        });
    });

    it.each([
        "0",
        "-1",
        "1.5",
        "not-a-number",
        "9007199254740992",
    ])("rejects unsafe live limit %s", (value) => {
        process.env.FUZZ_LIVE_MAX_COMMANDS = value;

        expect(() => readLiveFuzzConfig()).toThrow(/FUZZ_LIVE_MAX_COMMANDS/);
    });

    it("requires both supplied party IDs", () => {
        process.env.FUZZ_LIVE_ISSUER_PARTY = "issuer::abc";

        expect(() => readLiveFuzzConfig()).toThrow(/together/);
    });
});
