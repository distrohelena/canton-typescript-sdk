import { describe, expect, test } from "vitest";

import {
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
});
