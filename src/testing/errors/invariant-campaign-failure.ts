import { CampaignInvariantFailure } from "../campaign/campaign-runner.js";
import { CampaignMetrics } from "../campaign/campaign-metrics.js";

export interface InvariantCampaignFailureInit<Trace = unknown> {
    readonly artifactPath?: string;
    readonly cause?: unknown;
    readonly failures: readonly CampaignInvariantFailure[];
    readonly message: string;
    readonly metrics: CampaignMetrics;
    readonly trace?: Trace;
}

/**
 * A safe public summary of a failed invariant campaign.
 *
 * The original cause is intentionally retained in a private field so that
 * credentials or transport details cannot be serialized with this error.
 */
export class InvariantCampaignFailure<Trace = unknown> extends Error {
    readonly artifactPath?: string;
    readonly failures: readonly CampaignInvariantFailure[];
    readonly metrics: CampaignMetrics;
    readonly trace?: Trace;
    #cause: unknown;

    public constructor(init: InvariantCampaignFailureInit<Trace>) {
        super(init.message);
        this.name = "InvariantCampaignFailure";
        this.artifactPath = init.artifactPath;
        this.failures = Object.freeze(init.failures.map((failure) => Object.freeze({
            ...failure,
        })));
        this.metrics = snapshotMetrics(init.metrics);
        this.trace = init.trace;
        this.#cause = init.cause;
        Object.freeze(this);
    }
}

function snapshotMetrics(metrics: CampaignMetrics): CampaignMetrics {
    return Object.freeze({
        byActor: snapshotMetricGroup(metrics.byActor),
        byTarget: snapshotMetricGroup(metrics.byTarget),
    });
}

function snapshotMetricGroup(
    group: Readonly<Record<string, Readonly<Record<string, number>>>>,
): Readonly<Record<string, Readonly<Record<string, number>>>> {
    return Object.freeze(Object.fromEntries(
        Object.entries(group).map(([key, values]) => [
            key,
            Object.freeze({ ...values }),
        ]),
    ));
}
