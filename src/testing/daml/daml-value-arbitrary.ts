import * as fc from "fast-check";

import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";

export function createDamlValueArbitrary(
    type: DamlLfType,
    options: { readonly valueParties?: readonly string[] } = {},
): fc.Arbitrary<string | bigint> {
    if (type.typeConReference !== undefined) {
        throw new TestingConfigurationError(
            "Automatic DAML value generation does not yet support type constructors.",
        );
    }

    switch (type.builtinType) {
    case DamlLfBuiltinType.text:
        return fc.string({ maxLength: 64 });
    case DamlLfBuiltinType.int64:
        return fc.bigInt({
            min: -(2n ** 63n),
            max: (2n ** 63n) - 1n,
        });
    case DamlLfBuiltinType.party:
        if (options.valueParties === undefined || options.valueParties.length === 0) {
            throw new TestingConfigurationError(
                "Automatic DAML party generation requires non-empty valueParties.",
            );
        }

        return fc.constantFrom(...options.valueParties);
    default:
        throw new TestingConfigurationError(
            `Automatic DAML value generation does not support '${type.builtinType}'.`,
        );
    }
}
