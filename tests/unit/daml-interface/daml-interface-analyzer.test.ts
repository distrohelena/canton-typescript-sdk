import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
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
import { DamlInterfaceAnalyzer } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { DamlInterfaceGeneratorOptions } from "../../../src/daml-interface/daml-interface-generator-options.js";
import { DamlInterfaceUnsupportedShapeException } from "../../../src/daml-interface/errors/daml-interface-unsupported-shape.exception.js";

describe("DamlInterfaceAnalyzer", () => {
    it("extracts generator-facing template metadata from daml lf templates", () => {
        const compilation = createCompilation({
            templateName: "TradeOrder",
            fieldTypeFactory: () =>
                new DamlLfType({
                    builtinType: DamlLfBuiltinType.text,
                }),
        });

        const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

        const generatorResult = new DamlInterfaceGenerator(
            new DamlInterfaceGeneratorOptions(),
        ).analyzeOrThrow(compilation);

        expect(result.templates).toHaveLength(1);
        expect(result.templates[0].className).toBe("TradeOrder");
        expect(result.templates[0].fileName).toBe("trade-order.ts");
        expect(generatorResult.templates[0].className).toBe("TradeOrder");
        expect(result.templates[0].createFields.map((field) => field.name)).toEqual([
            "issuer",
            "owner",
            "amount",
        ]);
        expect(result.templates[0].choices.map((choice) => choice.name)).toEqual([
            "TransferOwnership",
        ]);
        expect(result.templates[0].choices[0].methodName).toBe(
            "exerciseTransferOwnership",
        );
    });

    it("rejects unsupported template field shapes", () => {
        const compilation = createCompilation({
            templateName: "TradeOrder",
            fieldTypeFactory: () =>
                new DamlLfType({
                    builtinType: DamlLfBuiltinType.unknown,
                }),
        });

        const analyzer = new DamlInterfaceAnalyzer();

        expect(() => analyzer.analyzeOrThrow(compilation)).toThrow(
            DamlInterfaceUnsupportedShapeException,
        );
    });
});

function createCompilation(init: {
    templateName: string;
    fieldTypeFactory(): DamlLfType;
}): DamlLfCompilation {
    const templateId = new DamlLfTemplateId({
        packageId: "sample-hash",
        moduleName: "Main",
        templateName: init.templateName,
    });

    const fields = [
        new DamlLfField({
            name: "issuer",
            type: init.fieldTypeFactory(),
        }),
        new DamlLfField({
            name: "owner",
            type: init.fieldTypeFactory(),
        }),
        new DamlLfField({
            name: "amount",
            type: init.fieldTypeFactory(),
        }),
    ];

    const template = new DamlLfTemplate({
        templateId,
        name: init.templateName,
        parameterName: "self",
        fields,
        choices: [
            new DamlLfChoice({
                name: "TransferOwnership",
                selfBinderName: "self",
                parameter: new DamlLfChoiceParameter({
                    name: "newOwner",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.text,
                    }),
                }),
                returnType: new DamlLfType({
                    builtinType: DamlLfBuiltinType.text,
                }),
            }),
        ],
    });

    return DamlLfCompilation.createOrThrow(
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
                                name: init.templateName,
                                fields,
                            }),
                            template,
                        ],
                    }),
                ],
            }),
        ]),
    );
}
