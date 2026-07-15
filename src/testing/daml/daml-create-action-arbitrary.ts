import * as fc from "fast-check";

import { CampaignExecutableAction } from "../campaign/campaign-runner.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";
import { ResolvedDeclarativeCreateTarget } from "../targets/target.js";
import { DamlTestingCatalog } from "./daml-testing-catalog.js";
import { createDamlValueArbitrary, DamlTestingValue } from "./daml-value-arbitrary.js";

export interface DeclarativeCreateAction extends CampaignExecutableAction {
    readonly payload: Readonly<Record<string, DamlTestingValue>>;
    readonly templateId: string;
}

export interface DeclarativeCreateActionGenerationOptions {
    readonly fieldArbitraries?: Readonly<Record<string, fc.Arbitrary<DamlTestingValue>>>;
    readonly valueParties?: readonly string[];
}

/**
 * Builds a well-typed, actor-routed automatic create input from declarative
 * DAML template metadata. Ledger command construction stays in the runtime
 * adapter.
 */
export function createDeclarativeCreateActionArbitrary(
    catalog: DamlTestingCatalog,
    target: ResolvedDeclarativeCreateTarget,
    options: DeclarativeCreateActionGenerationOptions = {},
): fc.Arbitrary<DeclarativeCreateAction> {
    const template = catalog.getTemplate(target.templateId);

    if (template === undefined) {
        throw new TestingConfigurationError(
            `Declarative target '${target.key}' does not exist in the DAML catalog.`,
        );
    } else if (target.actors.length === 0) {
        throw new TestingConfigurationError(
            `Declarative target '${target.key}' requires at least one actor.`,
        );
    }

    const payload = fc.record(Object.fromEntries(template.fields.map((field) => [
        field.name,
        options.fieldArbitraries?.[field.name]
        ?? createDamlValueArbitrary(field.type, options),
    ])));

    return fc.tuple(fc.constantFrom(...target.actors), payload).map(([actor, value]) =>
        Object.freeze({
            actor,
            payload: Object.freeze(value),
            targetKey: target.key,
            templateId: target.templateId,
        }));
}
