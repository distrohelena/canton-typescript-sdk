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

    it("includes named data types that are not reached by template fields or choices", () => {
        const result = new DamlInterfaceAnalyzer().analyzeOrThrow(
            createGenericNamedTypeCompilation({
                dataTypes: [new DamlLfDataType({
                    name: "Unused",
                    fields: [new DamlLfField({
                        name: "value",
                        type: new DamlLfType({
                            builtinType: DamlLfBuiltinType.text,
                        }),
                    })],
                })],
            }),
        );

        expect(result.typeDefinitions.map((definition) => definition.identity.name))
            .toContain("Unused");
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

    it("keeps unresolved ContractId targets opaque in analyzed templates", () => {
        const compilation = createCompilation({
            templateName: "TradeOrder",
            fieldTypeFactory: () =>
                new DamlLfType({
                    builtinType: DamlLfBuiltinType.contractId,
                    typeArguments: [
                        new DamlLfType({
                            typeConReference: new TypeConReference({
                                packageId: "missing-hash",
                                moduleName: "Holding",
                                name: "Holding",
                            }),
                        }),
                    ],
                }),
        });

        const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

        expect(result.templates[0].createFields[0].type).toEqual({
            kind: "contractId",
        });
        expect(result.typeDefinitions).toHaveLength(1);
        expect(result.typeDefinitions[0]).toMatchObject({
            identity: {
                packageId: "sample-hash",
                moduleName: "Main",
                name: "TradeOrder",
            },
            kind: "record",
        });
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

    it.each([0, 37])(
        "retains valid numeric boundary scale %i",
        (numericScale) => {
            const compilation = createCompilation({
                templateName: "TradeOrder",
                fieldTypeFactory: () =>
                    new DamlLfType({
                        builtinType: DamlLfBuiltinType.numeric,
                        numericScale,
                    }),
            });

            const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

            expect(result.templates[0].createFields[0].type).toEqual({
                kind: "primitive",
                builtinType: DamlLfBuiltinType.numeric,
                numericScale,
            });
        },
    );

    it("rejects noninteger numeric scales in their field context", () => {
        const compilation = createCompilation({
            templateName: "TradeOrder",
            fieldTypeFactory: () =>
                new DamlLfType({
                    builtinType: DamlLfBuiltinType.numeric,
                    numericScale: 1.5,
                }),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/template field 'issuer'.*numeric.*integer scale/);
    });

    it("isolates frozen canonical identities from mutable LF references", () => {
        const sourceIdentity = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name: "TradeOrder",
        });

        const compilation = createCompilation({
            templateName: "TradeOrder",
            fieldTypeFactory: () =>
                new DamlLfType({ typeConReference: sourceIdentity }),
        });

        const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

        const descriptor = result.templates[0].createFields[0].type;

        const definition = result.typeDefinitions[0];

        expect(descriptor).toMatchObject({ kind: "namedReference" });

        if (descriptor.kind !== "namedReference") {
            throw new Error("expected a named type descriptor");
        }

        expect(Object.isFrozen(descriptor.identity)).toBe(true);
        expect(Object.isFrozen(definition.identity)).toBe(true);
        expect(descriptor.identity).toBe(definition.identity);
        expect(descriptor.identity).not.toBe(sourceIdentity);

        (sourceIdentity as unknown as { name: string }).name = "MutatedTradeOrder";

        expect(descriptor.identity.name).toBe("TradeOrder");
        expect(definition.identity.name).toBe("TradeOrder");
    });

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
            "textMap",
            "genMap",
        ]);
        expect(template.createFields[0].type).toEqual({
            kind: "optional",
            element: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
        });
        expect(template.createFields[1].type).toEqual({
            kind: "list",
            element: {
                kind: "contractId",
            },
        });
        expect(template.createFields[7].type).toMatchObject({
            kind: "textMap",
            value: {
                kind: "namedReference",
                identity: { name: "Status" },
            },
        });
        expect(template.createFields[8].type).toMatchObject({
            kind: "genMap",
            key: {
                kind: "namedReference",
                identity: { name: "Settlement" },
            },
            value: {
                kind: "namedReference",
                identity: { name: "Instruction" },
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
                "Settlement",
                "Instruction",
                "Status",
                "Node",
                "MutualA",
                "MutualB",
                "TradeOrder",
            ].sort());
        expect(new Set(result.typeDefinitions.map((definition) =>
            `${definition.identity.packageId}:${definition.identity.moduleName}:${definition.identity.name}`,
        )).size).toBe(result.typeDefinitions.length);
    });

    it("analyzes Box<Text> choice types with one star-kind parameter", () => {
        const typeParameter = {
            name: "a",
            internedStringIndex: 1,
            kind: { kind: "star" as const },
        };

        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "Box",
                    typeParameters: [typeParameter],
                    fields: [
                        new DamlLfField({
                            name: "value",
                            type: new DamlLfType({
                                typeVariable: {
                                    name: "a",
                                    internedStringIndex: 1,
                                },
                            }),
                        }),
                    ],
                }),
            ],
            choiceParameterType: namedType("Box", [textType()]),
            choiceReturnType: namedType("Box", [textType()]),
        });

        const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

        expect(result.templates[0].choices[0]).toMatchObject({
            parameterType: {
                kind: "namedReference",
                identity: { name: "Box" },
                typeArguments: [{ kind: "primitive", builtinType: DamlLfBuiltinType.text }],
            },
            returnType: {
                kind: "namedReference",
                identity: { name: "Box" },
                typeArguments: [{ kind: "primitive", builtinType: DamlLfBuiltinType.text }],
            },
        });
        expect(result.typeDefinitions).toEqual([
            {
                identity: new TypeConReference({
                    packageId: "sample-hash",
                    moduleName: "Main",
                    name: "Box",
                }),
                typeParameters: [typeParameter],
                kind: "record",
                fields: [
                    {
                        damlLabel: "value",
                        propertyName: "value",
                        type: {
                            kind: "typeVariable",
                            name: "a",
                            internedStringIndex: 1,
                        },
                    },
                ],
            },
            {
                identity: new TypeConReference({
                    packageId: "sample-hash",
                    moduleName: "Main",
                    name: "TradeOrder",
                }),
                typeParameters: [],
                kind: "record",
                fields: [],
            },
        ]);
    });

    it("rejects unbound type variables in named record fields", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "BrokenBox",
                    fields: [
                        new DamlLfField({
                            name: "value",
                            type: new DamlLfType({
                                typeVariable: {
                                    name: "missing",
                                    internedStringIndex: 9,
                                },
                            }),
                        }),
                    ],
                }),
            ],
            choiceParameterType: namedType("BrokenBox"),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/field 'value' of record 'BrokenBox'.*unbound type variable 'missing'/);
    });

    it("rejects applied type variables in named record fields", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "BrokenBox",
                    typeParameters: [{
                        name: "a",
                        internedStringIndex: 1,
                        kind: { kind: "star" },
                    }],
                    fields: [
                        new DamlLfField({
                            name: "value",
                            type: new DamlLfType({
                                typeVariable: {
                                    name: "a",
                                    internedStringIndex: 1,
                                },
                                typeArguments: [textType()],
                            }),
                        }),
                    ],
                }),
            ],
            choiceParameterType: namedType("BrokenBox", [textType()]),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/field 'value' of record 'BrokenBox'.*applied type variables/);
    });

    it("rejects generic parameter binders without resolved names", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "BrokenBox",
                    typeParameters: [{
                        internedStringIndex: 1,
                        kind: { kind: "star" },
                    }],
                    fields: [],
                }),
            ],
            choiceParameterType: namedType("BrokenBox", [textType()]),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/choice parameter 'input'.*type parameter '#1'.*resolved name/);
    });

    it("rejects named record fields with unresolved type variable names", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "BrokenBox",
                    typeParameters: [{
                        name: "a",
                        internedStringIndex: 1,
                        kind: { kind: "star" },
                    }],
                    fields: [
                        new DamlLfField({
                            name: "value",
                            type: new DamlLfType({
                                typeVariable: { internedStringIndex: 1 },
                            }),
                        }),
                    ],
                }),
            ],
            choiceParameterType: namedType("BrokenBox", [textType()]),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/field 'value' of record 'BrokenBox'.*type variable '#1'.*resolved name/);
    });

    it("rejects retained forall types in choice return context", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [],
            choiceReturnType: new DamlLfType({
                diagnosticForall: {
                    typeParameters: [],
                    body: textType(),
                },
            }),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/choice return type 'UseBox'.*forall/);
    });

    it("rejects non-star generic named type parameters", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "NatBox",
                    typeParameters: [{
                        name: "n",
                        internedStringIndex: 2,
                        kind: { kind: "nat" },
                    }],
                    fields: [],
                }),
            ],
            choiceParameterType: namedType("NatBox", [textType()]),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/choice parameter 'input'.*type parameter 'n'.*kind '\*'/);
    });

    it("rejects generic enums", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "GenericStatus",
                    typeParameters: [{
                        name: "a",
                        internedStringIndex: 3,
                        kind: { kind: "star" },
                    }],
                    definition: {
                        kind: "enum",
                        constructors: ["Pending"],
                    },
                }),
            ],
            choiceParameterType: namedType("GenericStatus", [textType()]),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/choice parameter 'input'.*generic enum/);
    });

    it("rejects generic named type applications with the wrong arity", () => {
        const compilation = createGenericNamedTypeCompilation({
            dataTypes: [
                new DamlLfDataType({
                    name: "Box",
                    typeParameters: [{
                        name: "a",
                        internedStringIndex: 1,
                        kind: { kind: "star" },
                    }],
                    fields: [],
                }),
            ],
            choiceReturnType: namedType("Box"),
        });

        expect(() => new DamlInterfaceAnalyzer().analyzeOrThrow(compilation))
            .toThrow(/choice return type 'UseBox'.*requires 1 type argument/);
    });
});

