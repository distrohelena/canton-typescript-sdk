import { describe, expect, test } from "vitest";

import { InvariantCampaignFailure } from "../../../src/testing/errors/invariant-campaign-failure.js";

describe("InvariantCampaignFailure", () => {
    test("exposes safe diagnostics without leaking the original cause", () => {
        const failure = new InvariantCampaignFailure({
            message: "Campaign invariant checkpoint failed.",
            failures: [{
                invariant: "balanced-ledger",
                code: "balance-mismatch",
                message: "debits and credits differ",
            }],
            metrics: {
                byActor: { issuer: { accepted: 1 } },
                byTarget: { "Main:Iou:Create": { accepted: 1 } },
            },
            trace: { actions: [{ targetKey: "Main:Iou:Create" }] },
            artifactPath: ".artifacts/campaign.json",
            cause: new Error("Authorization: bearer secret-token"),
        });

        expect(failure).toMatchObject({
            name: "InvariantCampaignFailure",
            message: "Campaign invariant checkpoint failed.",
            artifactPath: ".artifacts/campaign.json",
            failures: [{ invariant: "balanced-ledger", code: "balance-mismatch" }],
        });
        expect(failure.metrics.byActor.issuer.accepted).toBe(1);
        expect(JSON.stringify(failure)).not.toContain("secret-token");
    });
});
