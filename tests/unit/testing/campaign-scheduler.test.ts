import { describe, expect, test } from "vitest";
import {
    createInvariantCampaignScheduleArbitrary,
    createCampaignScheduleArbitrary,
    scheduleCampaignSlots,
} from "../../../src/testing/campaign/campaign-scheduler.js";
import * as fc from "fast-check";
import { defineInvariantCampaign } from "../../../src/testing/campaign/campaign-definition.js";

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

    test("generates deterministic fixed-depth schedule inputs for fast-check", () => {
        const arbitrary = createCampaignScheduleArbitrary({
            depth: 4,
            hasActiveContract: true,
            targets: [
                { key: "read", weight: 1, actors: ["issuer"] },
                { key: "write", weight: 1, actors: ["owner"] },
            ],
        });

        const first = fc.sample(arbitrary, { seed: 17, numRuns: 3 });

        const second = fc.sample(arbitrary, { seed: 17, numRuns: 3 });

        expect(first).toEqual(second);
        expect(first.every((schedule) => schedule.length === 4)).toBe(true);
    });

    test("derives scheduler actions from a public campaign definition", () => {
        const campaign = defineInvariantCampaign({
            runtime: {
                actors: {
                    issuer: { party: "Issuer", participant: "issuer" },
                    owner: { party: "Owner", participant: "owner" },
                },
                isolation: { kind: "external" },
            },
            config: { runs: 1, depth: 3 },
            targets: [
                { key: "Main:Iou:Create", actors: ["issuer"] },
                { key: "Main:Iou:Query" },
            ],
            invariants: [],
        });

        const schedules = fc.sample(
            createInvariantCampaignScheduleArbitrary(campaign),
            { seed: 41, numRuns: 5 },
        );

        expect(schedules.every((schedule) => schedule.length === campaign.config.depth))
            .toBe(true);
        expect(schedules.flat().every((slot) =>
            slot.kind === "probe"
            || (slot.targetKey === "Main:Iou:Create" ? slot.actor === "issuer" : true),
        )).toBe(true);
    });
});
