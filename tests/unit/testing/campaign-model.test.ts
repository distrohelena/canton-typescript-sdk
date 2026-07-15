import { describe, expect, test } from "vitest";
import {
    applyAcceptedGhostTransition,
    createCampaignModel,
    reconcileCampaignModel,
} from "../../../src/testing/campaign/campaign-model.js";

describe("campaign model", () => {
    test("reconciliation replaces ledger contracts without changing ghost state", () => {
        const model = createCampaignModel({
            ledger: { contractIds: ["contract-1"] },
            ghost: { deposits: 1 },
        });

        const reconciled = reconcileCampaignModel(model, {
            contractIds: ["contract-2"],
        });

        expect(reconciled).toEqual({
            ledger: { contractIds: ["contract-2"] },
            ghost: { deposits: 1 },
        });
    });

    test("applies a ghost transition only after an accepted reconciled command", () => {
        const model = createCampaignModel({
            ledger: { contractIds: [] },
            ghost: { deposits: 0 },
        });

        expect(
            applyAcceptedGhostTransition(
                model,
                { kind: "accepted", updateId: "update-1" },
                (ghost) => ({ deposits: ghost.deposits + 1 }),
            ),
        ).toEqual({
            ledger: { contractIds: [] },
            ghost: { deposits: 1 },
        });

        expect(
            applyAcceptedGhostTransition(
                model,
                { kind: "unknown-commit-outcome", reason: "network lost" },
                (ghost) => ({ deposits: ghost.deposits + 1 }),
            ),
        ).toBe(model);
    });
});
