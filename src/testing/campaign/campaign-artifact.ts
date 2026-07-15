import { createHash } from "node:crypto";

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