function textType(): DamlLfType {
    return new DamlLfType({ builtinType: DamlLfBuiltinType.text });
}

function namedType(
    name: string,
    typeArguments: readonly DamlLfType[] = [],
): DamlLfType {
    return new DamlLfType({
        typeConReference: new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name,
        }),
        typeArguments,
    });
}

function createGenericNamedTypeCompilation(init: {
    dataTypes: readonly DamlLfDataType[];
    choiceParameterType?: DamlLfType;
    choiceReturnType?: DamlLfType;
}): DamlLfCompilation {
    const packageId = "sample-hash";

    const moduleName = "Main";

    const templateName = "TradeOrder";

    const fields: readonly DamlLfField[] = [];

    const template = new DamlLfTemplate({
        templateId: new DamlLfTemplateId({
            packageId,
            moduleName,
            templateName,
        }),
        name: templateName,
        parameterName: "self",
        fields,
        choices: [
            new DamlLfChoice({
                name: "UseBox",
                selfBinderName: "self",
                parameter: new DamlLfChoiceParameter({
                    name: "input",
                    type: init.choiceParameterType ?? textType(),
                }),
                returnType: init.choiceReturnType ?? textType(),
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
                            ...init.dataTypes,
                            new DamlLfDataType({ name: templateName, fields }),
                            template,
                        ],
                    }),
                ],
            }),
        ]),
    );
}

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
        new DamlLfField({
            name: "metadata",
            type: new DamlLfType({
                builtinType: DamlLfBuiltinType.textMap,
                typeArguments: [namedType("Status")],
            }),
        }),
        new DamlLfField({
            name: "routing",
            type: new DamlLfType({
                builtinType: DamlLfBuiltinType.genMap,
                typeArguments: [
                    namedType("Settlement"),
                    namedType("Instruction"),
                ],
            }),
        }),
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
