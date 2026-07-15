import * as fc from "fast-check";

import { DamlNumeric } from "../../core/types/daml-numeric.js";
import { DamlParty } from "../../core/types/daml-party.js";
import { DamlLfBuiltinType } from "../../daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../daml-lf/model/daml-lf-type.js";
import { TestingConfigurationError } from "../errors/testing-configuration-error.js";

export type DamlTestingValue = string | bigint | DamlParty | DamlNumeric;

export function createDamlValueArbitrary(
    type: DamlLfType,
    options: { readonly valueParties?: readonly string[] } = {},
): fc.Arbitrary<DamlTestingValue> {
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
    case DamlLfBuiltinType.numeric:
        return createNumericArbitrary(type.numericScale);
    case DamlLfBuiltinType.party:
        if (options.valueParties === undefined || options.valueParties.length === 0) {
            throw new TestingConfigurationError(
                "Automatic DAML party generation requires non-empty valueParties.",
            );
        }

        return fc.constantFrom(...options.valueParties).map((party) => new DamlParty(party));
    default:
        throw new TestingConfigurationError(
            `Automatic DAML value generation does not support '${type.builtinType}'.`,
        );
    }
}

function createNumericArbitrary(scale: number | undefined): fc.Arbitrary<DamlNumeric> {
    const fractionScale = Math.min(scale ?? 6, 6);

    if (fractionScale < 1) {
        throw new TestingConfigurationError(
            "Automatic DAML numeric generation requires a Numeric scale of at least one.",
        );
    }

    const denominator = 10 ** fractionScale;

    return fc.integer({ min: -1_000_000, max: 1_000_000 })
        .filter((value) => value % denominator !== 0)
        .map((value) => new DamlNumeric(formatNumeric(value, fractionScale)));
}

function formatNumeric(value: number, scale: number): string {
    const sign = value < 0 ? "-" : "";

    const digits = Math.abs(value).toString().padStart(scale + 1, "0");

    return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}
