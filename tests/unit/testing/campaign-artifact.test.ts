import { describe, expect, test } from "vitest";
import {
    createCampaignFingerprint,
    selectCampaignCounterexampleTrace,
    serializeCampaignReplayArtifact,
} from "../../../src/testing/campaign/campaign-artifact.js";

describe("campaign replay artifacts", () => {
    test("fingerprints canonical configuration independent of object key order", () => {
        expect(
            createCampaignFingerprint({
                depth: 4,
                targets: ["Main:Iou:Archive"],
                failOnRevert: false,
            }),
        ).toBe(
            createCampaignFingerprint({
                failOnRevert: false,
                targets: ["Main:Iou:Archive"],
                depth: 4,
            }),
        );
    });

    test("serializes only allowlisted replay fields", () => {
        const serialized = serializeCampaignReplayArtifact({
            schemaVersion: 1,
            fingerprint: "fingerprint",
            actions: [{ targetKey: "read", actor: "issuer" }],
            metrics: { byActor: {}, byTarget: {} },
            numRuns: 3,
            numShrinks: 1,
            secretToken: "must-not-appear",
            endpoint: "https://must-not-appear.example",
        });

        expect(serialized).toContain('"fingerprint":"fingerprint"');
        expect(serialized).not.toContain("must-not-appear");
    });

    test("selects the trace for the final counterexample only", () => {
        const traces = new Map([
            ["first", { id: "first" }],
            ["final", { id: "final" }],
        ]);

        expect(
            selectCampaignCounterexampleTrace(
                { failed: true, counterexampleKey: "final" },
                traces,
            ),
        ).toEqual({ id: "final" });
    });
});
