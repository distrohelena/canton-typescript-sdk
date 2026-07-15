import { describe, expect, test } from "vitest";
import * as fc from "fast-check";

import {
    createDeclarativeChoiceActionArbitrary,
} from "../../../src/testing/daml/daml-choice-action-arbitrary.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";

describe("declarative DAML choice actions", () => {
    test("generates typed arguments only for the target's eligible actors", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                choices: [{
                    name: "ChangeAmount",
                    parameter: {
                        type: new DamlLfType({ builtinType: DamlLfBuiltinType.int64 }),
                    },
                }],
            }],
        });

        const values = fc.sample(createDeclarativeChoiceActionArbitrary(catalog, {
            key: "pkg:Main:Iou:ChangeAmount",
            templateId: "pkg:Main:Iou",
            choice: "ChangeAmount",
            actors: ["issuer", "owner"],
        }), { seed: 97, numRuns: 20 });

        expect(values.every((value) => ["issuer", "owner"].includes(value.actor)))
            .toBe(true);
        expect(values.every((value) => value.targetKey === "pkg:Main:Iou:ChangeAmount"))
            .toBe(true);
        expect(values.every((value) => typeof value.argument === "bigint"))
            .toBe(true);
    });
});
