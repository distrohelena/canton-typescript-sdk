import { describe, expect, test } from "vitest";
import {
    resolveDeclarativeTargets,
    excludeChoice,
    targetTemplate,
} from "../../../src/testing/targets/target.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";

describe("declarative invariant targets", () => {
    test("builds immutable template and choice selectors", () => {
        const target = targetTemplate("pkg:Main:Iou")
            .actors(["issuer", "owner"])
            .choice("Archive");

        expect(target).toEqual({
            kind: "template",
            templateId: "pkg:Main:Iou",
            actors: ["issuer", "owner"],
            choices: ["Archive"],
        });
        expect(excludeChoice("pkg:Main:Iou", "Transfer")).toEqual({
            kind: "exclude-choice",
            templateId: "pkg:Main:Iou",
            choice: "Transfer",
        });
    });

    test("resolves included choices while honoring explicit exclusions", () => {
        const catalog = createDamlTestingCatalog({
            getTemplates: () => [{
                templateId: {
                    packageId: "pkg",
                    moduleName: "Main",
                    templateName: "Iou",
                },
                choices: [{ name: "Archive" }, { name: "Transfer" }],
            }],
        });

        const targets = resolveDeclarativeTargets(catalog, [
            targetTemplate("pkg:Main:Iou").actors(["issuer"]).choice("Archive"),
            excludeChoice("pkg:Main:Iou", "Transfer"),
        ]);

        expect(targets).toEqual([
            {
                key: "pkg:Main:Iou:Archive",
                actors: ["issuer"],
                templateId: "pkg:Main:Iou",
                choice: "Archive",
            },
        ]);
    });
});
