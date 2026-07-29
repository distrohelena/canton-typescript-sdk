import { describe, expect, it } from "vitest";
import {
    DamlEnum,
    DamlGenMap,
    DamlRecord,
    DamlTextMap,
    DamlValueMaterializer,
    DamlVariant,
} from "../../../src/daml-interface/index.js";

const materializeDamlValue = DamlValueMaterializer.materialize;

describe("materializeDamlValue", () => {
    it("converts decoded DAML containers to the generated declaration shapes", () => {
        const materialized = materializeDamlValue<{ readonly node: { readonly tag: "Next"; readonly value: string }; readonly status: "Open"; readonly labels: ReadonlyMap<string, string>; readonly entries: ReadonlyMap<string, string> }>(
            new DamlRecord({
                node: new DamlVariant("Next", "child"),
                status: new DamlEnum("Open"),
                labels: new DamlTextMap([["name", "value"]]),
                entries: new DamlGenMap([["key", "value"]]),
            }),
        );

        expect(materialized).toEqual({
            node: { tag: "Next", value: "child" },
            status: "Open",
            labels: new Map([["name", "value"]]),
            entries: new Map([["key", "value"]]),
        });
    });
});
