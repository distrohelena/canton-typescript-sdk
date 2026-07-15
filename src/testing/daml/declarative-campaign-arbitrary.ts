import * as fc from "fast-check";

import { InvariantCampaign } from "../campaign/campaign-types.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";
import { ResolvedDeclarativeTarget } from "../targets/target.js";
import {
    createDeclarativeActionArbitrary,
    DeclarativeAction,
    DeclarativeActionGenerationOptions,
} from "./daml-action-arbitrary.js";
import { DamlTestingCatalog } from "./daml-testing-catalog.js";

/**
 * Produces exact-depth declarative action sequences for a campaign. Every
 * resolved target must be declared by the campaign and every generated actor
 * must be eligible for that target before execution starts.
 */
export function createDeclarativeCampaignArbitrary(init: {
    readonly campaign: InvariantCampaign;
    readonly catalog: DamlTestingCatalog;
    readonly targets: readonly ResolvedDeclarativeTarget[];
} & DeclarativeActionGenerationOptions): fc.Arbitrary<readonly DeclarativeAction[]> {
    validateTargets(init.campaign, init.targets);

    return fc.array(
        createDeclarativeActionArbitrary(init.catalog, init.targets, init),
        {
            minLength: init.campaign.config.depth,
            maxLength: init.campaign.config.depth,
        },
    );
}

function validateTargets(
    campaign: InvariantCampaign,
    targets: readonly ResolvedDeclarativeTarget[],
): void {
    const declaredTargets = new Map(campaign.targets.map((target) => [target.key, target]));

    const allActors = Object.keys(campaign.runtime.actors);

    for (const target of targets) {
        const declared = declaredTargets.get(target.key);

        if (declared === undefined) {
            throw new TestingConfigurationError(
                `Declarative target '${target.key}' is absent from the campaign definition.`,
            );
        }

        const eligibleActors = new Set(declared.actors ?? allActors);

        const invalidActor = target.actors.find((actor) => !eligibleActors.has(actor));

        if (invalidActor !== undefined) {
            throw new TestingConfigurationError(
                `Declarative target '${target.key}' assigns ineligible actor '${invalidActor}'.`,
            );
        }
    }
}
