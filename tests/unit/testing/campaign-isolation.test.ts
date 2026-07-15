import { describe, expect, test } from "vitest";
import {
    runWithCampaignIsolationAsync,
} from "../../../src/testing/runtime/campaign-isolation.js";

describe("campaign isolation", () => {
    test("runs external resets before and after a campaign", async () => {
        const calls: string[] = [];

        await runWithCampaignIsolationAsync({
            isolation: {
                kind: "external",
                reset: async (phase) => {
                    calls.push(phase);
                },
            },
            runAsync: async () => {
                calls.push("run");
            },
        });

        expect(calls).toEqual(["before-run", "run", "after-run"]);
    });

    test("restores a snapshot after a failed campaign", async () => {
        const calls: string[] = [];

        await expect(
            runWithCampaignIsolationAsync({
                isolation: {
                    kind: "snapshot",
                    create: async () => {
                        calls.push("create");

                        return "snapshot-1";
                    },
                    restore: async (snapshot) => {
                        calls.push(`restore:${snapshot}`);
                    },
                },
                runAsync: async () => {
                    calls.push("run");

                    throw new Error("campaign failed");
                },
            }),
        ).rejects.toThrow("campaign failed");

        expect(calls).toEqual(["create", "run", "restore:snapshot-1"]);
    });
});
