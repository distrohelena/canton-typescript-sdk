import { describe, expect, test } from "vitest";
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
    createCampaignFingerprint,
    loadCampaignReplayArtifactAsync,
    selectCampaignCounterexampleTrace,
    serializeCampaignReplayArtifact,
    writeCampaignReplayArtifactAsync,
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

    test("writes a no-clobber allowlisted replay artifact", async () => {
        const directory = await mkdtemp(join(tmpdir(), "campaign-artifact-"));

        const filename = join(directory, "failure.json");

        const artifact = {
            schemaVersion: 1 as const,
            fingerprint: "fingerprint",
            actions: [],
            metrics: { byActor: {}, byTarget: {} },
            numRuns: 1,
            numShrinks: 0,
        };

        try {
            await writeCampaignReplayArtifactAsync(filename, artifact);

            await expect(readFile(filename, "utf8")).resolves.toContain(
                '"fingerprint":"fingerprint"',
            );
            await expect(
                writeCampaignReplayArtifactAsync(filename, artifact),
            ).rejects.toThrow("already exists");
            await expect(
                loadCampaignReplayArtifactAsync(filename, "fingerprint"),
            ).resolves.toMatchObject({ fingerprint: "fingerprint" });
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });

    test("rejects a symlinked artifact directory", async () => {
        const directory = await mkdtemp(join(tmpdir(), "campaign-artifact-"));

        const target = join(directory, "target");

        const linked = join(directory, "linked");

        const artifact = {
            schemaVersion: 1 as const,
            fingerprint: "fingerprint",
            actions: [],
            metrics: { byActor: {}, byTarget: {} },
            numRuns: 1,
            numShrinks: 0,
        };

        try {
            await mkdir(target);
            await symlink(target, linked);

            await expect(
                writeCampaignReplayArtifactAsync(join(linked, "failure.json"), artifact),
            ).rejects.toThrow("symlink");
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });

    test("rejects corrupt replay artifacts that omit the metric summary", async () => {
        const directory = await mkdtemp(join(tmpdir(), "campaign-artifact-"));

        const filename = join(directory, "corrupt.json");

        try {
            await writeFile(filename, JSON.stringify({
                schemaVersion: 1,
                fingerprint: "fingerprint",
                actions: [],
                numRuns: 1,
                numShrinks: 0,
            }));

            await expect(
                loadCampaignReplayArtifactAsync(filename, "fingerprint"),
            ).rejects.toThrow("invalid schema");
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });

    test("rejects replay artifacts with invalid execution counts", async () => {
        const directory = await mkdtemp(join(tmpdir(), "campaign-artifact-"));

        const filename = join(directory, "invalid-count.json");

        try {
            await writeFile(filename, JSON.stringify({
                schemaVersion: 1,
                fingerprint: "fingerprint",
                actions: [],
                metrics: { byActor: {}, byTarget: {} },
                numRuns: 0,
                numShrinks: -1,
            }));

            await expect(
                loadCampaignReplayArtifactAsync(filename, "fingerprint"),
            ).rejects.toThrow("invalid schema");
        } finally {
            await rm(directory, { recursive: true, force: true });
        }
    });
});
