import { describe, expect, test } from "vitest";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";

describe("DAML testing catalog", () => {
    test("indexes templates and their choices by stable IDs", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [
                {
                    templateId: {
                        packageId: "pkg",
                        moduleName: "Main",
                        templateName: "Iou",
                    },
                    choices: [{ name: "Archive" }, { name: "Transfer" }],
                },
            ],
        });

        expect(catalog.templates).toEqual([
            {
                templateId: "pkg:Main:Iou",
                choices: ["Archive", "Transfer"],
            },
        ]);
        expect(catalog.getChoice("pkg:Main:Iou", "Archive")).toEqual({
            choice: "Archive",
            templateId: "pkg:Main:Iou",
        });
    });

    test("preserves a choice argument type for automatic value generation", () => {
        const argumentType = new DamlLfType({ builtinType: DamlLfBuiltinType.int64 });

        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                choices: [{ name: "Transfer", parameter: { type: argumentType } }],
            }],
        });

        expect(catalog.getChoice("pkg:Main:Iou", "Transfer")).toEqual({
            choice: "Transfer",
            templateId: "pkg:Main:Iou",
            argumentType,
        });
    });
});
