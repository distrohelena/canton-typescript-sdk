import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
    scheduleCampaignSlots,
} from "../../../src/testing/campaign/campaign-scheduler.js";

describe("campaign scheduler properties", () => {
    test("always produces exactly the requested number of slots", () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 30 }),
                fc.array(fc.nat({ max: 100 }), {
                    minLength: 1,
                    maxLength: 30,
                }),
                (depth, rolls) => {
                    const slots = scheduleCampaignSlots({
                        depth,
                        targets: [
                            {
                                key: "read",
                                weight: 1,
                                actors: ["issuer"],
                            },
                        ],
                        hasActiveContract: true,
                        targetRolls: rolls,
                        actorRolls: rolls,
                    });

                    expect(slots).toHaveLength(depth);
                },
            ),
        );
    });
});
