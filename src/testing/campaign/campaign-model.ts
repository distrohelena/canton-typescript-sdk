import { CampaignMetricOutcome } from "./campaign-metrics.js";

export interface CampaignModel<Ledger, Ghost> {
    readonly ghost: Ghost;
    readonly ledger: Ledger;
}

export function createCampaignModel<Ledger, Ghost>(init: {
    readonly ghost: Ghost;
    readonly ledger: Ledger;
}): CampaignModel<Ledger, Ghost> {
    return Object.freeze({
        ledger: init.ledger,
        ghost: init.ghost,
    });
}

export function reconcileCampaignModel<Ledger, Ghost>(
    model: CampaignModel<Ledger, Ghost>,
    ledger: Ledger,
): CampaignModel<Ledger, Ghost> {
    return Object.freeze({
        ledger,
        ghost: model.ghost,
    });
}

export function applyAcceptedGhostTransition<Ledger, Ghost>(
    model: CampaignModel<Ledger, Ghost>,
    outcome: CampaignMetricOutcome,
    transition: (ghost: Ghost) => Ghost,
): CampaignModel<Ledger, Ghost> {
    if (outcome.kind !== "accepted") {
        return model;
    }

    return Object.freeze({
        ledger: model.ledger,
        ghost: transition(model.ghost),
    });
}
