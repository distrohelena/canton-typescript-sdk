import * as fc from "fast-check";

import { CampaignExecutableAction } from "../campaign/campaign-runner.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";
import { ResolvedDeclarativeChoiceTarget } from "../targets/target.js";
import { DamlTestingCatalog } from "./daml-testing-catalog.js";
import { createDamlValueArbitrary } from "./daml-value-arbitrary.js";

export interface DeclarativeChoiceAction extends CampaignExecutableAction {
    readonly argument: string | bigint | number;
    readonly choice: string;
    readonly templateId: string;
}

/**
 * Builds a well-typed, actor-routed automatic choice input from declarative
 * DAML target metadata. Command submission and active-contract selection stay
 * in the runtime adapter.
 */
export function createDeclarativeChoiceActionArbitrary(
    catalog: DamlTestingCatalog,
    target: ResolvedDeclarativeChoiceTarget,
    options: { readonly valueParties?: readonly string[] } = {},
): fc.Arbitrary<DeclarativeChoiceAction> {
    const choice = catalog.getChoice(target.templateId, target.choice);

    if (choice === undefined) {
        throw new TestingConfigurationError(
            `Declarative target '${target.key}' does not exist in the DAML catalog.`,
        );
    } else if (choice.argumentType === undefined) {
        throw new TestingConfigurationError(
            `Declarative target '${target.key}' has no argument type metadata.`,
        );
    } else if (target.actors.length === 0) {
        throw new TestingConfigurationError(
            `Declarative target '${target.key}' requires at least one actor.`,
        );
    }

    return fc.tuple(
        fc.constantFrom(...target.actors),
        createDamlValueArbitrary(choice.argumentType, options),
    ).map(([actor, argument]) => Object.freeze({
        actor,
        argument,
        choice: target.choice,
        targetKey: target.key,
        templateId: target.templateId,
    }));
}
