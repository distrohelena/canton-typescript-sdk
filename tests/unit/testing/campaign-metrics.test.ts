import { describe, expect, test } from "vitest";
import {
    createCampaignMetrics,
    recordCampaignAction,
} from "../../../src/testing/campaign/campaign-metrics.js";

describe("campaign metrics", () => {
    test("groups outcomes by target and actor in deterministic key order", () => {
        const metrics = createCampaignMetrics();

        recordCampaignAction(metrics, {
            targetKey: "write",
            actor: "owner",
            outcome: { kind: "protocol-revert", reason: "not authorized" },
        });
        recordCampaignAction(metrics, {
            targetKey: "read",
            actor: "issuer",
            outcome: { kind: "accepted", updateId: "update-1" },
        });

        expect(metrics.byTarget).toEqual({
            read: { accepted: 1 },
            write: { "protocol-revert": 1 },
        });
        expect(metrics.byActor).toEqual({
            issuer: { accepted: 1 },
            owner: { "protocol-revert": 1 },
        });
    });
});
