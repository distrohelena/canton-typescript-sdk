import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfChoice } from "../../../src/daml-lf/model/daml-lf-choice.js";
import { DamlLfChoiceParameter } from "../../../src/daml-lf/model/daml-lf-choice-parameter.js";
import { DamlLfDataType } from "../../../src/daml-lf/model/daml-lf-data-type.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfTemplate } from "../../../src/daml-lf/model/daml-lf-template.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";

describe("DamlLfSemanticModel template queries", () => {
    it("returns templates and typed choices from the semantic model", () => {
        const templateId = new DamlLfTemplateId({
            packageId: "sample-hash",
            moduleName: "Main",
            templateName: "Iou",
        });

        const template = new DamlLfTemplate({
            templateId,
            name: "Iou",
            parameterName: "self",
            fields: [
                new DamlLfField({
                    name: "issuer",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
                new DamlLfField({
                    name: "owner",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
                new DamlLfField({
                    name: "amount",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
            ],
            choices: [
                new DamlLfChoice({
                    name: "Transfer",
                    selfBinderName: "self",
                    parameter: new DamlLfChoiceParameter({
                        name: "newOwner",
                        type: new DamlLfType({
                            builtinType: DamlLfBuiltinType.text,
                        }),
                    }),
                }),
            ],
        });

        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "sample-hash",
                    packageName: "sample-package",
                    packageVersion: "1.0.0",
                    languageVersion: {
                        major: 2,
                        minor: "1",
                        patch: 0,
                        toString: () => "2.1",
                    },
                    modules: [
                        new DamlLfModule({
                            name: "Main",
                            definitions: [
                                new DamlLfDataType({
                                    name: "Iou",
                                    fields: template.fields,
                                }),
                                template,
                            ],
                        }),
                    ],
                }),
            ]),
        );

        const semanticModel = compilation.createSemanticModel();

        const templates = semanticModel.getTemplates();

        const choices = semanticModel.getTemplateChoicesOrThrow(templateId);

        expect(templates.map((item) => item.name)).toEqual(["Iou"]);
        expect(template.fields.map((field) => field.name)).toEqual([
            "issuer",
            "owner",
            "amount",
        ]);
        expect(choices.map((choice) => choice.name)).toEqual(["Transfer"]);
        expect(choices[0].parameter.name).toBe("newOwner");
    });
});
