import * as fc from "fast-check";
import { afterEach, describe, expect, it } from "vitest";
import { propertyParameters } from "./property-test-options.js";

const environmentKeys = ["FUZZ_NUM_RUNS", "FUZZ_SEED", "FUZZ_PATH"] as const;

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

describe("property test options", () => {
    it("defaults to one hundred runs", () => {
        delete process.env.FUZZ_NUM_RUNS;
        delete process.env.FUZZ_SEED;
        delete process.env.FUZZ_PATH;

        expect(propertyParameters()).toEqual({ numRuns: 100 });
    });

    it("allows callers to choose a different default run count", () => {
        delete process.env.FUZZ_NUM_RUNS;

        expect(propertyParameters({ defaultNumRuns: 20 })).toEqual({
            numRuns: 20,
        });
    });

    it("parses reproducibility options", () => {
        process.env.FUZZ_NUM_RUNS = "25";
        process.env.FUZZ_SEED = "12345";
        process.env.FUZZ_PATH = "0:1:2";

        expect(propertyParameters()).toEqual({
            numRuns: 25,
            seed: 12345,
            path: "0:1:2",
        });
    });

    it.each([
        "0",
        "-1",
        "1.5",
        "not-a-number",
    ])("rejects invalid run count %s", (value) => {
        process.env.FUZZ_NUM_RUNS = value;

        expect(() => propertyParameters()).toThrow(/FUZZ_NUM_RUNS/);
    });

    it.each(["1.5", "not-a-number"])(
        "rejects invalid seed %s",
        (value) => {
            process.env.FUZZ_SEED = value;

            expect(() => propertyParameters()).toThrow(/FUZZ_SEED/);
        },
    );

    it.each(["", "1:", ":1", "not-a-path"])(
        "rejects invalid shrink path %s",
        (value) => {
            process.env.FUZZ_PATH = value;

            expect(() => propertyParameters()).toThrow(/FUZZ_PATH/);
        },
    );

    it("replays a shrunk failure with the returned seed and path", () => {
        const first = fc.check(
            fc.property(fc.integer(), () => false),
            { numRuns: 25, seed: 12345 },
        );

        expect(first.failed).toBe(true);
        expect(first.counterexamplePath).toBeDefined();

        process.env.FUZZ_SEED = String(first.seed);
        process.env.FUZZ_PATH = first.counterexamplePath;

        const replay = fc.check(
            fc.property(fc.integer(), () => false),
            propertyParameters(),
        );

        expect(replay.failed).toBe(true);
        expect(replay.counterexample).toEqual(first.counterexample);
    });
});
