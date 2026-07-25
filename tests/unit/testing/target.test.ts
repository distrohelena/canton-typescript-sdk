import { describe, expect, test } from "vitest";
import {
    resolveDeclarativeTargets,
    excludeChoice,
    excludeTemplate,
    targetCreate,
    targetChoice,
    targetTemplate,
} from "../../../src/testing/targets/target.js";
import {
    createDamlTestingCatalog,
} from "../../../src/testing/daml/daml-testing-catalog.js";
import { TestingConfigurationError } from "../../../src/testing/errors/testing-configuration-error.js";

describe("declarative invariant targets", () => {
    const iou = { packageId: "pkg", moduleName: "Main", entityName: "Iou" };

    test("builds immutable template and choice selectors", () => {
        const target = targetTemplate(iou)
            .actors(["issuer", "owner"])
            .choice("Archive");

        const allChoices = targetTemplate(iou)
            .actors(["issuer"])
            .allChoices();

        const create = targetTemplate(iou)
            .actors(["issuer"])
            .create();

        expect(target).toEqual({
            kind: "template",
            templateId: iou,
            actors: ["issuer", "owner"],
            choices: ["Archive"],
        });
        expect(excludeChoice(iou, "Transfer")).toEqual({
            kind: "exclude-choice",
            templateId: iou,
            choice: "Transfer",
        });
        expect(excludeTemplate(iou)).toEqual({
            kind: "exclude-template",
            templateId: iou,
        });
        expect(targetChoice(iou, "Archive", ["issuer"])).toEqual({
            kind: "template",
            templateId: iou,
            actors: ["issuer"],
            choices: ["Archive"],
        });
        expect(allChoices).toEqual({
            kind: "template",
            templateId: iou,
            actors: ["issuer"],
            choices: [],
            allChoices: true,
        });
        expect(create).toEqual({
            kind: "template-create",
            templateId: iou,
            actors: ["issuer"],
        });
        expect(targetCreate(iou, ["issuer"])).toEqual(create);
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
            targetTemplate(iou).actors(["issuer"]).choice("Archive"),
            excludeChoice(iou, "Transfer"),
        ]);

        expect(targets).toEqual([
            {
                key: "pkg:Main:Iou:Archive",
                actors: ["issuer"],
                templateId: iou,
                choice: "Archive",
            },
        ]);

        expect(resolveDeclarativeTargets(catalog, [
            targetTemplate(iou).actors(["issuer"]).allChoices(),
            excludeChoice(iou, "Transfer"),
        ])).toEqual([
            {
                key: "pkg:Main:Iou:Archive",
                templateId: iou,
                choice: "Archive",
                actors: ["issuer"],
            },
        ]);

        expect(resolveDeclarativeTargets(catalog, [
            targetTemplate(iou).actors(["issuer"]).allChoices(),
            excludeTemplate(iou),
        ])).toEqual([]);

        expect(resolveDeclarativeTargets(catalog, [
            targetChoice(iou, "Archive", ["issuer"]),
            excludeTemplate(iou),
            excludeChoice(iou, "Archive"),
        ])).toEqual([{
            key: "pkg:Main:Iou:Archive",
            templateId: iou,
            choice: "Archive",
            actors: ["issuer"],
        }]);

        expect(resolveDeclarativeTargets(catalog, [
            targetTemplate(iou).actors(["issuer"]).create(),
        ])).toEqual([{
            key: "pkg:Main:Iou:create",
            templateId: iou,
            actors: ["issuer"],
            kind: "create",
        }]);

        expect(() => resolveDeclarativeTargets(catalog, [
            targetTemplate({ packageId: "pkg", moduleName: "Main", entityName: "Missing" }).actors(["issuer"]).allChoices(),
        ])).toThrow(TestingConfigurationError);
        expect(() => resolveDeclarativeTargets(catalog, [
            targetChoice(iou, "Missing", ["issuer"]),
        ])).toThrow(TestingConfigurationError);
        expect(() => resolveDeclarativeTargets(catalog, [
            targetTemplate(iou).actors(["issuer"]).allChoices(),
            excludeChoice(iou, "Missing"),
        ])).toThrow(TestingConfigurationError);
    });
});
