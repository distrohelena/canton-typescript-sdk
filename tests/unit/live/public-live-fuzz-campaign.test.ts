import { describe, expect, test } from "vitest";
import * as fc from "fast-check";

import {
    createPublicLiveFuzzActionArbitrary,
    createPublicLiveFuzzCampaign,
} from "../../live/fuzz/public-live-fuzz-campaign.js";
import { readLiveFuzzConfig } from "../../live/fuzz/live-fuzz-config.js";

describe("public live fuzz campaign adapter", () => {
    test("maps the Main:Iou fixture configuration onto the public campaign shape", () => {
        const campaign = createPublicLiveFuzzCampaign(readLiveFuzzConfig());

        expect(campaign.config).toMatchObject({
            runs: 20,
            depth: 8,
            failOnRevert: false,
        });
        expect(campaign.runtime.isolation).toEqual({ kind: "external" });
        expect(campaign.runtime.actors).toMatchObject({
            issuer: { participant: "issuer" },
            owner: { participant: "owner" },
        });
        expect(campaign.targets).toEqual([
            { key: "Main:Iou:Create", actors: ["issuer"] },
            { key: "Main:Iou:Query", actors: ["issuer", "owner"] },
            { key: "Main:Iou:Fetch", actors: ["issuer", "owner"] },
            { key: "Main:Iou:Events", actors: ["issuer", "owner"] },
            { key: "Main:Iou:Archive", actors: ["issuer"] },
            { key: "Main:Iou:Probe", actors: ["issuer", "owner"] },
        ]);
    });

    test("adapts each exact legacy command into one public campaign action", () => {
        process.env.FUZZ_LIVE_DEPTH = "4";
        process.env.FUZZ_LIVE_REQUIRE_ARCHIVE = "1";
        process.env.FUZZ_LIVE_FAIL_ON_REVERT = "true";

        const config = readLiveFuzzConfig();

        const actions = fc.sample(createPublicLiveFuzzActionArbitrary(config), {
            numRuns: 1,
        })[0];

        expect(actions).toHaveLength(config.depth);
        expect(actions.map(({ actor, targetKey }) => ({ actor, targetKey }))).toEqual(
            [
                { actor: "issuer", targetKey: "Main:Iou:Create" },
                { actor: "issuer", targetKey: "Main:Iou:Query" },
                { actor: "owner", targetKey: "Main:Iou:Fetch" },
                { actor: "issuer", targetKey: "Main:Iou:Archive" },
            ],
        );
        expect(actions[0]).toMatchObject({ command: { kind: "create" } });
        expect(actions[3]).toMatchObject({
            command: { kind: "exercise", participant: "issuer" },
        });
        expect(actions.every((action) => action.campaignNonce === actions[0]?.campaignNonce)).toBe(true);
        expect(actions.every((action) => action.amountSuffix === actions[0]?.amountSuffix)).toBe(true);
    });
});
