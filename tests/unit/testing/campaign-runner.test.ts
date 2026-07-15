import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import {
    evaluateCampaignInvariantsAsync,
    runCampaignLifecycleCheckAsync,
    runCampaignCheckAsync,
} from "../../../src/testing/campaign/campaign-runner.js";
import { CampaignMetricOutcome } from "../../../src/testing/campaign/campaign-metrics.js";

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

describe("campaign lifecycle execution", () => {
    test("continues through a permissive protocol revert while preserving exact depth", async () => {
        const calls: string[] = [];

        const result = await runCampaignLifecycleCheckAsync({
            arbitrary: fc.constant([
                { actor: "issuer", targetKey: "Main:Iou:Archive", id: "revert" },
                { actor: "issuer", targetKey: "Main:Iou:Create", id: "accepted" },
            ]),
            depth: 2,
            failOnRevert: false,
            key: (actions) => actions.map((action) => action.id).join(","),
            numRuns: 1,
            setupAsync: async () => {
                calls.push("setup");

                return {};
            },
            reconcileAsync: async (_context, phase) => {
                calls.push(`reconcile:${phase.kind}`);
            },
            executeAsync: async (_context, action): Promise<CampaignMetricOutcome> => {
                calls.push(`execute:${action.id}`);

                return action.id === "revert"
                    ? { kind: "protocol-revert", reason: "missing active contract" }
                    : { kind: "accepted", updateId: "update-1" };
            },
            checkInvariantsAsync: async (_context, phase) => {
                calls.push(`invariants:${phase.kind}`);

                return [];
            },
            cleanupAsync: async () => {
                calls.push("cleanup");
            },
        });

        expect(result.details.failed).toBe(false);
        expect(calls).toEqual([
            "setup",
            "reconcile:before-run",
            "invariants:before-run",
            "execute:revert",
            "invariants:after-action",
            "execute:accepted",
            "reconcile:after-action",
            "invariants:after-action",
            "invariants:after-run",
            "cleanup",
            "invariants:post-cleanup",
        ]);
    });

    test("stops a candidate on a strict protocol revert and still cleans up", async () => {
        const calls: string[] = [];

        const result = await runCampaignLifecycleCheckAsync({
            arbitrary: fc.constant([
                { actor: "issuer", targetKey: "Main:Iou:Archive" },
                { actor: "issuer", targetKey: "Main:Iou:Create" },
            ]),
            depth: 2,
            failOnRevert: true,
            key: () => "strict-revert",
            numRuns: 1,
            setupAsync: async () => ({}),
            executeAsync: async (): Promise<CampaignMetricOutcome> => {
                calls.push("execute");

                return { kind: "protocol-revert", reason: "missing active contract" };
            },
            cleanupAsync: async () => {
                calls.push("cleanup");
            },
        });

        expect(result.details.failed).toBe(true);
        expect(result.counterexampleTrace?.actions).toHaveLength(1);
        expect(calls).toEqual(["execute", "cleanup"]);
    });
});
