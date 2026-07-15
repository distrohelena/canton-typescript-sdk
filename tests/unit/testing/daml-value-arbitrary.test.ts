import * as fc from "fast-check";
import { describe, expect, test } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlNumeric } from "../../../src/core/types/daml-numeric.js";
import { DamlParty } from "../../../src/core/types/daml-party.js";
import {
    createDamlValueArbitrary,
} from "../../../src/testing/daml/daml-value-arbitrary.js";

describe("DAML testing value arbitraries", () => {
    test("generates bounded text and int64 values", () => {
        const text = fc.sample(
            createDamlValueArbitrary(new DamlLfType({ builtinType: DamlLfBuiltinType.text })),
            20,
        );

        const integers = fc.sample(
            createDamlValueArbitrary(new DamlLfType({ builtinType: DamlLfBuiltinType.int64 })),
            20,
        );

        expect(text.every((value) => typeof value === "string" && value.length <= 64)).toBe(true);
        expect(integers.every((value) => typeof value === "bigint")).toBe(true);
    });

    test("generates bounded decimal numeric values", () => {
        const numeric = fc.sample(
            createDamlValueArbitrary(new DamlLfType({
                builtinType: DamlLfBuiltinType.numeric,
                numericScale: 10,
            })),
            20,
        );

        expect(numeric.every((value) => value instanceof DamlNumeric))
            .toBe(true);
    });

    test("rejects scale-zero numeric values rather than sending an int64", () => {
        expect(() => createDamlValueArbitrary(new DamlLfType({
            builtinType: DamlLfBuiltinType.numeric,
            numericScale: 0,
        }))).toThrow("scale of at least one");
    });

    test("generates party values only from the explicit actor set", () => {
        const values = fc.sample(
            createDamlValueArbitrary(
                new DamlLfType({ builtinType: DamlLfBuiltinType.party }),
                { valueParties: ["Alice", "Bob"] },
            ),
            30,
        );

        expect(values.every((value) =>
            value instanceof DamlParty && (value.value === "Alice" || value.value === "Bob")))
            .toBe(true);
    });

    test("rejects automatic party generation without configured value parties", () => {
        expect(() =>
            createDamlValueArbitrary(
                new DamlLfType({ builtinType: DamlLfBuiltinType.party }),
            ),
        ).toThrow("valueParties");
    });
});
