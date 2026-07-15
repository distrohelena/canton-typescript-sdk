import { createHash } from "node:crypto";
import { chmod, lstat, mkdir, open, readFile } from "node:fs/promises";
import { dirname, parse, relative, resolve, sep } from "node:path";

import { CampaignMetrics } from "./campaign-metrics.js";

export interface CampaignReplayArtifact {
    readonly actions: readonly Readonly<Record<string, unknown>>[];
    readonly fingerprint: string;
    readonly metrics: CampaignMetrics;
    readonly numRuns: number;
    readonly numShrinks: number;
    readonly schemaVersion: 1;
    readonly seed?: number;
    readonly counterexamplePath?: string;
    readonly [key: string]: unknown;
}

export function createCampaignFingerprint(value: unknown): string {
    return createHash("sha256")
        .update(canonicalCampaignJson(value))
        .digest("hex");
}

export function serializeCampaignReplayArtifact(
    artifact: CampaignReplayArtifact,
): string {
    return `${JSON.stringify({
        schemaVersion: artifact.schemaVersion,
        fingerprint: artifact.fingerprint,
        actions: artifact.actions.map((action) => ({
            ...(typeof action.targetKey === "string"
                ? { targetKey: action.targetKey }
                : {}),
            ...(typeof action.actor === "string" ? { actor: action.actor } : {}),
            ...(typeof action.outcome === "string"
                ? { outcome: action.outcome }
                : {}),
        })),
        metrics: artifact.metrics,
        numRuns: artifact.numRuns,
        numShrinks: artifact.numShrinks,
        ...(artifact.seed === undefined ? {} : { seed: artifact.seed }),
        ...(artifact.counterexamplePath === undefined
            ? {}
            : { counterexamplePath: artifact.counterexamplePath }),
    })}\n`;
}

export function selectCampaignCounterexampleTrace<T>(
    details: {
        readonly failed: boolean;
        readonly counterexampleKey?: string;
    },
    traces: ReadonlyMap<string, T>,
): T {
    if (!details.failed || details.counterexampleKey === undefined) {
        throw new Error("Invariant campaign did not produce a counterexample.");
    }

    const trace = traces.get(details.counterexampleKey);

    if (trace === undefined) {
        throw new Error("Final invariant campaign counterexample has no trace.");
    }

    return trace;
}

export async function writeCampaignReplayArtifactAsync(
    filename: string,
    artifact: CampaignReplayArtifact,
): Promise<void> {
    const destination = resolve(filename);

    await ensureSecureDirectoryAsync(dirname(destination));

    const handle = await open(destination, "wx", 0o600);

    try {
        await handle.writeFile(serializeCampaignReplayArtifact(artifact), "utf8");
        await handle.sync();
    } finally {
        await handle.close();
    }
}

export async function loadCampaignReplayArtifactAsync(
    filename: string,
    fingerprint: string,
): Promise<CampaignReplayArtifact> {
    const artifact = JSON.parse(await readFile(resolve(filename), "utf8")) as unknown;

    if (!isCampaignReplayArtifact(artifact)) {
        throw new Error("Invariant campaign replay artifact has an invalid schema.");
    } else if (artifact.fingerprint !== fingerprint) {
        throw new Error("Invariant campaign replay artifact fingerprint does not match.");
    }

    return artifact;
}

function canonicalCampaignJson(value: unknown): string {
    return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortJsonValue);
    }

    else if (value !== null && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([key, nested]) => [key, sortJsonValue(nested)]),
        );
    }

    return value;
}

function isCampaignReplayArtifact(value: unknown): value is CampaignReplayArtifact {
    return value !== null
        && typeof value === "object"
        && (value as { schemaVersion?: unknown }).schemaVersion === 1
        && typeof (value as { fingerprint?: unknown }).fingerprint === "string"
        && Array.isArray((value as { actions?: unknown }).actions)
        && typeof (value as { numRuns?: unknown }).numRuns === "number"
        && typeof (value as { numShrinks?: unknown }).numShrinks === "number";
}

async function ensureSecureDirectoryAsync(directory: string): Promise<void> {
    const absoluteDirectory = resolve(directory);

    const root = parse(absoluteDirectory).root;

    const segments = relative(root, absoluteDirectory).split(sep).filter(Boolean);

    let current = root;

    for (const segment of segments) {
        current = resolve(current, segment);

        try {
            const entry = await lstat(current);

            if (entry.isSymbolicLink()) {
                throw new Error(`Invariant campaign artifact parent is a symlink: ${current}`);
            } else if (!entry.isDirectory()) {
                throw new Error(`Invariant campaign artifact parent is not a directory: ${current}`);
            }
        } catch (error) {
            if (!isNotFoundError(error)) {
                throw error;
            }

            await mkdir(current, { mode: 0o700 });
        }
    }

    await chmod(absoluteDirectory, 0o700);
}

function isNotFoundError(error: unknown): boolean {
    return typeof error === "object"
        && error !== null
        && (error as { code?: unknown }).code === "ENOENT";
}
