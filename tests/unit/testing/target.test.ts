import { describe, expect, test } from "vitest";
import {
    excludeChoice,
    targetTemplate,
} from "../../../src/testing/targets/target.js";

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
});
