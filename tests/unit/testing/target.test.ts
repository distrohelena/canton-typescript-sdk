import { describe, expect, test } from "vitest";
import {
    resolveDeclarativeTargets,
    excludeChoice,
    excludeTemplate,
    targetChoice,
    targetTemplate,
} from "../../../src/testing/targets/target.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { TestingConfigurationError } from "../../../src/testing/errors/testing-configuration-error.js";

describe("declarative invariant targets", () => {
    test("builds immutable template and choice selectors", () => {
        const target = targetTemplate("pkg:Main:Iou")
            .actors(["issuer", "owner"])
            .choice("Archive");

        const allChoices = targetTemplate("pkg:Main:Iou")
            .actors(["issuer"])
            .allChoices();

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
        expect(excludeTemplate("pkg:Main:Iou")).toEqual({
            kind: "exclude-template",
            templateId: "pkg:Main:Iou",
        });
        expect(targetChoice("pkg:Main:Iou", "Archive", ["issuer"])).toEqual({
            kind: "template",
            templateId: "pkg:Main:Iou",
            actors: ["issuer"],
            choices: ["Archive"],
        });
        expect(allChoices).toEqual({
            kind: "template",
            templateId: "pkg:Main:Iou",
            actors: ["issuer"],
            choices: [],
            allChoices: true,
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

        expect(resolveDeclarativeTargets(catalog, [
            targetTemplate("pkg:Main:Iou").actors(["issuer"]).allChoices(),
            excludeChoice("pkg:Main:Iou", "Transfer"),
        ])).toEqual([
            {
                key: "pkg:Main:Iou:Archive",
                templateId: "pkg:Main:Iou",
                choice: "Archive",
                actors: ["issuer"],
            },
        ]);

        expect(resolveDeclarativeTargets(catalog, [
            targetTemplate("pkg:Main:Iou").actors(["issuer"]).allChoices(),
            excludeTemplate("pkg:Main:Iou"),
        ])).toEqual([]);

        expect(() => resolveDeclarativeTargets(catalog, [
            targetTemplate("pkg:Main:Missing").actors(["issuer"]).allChoices(),
        ])).toThrow(TestingConfigurationError);
        expect(() => resolveDeclarativeTargets(catalog, [
            targetChoice("pkg:Main:Iou", "Missing", ["issuer"]),
        ])).toThrow(TestingConfigurationError);
    });
});
