import * as fc from "fast-check";

import {
    createDeclarativeChoiceActionArbitrary,
    DeclarativeChoiceAction,
} from "./daml-choice-action-arbitrary.js";
import {
    createDeclarativeCreateActionArbitrary,
    DeclarativeCreateAction,
} from "./daml-create-action-arbitrary.js";
import { DamlTestingCatalog } from "./daml-testing-catalog.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";
import { ResolvedDeclarativeTarget } from "../targets/target.js";

export type DeclarativeAction = DeclarativeChoiceAction | DeclarativeCreateAction;

/**
 * Combines resolved template-create and template-choice targets into one
 * shrinkable campaign action arbitrary. Runtime adapters can discriminate the
 * result by `payload` (create) or `argument` (choice) before submission.
 */
export function createDeclarativeActionArbitrary(
    catalog: DamlTestingCatalog,
    targets: readonly ResolvedDeclarativeTarget[],
    options: { readonly valueParties?: readonly string[] } = {},
): fc.Arbitrary<DeclarativeAction> {
    if (targets.length === 0) {
        throw new TestingConfigurationError(
            "Automatic declarative action generation requires at least one target.",
        );
    }

    return fc.oneof(...targets.map((target): fc.Arbitrary<DeclarativeAction> => {
        if ("choice" in target) {
            return createDeclarativeChoiceActionArbitrary(catalog, target, options);
        }

        return createDeclarativeCreateActionArbitrary(catalog, target, options);
    }));
}
