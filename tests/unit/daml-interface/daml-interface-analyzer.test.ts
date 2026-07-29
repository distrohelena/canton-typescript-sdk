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
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
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

    it("rejects numeric fields without a scale in their field context", () => {
        const compilation = createCompilation({
            templateName: "TradeOrder",
            fieldTypeFactory: () =>
                new DamlLfType({
                    builtinType: DamlLfBuiltinType.numeric,
                }),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/template field 'issuer'.*numeric.*scale/);
    });

    it.each([-1, 38])(
        "rejects numeric fields with out-of-range scale %i in their field context",
        (numericScale) => {
            const compilation = createCompilation({
                templateName: "TradeOrder",
                fieldTypeFactory: () =>
                    new DamlLfType({
                        builtinType: DamlLfBuiltinType.numeric,
                        numericScale,
                    }),
            });

            expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
                .toThrow(/template field 'issuer'.*numeric.*scale/);
        },
    );

    it("resolves recursive serializable DAML types into generator descriptors", () => {
        const compilation = createRichCompilation();

        const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

        const template = result.templates[0];

        expect(template.createFields.map((field) => field.type.kind)).toEqual([
            "optional",
            "list",
            "namedReference",
            "namedReference",
            "namedReference",
            "namedReference",
            "namedReference",
        ]);
        expect(template.createFields[0].type).toEqual({
            kind: "optional",
            element: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
        });
        expect(template.createFields[1].type).toEqual({
            kind: "list",
            element: {
                kind: "contractId",
                contract: {
                    kind: "namedReference",
                    identity: new TypeConReference({
                        packageId: "sample-hash",
                        moduleName: "Main",
                        name: "TradeOrder",
                    }),
                },
            },
        });

        const settlement = result.typeDefinitions.find(
            (definition) => definition.identity.name === "Settlement",
        );

        const instruction = result.typeDefinitions.find(
            (definition) => definition.identity.name === "Instruction",
        );

        const status = result.typeDefinitions.find(
            (definition) => definition.identity.name === "Status",
        );

        const node = result.typeDefinitions.find(
            (definition) => definition.identity.name === "Node",
        );

        const mutualA = result.typeDefinitions.find(
            (definition) => definition.identity.name === "MutualA",
        );

        const mutualB = result.typeDefinitions.find(
            (definition) => definition.identity.name === "MutualB",
        );

        expect(settlement).toMatchObject({
            identity: {
                packageId: "sample-hash",
                moduleName: "Main",
                name: "Settlement",
            },
            kind: "record",
            fields: [
                {
                    damlLabel: "settlement-owner",
                    propertyName: "settlementOwner",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                },
            ],
        });
        expect(instruction).toMatchObject({
            kind: "variant",
            constructors: [
                {
                    constructor: "Deliver",
                    payload: {
                        kind: "namedReference",
                        identity: { name: "Settlement" },
                    },
                },
                {
                    constructor: "Cancel",
                    payload: {
                        kind: "primitive",
                        builtinType: DamlLfBuiltinType.text,
                    },
                },
            ],
        });
        expect(status).toEqual({
            identity: new TypeConReference({
                packageId: "sample-hash",
                moduleName: "Main",
                name: "Status",
            }),
            kind: "enum",
            constructors: ["Pending", "Settled"],
        });
        expect(node).toMatchObject({
            kind: "record",
            fields: [
                {
                    damlLabel: "next",
                    type: {
                        kind: "optional",
                        element: {
                            kind: "namedReference",
                            identity: { name: "Node" },
                        },
                    },
                },
            ],
        });
        expect(mutualA).toMatchObject({
            kind: "record",
            fields: [
                {
                    damlLabel: "right",
                    type: {
                        kind: "namedReference",
                        identity: { name: "MutualB" },
                    },
                },
            ],
        });
        expect(mutualB).toMatchObject({
            kind: "record",
            fields: [
                {
                    damlLabel: "left",
                    type: {
                        kind: "namedReference",
                        identity: { name: "MutualA" },
                    },
                },
            ],
        });
        expect(result.typeDefinitions.map((definition) => definition.identity.name).sort())
            .toEqual([
                "TradeOrder",
                "Settlement",
                "Instruction",
                "Status",
                "Node",
                "MutualA",
                "MutualB",
            ].sort());
        expect(new Set(result.typeDefinitions.map((definition) =>
            `${definition.identity.packageId}:${definition.identity.moduleName}:${definition.identity.name}`,
        )).size).toBe(result.typeDefinitions.length);
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

function createRichCompilation(): DamlLfCompilation {
    const packageId = "sample-hash";

    const moduleName = "Main";

    const reference = (name: string): TypeConReference =>
        new TypeConReference({ packageId, moduleName, name });

    const namedType = (name: string): DamlLfType =>
        new DamlLfType({ typeConReference: reference(name) });

    const text = (): DamlLfType =>
        new DamlLfType({ builtinType: DamlLfBuiltinType.text });

    const templateFields = [
        new DamlLfField({
            name: "memo",
            type: new DamlLfType({
                builtinType: DamlLfBuiltinType.optional,
                typeArguments: [text()],
            }),
        }),
        new DamlLfField({
            name: "trade-ids",
            type: new DamlLfType({
                builtinType: DamlLfBuiltinType.list,
                typeArguments: [
                    new DamlLfType({
                        builtinType: DamlLfBuiltinType.contractId,
                        typeArguments: [namedType("TradeOrder")],
                    }),
                ],
            }),
        }),
        new DamlLfField({ name: "settlement", type: namedType("Settlement") }),
        new DamlLfField({ name: "instruction", type: namedType("Instruction") }),
        new DamlLfField({ name: "status", type: namedType("Status") }),
        new DamlLfField({ name: "mutual", type: namedType("MutualA") }),
        new DamlLfField({ name: "node", type: namedType("Node") }),
    ];

    const templateId = new DamlLfTemplateId({
        packageId,
        moduleName,
        templateName: "TradeOrder",
    });

    const template = new DamlLfTemplate({
        templateId,
        name: "TradeOrder",
        parameterName: "self",
        fields: templateFields,
        choices: [
            new DamlLfChoice({
                name: "Archive",
                selfBinderName: "self",
                parameter: new DamlLfChoiceParameter({
                    name: "replacement",
                    type: new DamlLfType({
                        builtinType: DamlLfBuiltinType.optional,
                        typeArguments: [namedType("Settlement")],
                    }),
                }),
                returnType: new DamlLfType({
                    builtinType: DamlLfBuiltinType.list,
                    typeArguments: [
                        new DamlLfType({
                            builtinType: DamlLfBuiltinType.contractId,
                            typeArguments: [namedType("TradeOrder")],
                        }),
                    ],
                }),
            }),
        ],
    });

    return DamlLfCompilation.createOrThrow(
        new DamlLfWorkspace([
            new DamlLfPackage({
                packageId,
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
                        name: moduleName,
                        definitions: [
                            new DamlLfDataType({
                                name: "TradeOrder",
                                fields: templateFields,
                            }),
                            new DamlLfDataType({
                                name: "Settlement",
                                fields: [
                                    new DamlLfField({
                                        name: "settlement-owner",
                                        type: text(),
                                    }),
                                ],
                            }),
                            new DamlLfDataType({
                                name: "Instruction",
                                definition: {
                                    kind: "variant",
                                    constructors: [
                                        {
                                            name: "Deliver",
                                            type: namedType("Settlement"),
                                        },
                                        { name: "Cancel", type: text() },
                                    ],
                                },
                            }),
                            new DamlLfDataType({
                                name: "Status",
                                definition: {
                                    kind: "enum",
                                    constructors: ["Pending", "Settled"],
                                },
                            }),
                            new DamlLfDataType({
                                name: "Node",
                                fields: [
                                    new DamlLfField({
                                        name: "next",
                                        type: new DamlLfType({
                                            builtinType: DamlLfBuiltinType.optional,
                                            typeArguments: [namedType("Node")],
                                        }),
                                    }),
                                ],
                            }),
                            new DamlLfDataType({
                                name: "MutualA",
                                fields: [
                                    new DamlLfField({
                                        name: "right",
                                        type: namedType("MutualB"),
                                    }),
                                ],
                            }),
                            new DamlLfDataType({
                                name: "MutualB",
                                fields: [
                                    new DamlLfField({
                                        name: "left",
                                        type: namedType("MutualA"),
                                    }),
                                ],
                            }),
                            template,
                        ],
                    }),
                ],
            }),
        ]),
    );
}
