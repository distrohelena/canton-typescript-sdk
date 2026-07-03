import { describe, expect, it } from "vitest";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { AnalyzedChoice } from "../../../src/daml-interface/analysis/analyzed-choice.js";
import {
    AnalyzedTemplate,
    AnalyzedTemplateField,
} from "../../../src/daml-interface/analysis/analyzed-template.js";
import { TemplateBindingEmitter } from "../../../src/daml-interface/emission/template-binding-emitter.js";

describe("TemplateBindingEmitter", () => {
    it("emits a static-heavy template binding file from analyzed template metadata", () => {
        const template = new AnalyzedTemplate({
            templateId: new DamlLfTemplateId({
                packageId: "sample-hash",
                moduleName: "Main",
                templateName: "Iou",
            }),
            className: "Iou",
            fileName: "iou.ts",
            createFields: [
                new AnalyzedTemplateField({
                    name: "issuer",
                    propertyName: "issuer",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
                new AnalyzedTemplateField({
                    name: "owner",
                    propertyName: "owner",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
            ],
            choices: [
                new AnalyzedChoice({
                    name: "Transfer",
                    methodName: "exerciseTransfer",
                    parameterName: "newOwner",
                    parameterType: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                    returnType: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
            ],
        });

        const file = new TemplateBindingEmitter().emitTemplateFile(template);

        expect(file.path).toBe("generated/main/iou.ts");
        expect(file.contents).toContain("export class Iou");
        expect(file.contents).toContain('public static readonly templateId = "Main:Iou";');
        expect(file.contents).toContain("public static create(");
        expect(file.contents).toContain("public static exerciseTransfer(");
        expect(file.contents).toContain("public static decodeCreatedEvent(");
        expect(file.contents).toContain("export interface IouCreateFields");
        expect(file.contents).toContain("export interface IouTransferChoice");
        expect(file.contents).toContain("export interface IouCreatedEvent");
    });
});
