import { describe, expect, test } from "vitest";
import * as fc from "fast-check";

import {
    createDeclarativeCreateActionArbitrary,
} from "../../../src/testing/daml/daml-create-action-arbitrary.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";

describe("declarative DAML create actions", () => {
    test("generates typed create payloads only for the target's eligible actors", () => {
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
                choices: [],
            }],
        });

        const values = fc.sample(createDeclarativeCreateActionArbitrary(catalog, {
            key: "pkg:Main:Iou:create",
            templateId: "pkg:Main:Iou",
            actors: ["issuer", "owner"],
            kind: "create",
        }), { seed: 97, numRuns: 20 });

        expect(values.every((value) => ["issuer", "owner"].includes(value.actor)))
            .toBe(true);
        expect(values.every((value) => value.targetKey === "pkg:Main:Iou:create"))
            .toBe(true);
        expect(values.every((value) => typeof value.payload.amount === "bigint"))
            .toBe(true);
    });
});
