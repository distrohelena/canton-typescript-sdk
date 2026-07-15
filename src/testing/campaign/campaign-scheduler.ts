import * as fc from "fast-check";

import { InvariantCampaign } from "./campaign-types.js";

export interface CampaignSchedulingTarget {
    readonly actors: readonly string[];
    readonly key: string;
    readonly requiresActiveContract?: boolean;
    readonly weight: number;
}

export type ScheduledCampaignSlot =
    | { readonly kind: "probe" }
    | {
        readonly actor: string;
        readonly kind: "target";
        readonly targetKey: string;
    };

/**
 * Generates exact-depth scheduling inputs with fast-check's seed and shrink
 * support while delegating all eligibility decisions to the pure scheduler.
 */
export function createCampaignScheduleArbitrary(init: {
    readonly depth: number;
    readonly hasActiveContract: boolean;
    readonly targets: readonly CampaignSchedulingTarget[];
}): fc.Arbitrary<readonly ScheduledCampaignSlot[]> {
    if (!Number.isSafeInteger(init.depth) || init.depth < 1) {
        throw new Error("Campaign schedule depth must be a positive safe integer.");
    }

    const roll = fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER });

    return fc.tuple(
        fc.array(roll, { minLength: init.depth, maxLength: init.depth }),
        fc.array(roll, { minLength: init.depth, maxLength: init.depth }),
    ).map(([targetRolls, actorRolls]) => scheduleCampaignSlots({
        ...init,
        targetRolls,
        actorRolls,
    }));
}

/**
 * Projects a public invariant campaign definition onto generated scheduling
 * slots. Targets without explicit actors use every configured actor in stable
 * name order, allowing lightweight read/probe targets to share the campaign
 * actor matrix.
 */
export function createInvariantCampaignScheduleArbitrary(
    campaign: InvariantCampaign,
    options: { readonly hasActiveContract?: boolean } = {},
): fc.Arbitrary<readonly ScheduledCampaignSlot[]> {
    const defaultActors = Object.keys(campaign.runtime.actors).sort();

    return createCampaignScheduleArbitrary({
        depth: campaign.config.depth,
        hasActiveContract: options.hasActiveContract ?? true,
        targets: campaign.targets.map((target) => ({
            key: target.key,
            weight: 1,
            actors: target.actors ?? defaultActors,
        })),
    });
}

export function scheduleCampaignSlots(init: {
    readonly actorRolls: readonly number[];
    readonly depth: number;
    readonly hasActiveContract: boolean;
    readonly targetRolls: readonly number[];
    readonly targets: readonly CampaignSchedulingTarget[];
}): readonly ScheduledCampaignSlot[] {
    if (!Number.isSafeInteger(init.depth) || init.depth < 1) {
        throw new Error("Campaign schedule depth must be a positive safe integer.");
    }

    const eligibleTargets = init.targets.filter((target) =>
        target.weight > 0
        && target.actors.length > 0
        && (init.hasActiveContract || target.requiresActiveContract !== true),
    );

    const totalWeight = eligibleTargets.reduce(
        (sum, target) => sum + target.weight,
        0,
    );

    if (!Number.isSafeInteger(totalWeight)) {
        throw new Error("Campaign target weights must sum to a safe integer.");
    }

    return Array.from({ length: init.depth }, (_, index) => {
        if (totalWeight === 0) {
            return { kind: "probe" };
        }

        const target = selectByWeight(
            eligibleTargets,
            rollAt(init.targetRolls, index),
            totalWeight,
        );

        const actor = target.actors[
            rollAt(init.actorRolls, index) % target.actors.length
        ];

        return {
            kind: "target",
            targetKey: target.key,
            actor,
        };
    });
}

function rollAt(rolls: readonly number[], index: number): number {
    if (rolls.length === 0) {
        return 0;
    }

    const roll = rolls[index % rolls.length];

    return Number.isSafeInteger(roll) && roll >= 0 ? roll : 0;
}

function selectByWeight(
    targets: readonly CampaignSchedulingTarget[],
    roll: number,
    totalWeight: number,
): CampaignSchedulingTarget {
    let remaining = roll % totalWeight;

    for (const target of targets) {
        if (remaining < target.weight) {
            return target;
        }

        remaining -= target.weight;
    }

    throw new Error("Campaign scheduler could not select an eligible target.");
}
