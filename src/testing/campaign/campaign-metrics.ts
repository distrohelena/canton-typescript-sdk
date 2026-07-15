export type CampaignMetricOutcome =
    | { readonly kind: "accepted"; readonly updateId: string }
    | { readonly kind: "discarded"; readonly reason: string }
    | { readonly kind: "malformed-response"; readonly reason: string }
    | { readonly kind: "protocol-revert"; readonly reason: string }
    | { readonly kind: "timeout"; readonly reason: string }
    | { readonly kind: "transport-error"; readonly reason: string }
    | { readonly kind: "unknown-commit-outcome"; readonly reason: string };

export interface CampaignMetrics {
    readonly byActor: Readonly<Record<string, Readonly<Record<string, number>>>>;
    readonly byTarget: Readonly<Record<string, Readonly<Record<string, number>>>>;
}

export function createCampaignMetrics(): CampaignMetrics {
    return {
        byActor: {},
        byTarget: {},
    };
}

export function recordCampaignAction(
    metrics: CampaignMetrics,
    action: {
        readonly actor: string;
        readonly outcome: CampaignMetricOutcome;
        readonly targetKey: string;
    },
): void {
    const mutableMetrics = metrics as {
        byActor: Record<string, Record<string, number>>;
        byTarget: Record<string, Record<string, number>>;
    };

    mutableMetrics.byActor = incrementMetric(
        mutableMetrics.byActor,
        action.actor,
        action.outcome.kind,
    );
    mutableMetrics.byTarget = incrementMetric(
        mutableMetrics.byTarget,
        action.targetKey,
        action.outcome.kind,
    );
}

function incrementMetric(
    metric: Record<string, Record<string, number>>,
    key: string,
    outcome: string,
): Record<string, Record<string, number>> {
    const next = {
        ...metric,
        [key]: {
            ...metric[key],
            [outcome]: (metric[key]?.[outcome] ?? 0) + 1,
        },
    };

    return Object.fromEntries(
        Object.entries(next)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([metricKey, outcomes]) => [
                metricKey,
                Object.fromEntries(
                    Object.entries(outcomes).sort(([left], [right]) =>
                        left.localeCompare(right),
                    ),
                ),
            ]),
    );
}
