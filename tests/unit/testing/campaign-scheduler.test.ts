import { describe, expect, test } from "vitest";
import {
    scheduleCampaignSlots,
} from "../../../src/testing/campaign/campaign-scheduler.js";

describe("scheduleCampaignSlots", () => {
    test("fills every depth slot with a probe when no action is eligible", () => {
        expect(
            scheduleCampaignSlots({
                depth: 3,
                targets: [
                    {
                        key: "archive",
                        weight: 1,
                        actors: ["issuer"],
                        requiresActiveContract: true,
                    },
                ],
                hasActiveContract: false,
                targetRolls: [0, 0, 0],
                actorRolls: [0, 0, 0],
            }),
        ).toEqual([
            { kind: "probe" },
            { kind: "probe" },
            { kind: "probe" },
        ]);
    });

    test("selects uniformly among an action's eligible actors", () => {
        const slots = scheduleCampaignSlots({
            depth: 3,
            targets: [
                {
                    key: "query",
                    weight: 1,
                    actors: ["issuer", "owner", "auditor"],
                },
            ],
            hasActiveContract: true,
            targetRolls: [0, 0, 0],
            actorRolls: [0, 1, 2],
        });

        expect(slots).toEqual([
            { kind: "target", targetKey: "query", actor: "issuer" },
            { kind: "target", targetKey: "query", actor: "owner" },
            { kind: "target", targetKey: "query", actor: "auditor" },
        ]);
    });

    test("renormalizes positive target weights over the eligible set", () => {
        const slots = scheduleCampaignSlots({
            depth: 2,
            targets: [
                { key: "read", weight: 1, actors: ["issuer"] },
                { key: "write", weight: 3, actors: ["issuer"] },
                {
                    key: "archive",
                    weight: 100,
                    actors: ["issuer"],
                    requiresActiveContract: true,
                },
            ],
            hasActiveContract: false,
            targetRolls: [0, 1],
            actorRolls: [0, 0],
        });

        expect(slots).toEqual([
            { kind: "target", targetKey: "read", actor: "issuer" },
            { kind: "target", targetKey: "write", actor: "issuer" },
        ]);
    });
});
