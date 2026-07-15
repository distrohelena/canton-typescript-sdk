import { describe, expect, test } from "vitest";
import * as fc from "fast-check";

import {
    createDeclarativeActionArbitrary,
} from "../../../src/testing/daml/daml-action-arbitrary.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { TestingConfigurationError } from "../../../src/testing/errors/testing-configuration-error.js";

describe("declarative DAML actions", () => {
    test("combines resolved create and choice targets into executable typed actions", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                fields: [new DamlLfField({
                    name: "amount",
                    type: new DamlLfType({ builtinType: DamlLfBuiltinType.int64 }),
                })],
                choices: [{
                    name: "ChangeAmount",
                    parameter: {
                        type: new DamlLfType({ builtinType: DamlLfBuiltinType.int64 }),
                    },
                }],
            }],
        });

        const values = fc.sample(createDeclarativeActionArbitrary(catalog, [
            {
                key: "pkg:Main:Iou:create",
                templateId: "pkg:Main:Iou",
                actors: ["issuer"],
                kind: "create",
            },
            {
                key: "pkg:Main:Iou:ChangeAmount",
                templateId: "pkg:Main:Iou",
                choice: "ChangeAmount",
                actors: ["owner"],
            },
        ]), { seed: 97, numRuns: 32 });

        expect(values.map((value) => value.targetKey)).toContain("pkg:Main:Iou:create");
        expect(values.map((value) => value.targetKey)).toContain("pkg:Main:Iou:ChangeAmount");
        expect(values.every((value) => value.actor === "issuer" || value.actor === "owner"))
            .toBe(true);
        expect(values.filter((value) => "payload" in value)
            .every((value) => typeof value.payload.amount === "bigint"))
            .toBe(true);
        expect(values.filter((value) => "argument" in value)
            .every((value) => typeof value.argument === "bigint"))
            .toBe(true);
    });

    test("rejects an empty declarative target set", () => {
        const catalog = createDamlTestingCatalog({ getTemplates: () => [] });

        expect(() => createDeclarativeActionArbitrary(catalog, []))
            .toThrow(TestingConfigurationError);
    });
});
