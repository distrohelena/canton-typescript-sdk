import { describe, expect, test } from "vitest";
import * as fc from "fast-check";
import {
    evaluateCampaignInvariantsAsync,
    runInvariantCampaignCheckAsync,
    runCampaignLifecycleCheckAsync,
    runCampaignCheckAsync,
} from "../../../src/testing/campaign/campaign-runner.js";
import { CampaignMetricOutcome } from "../../../src/testing/campaign/campaign-metrics.js";
import { defineInvariantCampaign } from "../../../src/testing/campaign/campaign-definition.js";

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

    test("honors a configured timeout instead of allowing unbounded candidates", async () => {
        const result = await runCampaignCheckAsync({
            arbitrary: fc.constant("slow"),
            numRuns: 10,
            timeoutMs: 1,
            key: (value) => value,
            executeAsync: async () => {
                await new Promise<void>((resolveDelay) => {
                    setTimeout(resolveDelay, 25);
                });

                return { passed: true, trace: { kind: "slow" } };
            },
        });

        expect(result.details.interrupted).toBe(true);
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

    test("evaluates declared campaign invariants at lifecycle checkpoints", async () => {
        const campaign = defineInvariantCampaign<{ readonly balanced: boolean }>({
            runtime: {
                actors: { issuer: { party: "Issuer", participant: "issuer" } },
                isolation: { kind: "external" },
            },
            config: { runs: 1, depth: 1 },
            targets: [{ key: "Main:Iou:Create", actors: ["issuer"] }],
            invariants: [({ model }) => {
                if (!model.balanced) {
                    throw new Error("ledger is unbalanced");
                }
            }],
        });

        const result = await runInvariantCampaignCheckAsync({
            campaign,
            arbitrary: fc.constant([{ actor: "issuer", targetKey: "Main:Iou:Create" }]),
            key: () => "unbalanced",
            setupAsync: async () => ({ model: { balanced: false }, ghost: {} }),
            executeAsync: async (): Promise<CampaignMetricOutcome> => ({
                kind: "accepted",
                updateId: "update-1",
            }),
        });

        expect(result.details.failed).toBe(true);
        expect(result.counterexampleTrace?.failures).toEqual([
            {
                invariant: "invariant-1",
                code: "thrown",
                message: "ledger is unbalanced",
            },
            {
                invariant: "invariant-1",
                code: "thrown",
                message: "ledger is unbalanced",
            },
        ]);
    });

    test("propagates a declared campaign timeout to fast-check", async () => {
        const campaign = defineInvariantCampaign({
            runtime: {
                actors: { issuer: { party: "Issuer", participant: "issuer" } },
                isolation: { kind: "external" },
            },
            config: { runs: 10, depth: 1, timeoutMs: 1 },
            targets: [{ key: "Main:Iou:Create", actors: ["issuer"] }],
            invariants: [],
        });

        const result = await runInvariantCampaignCheckAsync({
            campaign,
            arbitrary: fc.constant([{ actor: "issuer", targetKey: "Main:Iou:Create" }]),
            key: () => "slow-action",
            setupAsync: async () => ({ model: {}, ghost: {} }),
            executeAsync: async (): Promise<CampaignMetricOutcome> => {
                await new Promise<void>((resolveDelay) => {
                    setTimeout(resolveDelay, 25);
                });

                return { kind: "accepted", updateId: "update-1" };
            },
        });

        expect(result.details.interrupted).toBe(true);
    });
});
