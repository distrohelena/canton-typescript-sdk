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
import { DamlNumeric } from "../../../src/core/types/daml-numeric.js";
import { DamlParty } from "../../../src/core/types/daml-party.js";

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

    test("generates explicit DAML party and numeric payload values", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                fields: [
                    new DamlLfField({
                        name: "issuer",
                        type: new DamlLfType({ builtinType: DamlLfBuiltinType.party }),
                    }),
                    new DamlLfField({
                        name: "amount",
                        type: new DamlLfType({
                            builtinType: DamlLfBuiltinType.numeric,
                            numericScale: 10,
                        }),
                    }),
                ],
                choices: [],
            }],
        });

        const [value] = fc.sample(createDeclarativeCreateActionArbitrary(
            catalog,
            {
                key: "pkg:Main:Iou:create",
                templateId: "pkg:Main:Iou",
                actors: ["issuer"],
                kind: "create",
            },
            { valueParties: ["Issuer", "Owner"] },
        ), { seed: 91, numRuns: 1 });

        expect(value?.payload.issuer).toBeInstanceOf(DamlParty);
        expect(value?.payload.amount).toBeInstanceOf(DamlNumeric);
    });

    test("uses explicit field generators before automatic DAML values", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                fields: [
                    new DamlLfField({
                        name: "issuer",
                        type: new DamlLfType({ builtinType: DamlLfBuiltinType.party }),
                    }),
                    new DamlLfField({
                        name: "owner",
                        type: new DamlLfType({ builtinType: DamlLfBuiltinType.party }),
                    }),
                ],
                choices: [],
            }],
        });

        const [value] = fc.sample(createDeclarativeCreateActionArbitrary(
            catalog,
            {
                key: "pkg:Main:Iou:create",
                templateId: "pkg:Main:Iou",
                actors: ["issuer"],
                kind: "create",
            },
            {
                fieldArbitraries: {
                    issuer: fc.constant(new DamlParty("Issuer")),
                    owner: fc.constant(new DamlParty("Owner")),
                },
            },
        ), { seed: 42, numRuns: 1 });

        expect(value?.payload).toEqual({
            issuer: new DamlParty("Issuer"),
            owner: new DamlParty("Owner"),
        });
    });

    test("rejects field generators that do not belong to the target template", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                fields: [],
                choices: [],
            }],
        });

        expect(() => createDeclarativeCreateActionArbitrary(
            catalog,
            {
                key: "pkg:Main:Iou:create",
                templateId: "pkg:Main:Iou",
                actors: ["issuer"],
                kind: "create",
            },
            { fieldArbitraries: { missing: fc.constant("value") } },
        )).toThrow("field generator 'missing'");
    });
});
