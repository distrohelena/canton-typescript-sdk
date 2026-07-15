import { describe, expect, test } from "vitest";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";

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
});
