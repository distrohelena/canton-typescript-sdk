import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import {
    evaluateCampaignInvariantsAsync,
    runCampaignCheckAsync,
} from "../../../src/testing/campaign/campaign-runner.js";

describe("campaign invariant checkpoints", () => {
    test("aggregates every invariant failure at a checkpoint", async () => {
        const calls: string[] = [];

        const failures = await evaluateCampaignInvariantsAsync([
            {
                name: "first",
                check: async () => {
                    calls.push("first");

                    return { code: "first-failure", message: "first failed" };
                },
            },
            {
                name: "second",
                check: async () => {
                    calls.push("second");

                    throw new Error("second failed");
                },
            },
            {
                name: "third",
                check: async () => {
                    calls.push("third");
                },
            },
        ]);

        expect(calls).toEqual(["first", "second", "third"]);
        expect(failures).toEqual([
            { invariant: "first", code: "first-failure", message: "first failed" },
            { invariant: "second", code: "thrown", message: "second failed" },
        ]);
    });
});

describe("fast-check campaign execution", () => {
    test("returns the trace for the final minimized counterexample", async () => {
        const result = await runCampaignCheckAsync({
            arbitrary: fc.integer({ min: 0, max: 20 }),
            numRuns: 20,
            key: (value) => String(value),
            executeAsync: async (value) => ({
                passed: value < 7,
                trace: { value },
            }),
        });

        expect(result.details.failed).toBe(true);
        expect(result.counterexampleTrace).toEqual({ value: 7 });
    });
});
