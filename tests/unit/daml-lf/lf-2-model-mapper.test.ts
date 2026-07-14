import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfPackageLoader } from "../../../src/daml-lf/daml-lf-package-loader.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfNodeKind } from "../../../src/daml-lf/model/daml-lf-node-kind.js";
import { DamlLfTemplate } from "../../../src/daml-lf/model/daml-lf-template.js";
import { Archive, ArchivePayload, HashFunction } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import {
    BuiltinCon,
    BuiltinFunction,
    Block,
    BuiltinType,
    Case,
    Expr,
    Package,
    TypeConId,
    VarWithType,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";

describe("LF 2.x model mapper", () => {
    it("maps a decoded LF package into the public immutable model", () => {
        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();

        const loader = new DamlLfPackageLoader();

        const packageModel = loader.loadPackageOrThrow(archiveBytes);

        expect(DamlLfNodeKind.package).toBe("package");
        expect(DamlLfBuiltinType.text).toBe("text");
        expect(packageModel.packageId).toBe("sample-hash");
        expect(packageModel.packageName).toBe("sample-package");
        expect(packageModel.packageVersion).toBe("1.0.0");
        expect(packageModel.modules).toHaveLength(1);
        expect(packageModel.modules[0].name).toBe("Sample.Module");
        expect(packageModel.modules[0].definitions).toHaveLength(3);
        expect(packageModel.modules[0].definitions[0].name).toBe("Iou");
        expect(packageModel.modules[0].definitions[1].name).toBe("greeting");
        expect(packageModel.modules[0].definitions[2]).toBeInstanceOf(DamlLfTemplate);
        expect(packageModel.modules[0].definitions[2].name).toBe("Iou");
        expect(
            (packageModel.modules[0].definitions[2] as DamlLfTemplate).choices[0],
        ).toEqual(
            expect.objectContaining({
                name: "Transfer",
                selfBinderName: "self",
            }),
        );
        expect(
            (packageModel.modules[0].definitions[2] as DamlLfTemplate).choices[0]
                ?.updateExpression?.textLiteral,
        ).toBe("newOwner");
    });

    it("maps value references inside expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createValueReferenceArchiveBytes(),
        );
        const aliasDefinition = packageModel.modules[0].definitions[1];

        expect(aliasDefinition.name).toBe("alias");
        expect("valueReference" in aliasDefinition.expression).toBe(true);
        expect(aliasDefinition.expression.valueReference).toEqual({
            packageId: "sample-hash",
            moduleName: "Sample.Module",
            definitionName: "greeting",
        });
        expect(aliasDefinition.expression.sourceLocation).toEqual({
            startLine: 40,
            startColumn: 4,
            endLine: 40,
            endColumn: 12,
        });
    });

    it("maps let, lambda, application, and variable expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createLambdaApplicationArchiveBytes(),
        );
        const applyDefinition = packageModel.modules[0].definitions[0];

        expect(applyDefinition.expression.letExpression?.bindings).toHaveLength(1);
        expect(
            applyDefinition.expression.letExpression?.bindings[0]?.name,
        ).toBe("greeting");
        expect(
            applyDefinition.expression.letExpression?.bindings[0]?.value
                .textLiteral,
        ).toBe("hello");
        expect(
            applyDefinition.expression.letExpression?.body.application?.function
                .lambda?.parameters,
        ).toEqual(["name"]);
        expect(
            applyDefinition.expression.letExpression?.body.application?.function
                .lambda?.body.variableName,
        ).toBe("name");
        expect(
            applyDefinition.expression.letExpression?.body.application?.arguments[0]
                ?.variableName,
        ).toBe("greeting");
    });

    it("maps record construction and projection expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createRecordProjectionArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.letExpression?.bindings[0]?.value
                .recordConstruction?.fields,
        ).toEqual([
            expect.objectContaining({
                name: "owner",
            }),
        ]);
        expect(
            definition.expression.letExpression?.body.recordProjection?.fieldName,
        ).toBe("owner");
        expect(
            definition.expression.letExpression?.body.recordProjection?.record
                .variableName,
        ).toBe("person");
    });

    it("maps interned applied type references on record fields", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createInternedTypeReferenceArchiveBytes(),
        );
        const snapshotDefinition =
            packageModel.modules[0].definitions[1] as {
                fields: Array<{
                    name: string;
                    type: {
                        typeConReference?: {
                            packageId: string;
                            moduleName: string;
                            name: string;
                        };
                    };
                }>;
            };

        expect(snapshotDefinition.fields[0]?.name).toBe("vaultIdentity");
        expect(snapshotDefinition.fields[0]?.type.typeConReference).toEqual({
            packageId: "sample-hash",
            moduleName: "Sample.Module",
            name: "VaultIdentity",
        });
    });

    it("retains enum definitions for type resolution", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createEnumTypeReferenceArchiveBytes(),
        );
        const workspace = new DamlLfWorkspace([packageModel]);

        expect(() => DamlLfCompilation.createOrThrow(workspace)).not.toThrow();
        expect(
            packageModel.modules[0]?.definitions.some(
                (definition) => definition.name === "VaultOperation",
            ),
        ).toBe(true);
    });

    it("maps builtin constructor and case expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createCaseArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(definition.expression.caseExpression?.scrutinee.builtinConstructor).toBe(
            "true",
        );
        expect(
            definition.expression.caseExpression?.alternatives[0],
        ).toEqual(
            expect.objectContaining({
                patternKind: "builtinCon",
                builtinConstructor: "true",
            }),
        );
        expect(
            definition.expression.caseExpression?.alternatives[1],
        ).toEqual(
            expect.objectContaining({
                patternKind: "default",
            }),
        );
    });

    it("maps variant construction and case alternatives", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createVariantCaseArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.caseExpression?.scrutinee.variantConstruction
                ?.constructorName,
        ).toBe("Approved");
        expect(
            definition.expression.caseExpression?.alternatives[0],
        ).toEqual(
            expect.objectContaining({
                patternKind: "variant",
                constructorName: "Approved",
                binderName: "owner",
            }),
        );
    });

    it("maps optional construction and case alternatives", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createOptionalCaseArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.caseExpression?.scrutinee.optionalConstruction
                ?.value?.textLiteral,
        ).toBe("hello");
        expect(
            definition.expression.caseExpression?.alternatives[0],
        ).toEqual(
            expect.objectContaining({
                patternKind: "optionalSome",
                binderName: "note",
            }),
        );
        expect(
            definition.expression.caseExpression?.alternatives[1],
        ).toEqual(
            expect.objectContaining({
                patternKind: "optionalNone",
            }),
        );
    });

    it("maps builtin function expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createBuiltinEqualityArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.application?.function.builtinFunction,
        ).toBe("equal");
    });

    it("maps enum construction and case alternatives", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createEnumCaseArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.caseExpression?.scrutinee.enumConstruction
                ?.constructorName,
        ).toBe("Active");
        expect(
            definition.expression.caseExpression?.alternatives[0],
        ).toEqual(
            expect.objectContaining({
                patternKind: "enum",
                constructorName: "Active",
            }),
        );
    });

    it("maps list construction and cons case alternatives", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createListCaseArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.caseExpression?.scrutinee.listConstruction?.front,
        ).toHaveLength(1);
        expect(
            definition.expression.caseExpression?.alternatives[0],
        ).toEqual(
            expect.objectContaining({
                patternKind: "cons",
                headBinderName: "head",
                tailBinderName: "tail",
            }),
        );
    });

    it("maps int64 literals and comparison builtins", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createBuiltinComparisonArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.application?.function.builtinFunction,
        ).toBe("greater");
        expect(
            definition.expression.application?.arguments[0]?.int64Literal,
        ).toBe("5");
        expect(
            definition.expression.application?.arguments[1]?.int64Literal,
        ).toBe("0");
    });

    it("maps appendText builtin applications", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createAppendTextArchiveBytes(),
        );
        const definition = packageModel.modules[0].definitions[0];

        expect(
            definition.expression.application?.function.builtinFunction,
        ).toBe("appendText");
    });

    it("maps type-erased, updated, struct, and interned expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createStructuralExpressionArchiveBytes(),
        );

        expect(packageModel.modules[0].definitions[0]?.expression.textLiteral).toBe(
            "Alice",
        );
        expect(packageModel.modules[0].definitions[1]?.expression.textLiteral).toBe(
            "Alice",
        );
        expect(
            packageModel.modules[0].definitions[2]?.expression.recordUpdate,
        ).toEqual(
            expect.objectContaining({
                fieldName: "owner",
            }),
        );
        expect(
            packageModel.modules[0].definitions[3]?.expression.recordProjection
                ?.fieldName,
        ).toBe("owner");
        expect(packageModel.modules[0].definitions[4]?.expression.textLiteral).toBe(
            "cached",
        );
        expect(
            packageModel.modules[0].definitions[5]?.expression.recordUpdate,
        ).toEqual(
            expect.objectContaining({
                fieldName: "owner",
            }),
        );
    });

    it("maps LF numeric literals without erasing them to text literals", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createNumericLiteralArchiveBytes(),
        );

        expect(packageModel.modules[0].definitions[0]?.expression.numericLiteral).toBe(
            "1.0000000000",
        );
        expect(packageModel.modules[0].definitions[0]?.expression.textLiteral).toBeUndefined();
    });

    it("maps update create, fetch, and exercise expressions", () => {
        const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(
            createUpdateArchiveBytes(),
        );
        const createDefinition = packageModel.modules[0].definitions[0];
        const fetchDefinition = packageModel.modules[0].definitions[1];
        const exerciseDefinition = packageModel.modules[0].definitions[2];

        expect(createDefinition.expression.updateExpression).toEqual(
            expect.objectContaining({
                kind: "create",
            }),
        );
        expect(createDefinition.expression.updateExpression?.templateId).toEqual(
            expect.objectContaining({
                packageId: "sample-hash",
                moduleName: "Sample.Module",
                templateName: "Vault",
            }),
        );
        expect(fetchDefinition.expression.updateExpression).toEqual(
            expect.objectContaining({
                kind: "fetch",
            }),
        );
        expect(exerciseDefinition.expression.updateExpression).toEqual(
            expect.objectContaining({
                kind: "exercise",
                choiceName: "Archive",
            }),
        );
    });
});

function createValueReferenceArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "builtinLit",
                                builtinLit: {
                                    sum: {
                                        oneofKind: "textInternedStr",
                                        textInternedStr: 4,
                                    },
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 2,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            location: {
                                range: {
                                    startLine: 40,
                                    startCol: 4,
                                    endLine: 40,
                                    endCol: 12,
                                },
                            },
                            sum: {
                                oneofKind: "val",
                                val: {
                                    module: {
                                        packageId: {
                                            sum: {
                                                oneofKind: "selfPackageId",
                                                selfPackageId: {},
                                            },
                                        },
                                        moduleNameInternedDname: 0,
                                    },
                                    nameInternedDname: 1,
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "hello",
            "greeting",
            "alias",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [5],
            },
            {
                segmentsInternedStr: [6],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createRecordProjectionArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "let",
                                let: {
                                    bindings: [
                                        {
                                            binder: createTextBinder(5),
                                            bound: {
                                                sum: {
                                                    oneofKind: "recCon",
                                                    recCon: {
                                                        fields: [
                                                            {
                                                                fieldInternedStr: 6,
                                                                expr: {
                                                                    sum: {
                                                                        oneofKind:
                                                                            "builtinLit",
                                                                        builtinLit: {
                                                                            sum: {
                                                                                oneofKind:
                                                                                    "textInternedStr",
                                                                                textInternedStr:
                                                                                    7,
                                                                            },
                                                                        },
                                                                    },
                                                                },
                                                            },
                                                        ],
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                    body: {
                                        sum: {
                                            oneofKind: "recProj",
                                            recProj: {
                                                fieldInternedStr: 6,
                                                record: {
                                                    sum: {
                                                        oneofKind:
                                                            "varInternedStr",
                                                        varInternedStr: 5,
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "ownerName",
            "person",
            "owner",
            "Alice",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createNumericLiteralArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "builtinLit",
                                builtinLit: {
                                    sum: {
                                        oneofKind: "numericInternedStr",
                                        numericInternedStr: 4,
                                    },
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "1.0000000000",
            "one",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [5],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createCaseArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "case",
                                case: {
                                    scrut: {
                                        sum: {
                                            oneofKind: "builtinCon",
                                            builtinCon: BuiltinCon.CON_TRUE,
                                        },
                                    },
                                    alts: [
                                        {
                                            sum: {
                                                oneofKind: "builtinCon",
                                                builtinCon: BuiltinCon.CON_TRUE,
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind:
                                                                "textInternedStr",
                                                            textInternedStr: 5,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                        {
                                            sum: {
                                                oneofKind: "default",
                                                default: {},
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind:
                                                                "textInternedStr",
                                                            textInternedStr: 6,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                } satisfies Case,
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "decision",
            "approved",
            "rejected",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createVariantCaseArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "case",
                                case: {
                                    scrut: {
                                        sum: {
                                            oneofKind: "variantCon",
                                            variantCon: {
                                                variantConInternedStr: 5,
                                                variantArg: {
                                                    sum: {
                                                        oneofKind: "builtinLit",
                                                        builtinLit: {
                                                            sum: {
                                                                oneofKind:
                                                                    "textInternedStr",
                                                                textInternedStr: 6,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    alts: [
                                        {
                                            sum: {
                                                oneofKind: "variant",
                                                variant: {
                                                    variantInternedStr: 5,
                                                    binderInternedStr: 7,
                                                },
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "varInternedStr",
                                                    varInternedStr: 7,
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "statusText",
            "Approved",
            "Alice",
            "owner",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createOptionalCaseArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "case",
                                case: {
                                    scrut: {
                                        sum: {
                                            oneofKind: "optionalSome",
                                            optionalSome: {
                                                value: {
                                                    sum: {
                                                        oneofKind: "builtinLit",
                                                        builtinLit: {
                                                            sum: {
                                                                oneofKind:
                                                                    "textInternedStr",
                                                                textInternedStr: 5,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    alts: [
                                        {
                                            sum: {
                                                oneofKind: "optionalSome",
                                                optionalSome: {
                                                    varBodyInternedStr: 6,
                                                },
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "varInternedStr",
                                                    varInternedStr: 6,
                                                },
                                            },
                                        },
                                        {
                                            sum: {
                                                oneofKind: "optionalNone",
                                                optionalNone: {},
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind:
                                                                "textInternedStr",
                                                            textInternedStr: 7,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "noteText",
            "hello",
            "note",
            "missing",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createBuiltinEqualityArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "app",
                                app: {
                                    fun: {
                                        sum: {
                                            oneofKind: "builtin",
                                            builtin: BuiltinFunction.EQUAL,
                                        },
                                    },
                                    args: [
                                        {
                                            sum: {
                                                oneofKind: "builtinLit",
                                                builtinLit: {
                                                    sum: {
                                                        oneofKind: "textInternedStr",
                                                        textInternedStr: 5,
                                                    },
                                                },
                                            },
                                        },
                                        {
                                            sum: {
                                                oneofKind: "builtinLit",
                                                builtinLit: {
                                                    sum: {
                                                        oneofKind: "textInternedStr",
                                                        textInternedStr: 5,
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "isOwner",
            "Alice",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createEnumCaseArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "case",
                                case: {
                                    scrut: {
                                        sum: {
                                            oneofKind: "enumCon",
                                            enumCon: {
                                                enumConInternedStr: 5,
                                            },
                                        },
                                    },
                                    alts: [
                                        {
                                            sum: {
                                                oneofKind: "enum",
                                                enum: {
                                                    constructorInternedStr: 5,
                                                },
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind: "textInternedStr",
                                                            textInternedStr: 6,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "statusLabel",
            "Active",
            "active",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createListCaseArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "case",
                                case: {
                                    scrut: {
                                        sum: {
                                            oneofKind: "cons",
                                            cons: {
                                                front: [
                                                    {
                                                        sum: {
                                                            oneofKind: "builtinLit",
                                                            builtinLit: {
                                                                sum: {
                                                                    oneofKind:
                                                                        "textInternedStr",
                                                                    textInternedStr: 5,
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                                tail: {
                                                    sum: {
                                                        oneofKind: "nil",
                                                        nil: {},
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    alts: [
                                        {
                                            sum: {
                                                oneofKind: "cons",
                                                cons: {
                                                    varHeadInternedStr: 6,
                                                    varTailInternedStr: 7,
                                                },
                                            },
                                            body: {
                                                sum: {
                                                    oneofKind: "varInternedStr",
                                                    varInternedStr: 6,
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "headValue",
            "head",
            "head",
            "tail",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createBuiltinComparisonArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "app",
                                app: {
                                    fun: {
                                        sum: {
                                            oneofKind: "builtin",
                                            builtin: BuiltinFunction.GREATER,
                                        },
                                    },
                                    args: [
                                        {
                                            sum: {
                                                oneofKind: "builtinLit",
                                                builtinLit: {
                                                    sum: {
                                                        oneofKind: "int64",
                                                        int64: "5",
                                                    },
                                                },
                                            },
                                        },
                                        {
                                            sum: {
                                                oneofKind: "builtinLit",
                                                builtinLit: {
                                                    sum: {
                                                        oneofKind: "int64",
                                                        int64: "0",
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "isPositive",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createAppendTextArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "app",
                                app: {
                                    fun: {
                                        sum: {
                                            oneofKind: "builtin",
                                            builtin: BuiltinFunction.APPEND_TEXT,
                                        },
                                    },
                                    args: [
                                        {
                                            sum: {
                                                oneofKind: "builtinLit",
                                                builtinLit: {
                                                    sum: {
                                                        oneofKind: "textInternedStr",
                                                        textInternedStr: 5,
                                                    },
                                                },
                                            },
                                        },
                                        {
                                            sum: {
                                                oneofKind: "builtinLit",
                                                builtinLit: {
                                                    sum: {
                                                        oneofKind: "textInternedStr",
                                                        textInternedStr: 6,
                                                    },
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "fullName",
            "Alice",
            " Smith",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createStructuralExpressionArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "tyAbs",
                                tyAbs: {
                                    param: [
                                        {
                                            varInternedStr: 14,
                                        },
                                    ],
                                    body: {
                                        sum: {
                                            oneofKind: "builtinLit",
                                            builtinLit: {
                                                sum: {
                                                    oneofKind: "textInternedStr",
                                                    textInternedStr: 9,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 2,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "tyApp",
                                tyApp: {
                                    expr: {
                                        sum: {
                                            oneofKind: "tyAbs",
                                            tyAbs: {
                                                param: [
                                                    {
                                                        varInternedStr: 14,
                                                    },
                                                ],
                                                body: {
                                                    sum: {
                                                        oneofKind: "builtinLit",
                                                        builtinLit: {
                                                            sum: {
                                                                oneofKind: "textInternedStr",
                                                                textInternedStr: 9,
                                                            },
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                    types: [
                                        {
                                            sum: {
                                                oneofKind: "builtin",
                                                builtin: {
                                                    builtin: BuiltinType.TEXT,
                                                    args: [],
                                                },
                                            },
                                        },
                                    ],
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 3,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "recUpd",
                                recUpd: {
                                    fieldInternedStr: 8,
                                    record: {
                                        sum: {
                                            oneofKind: "recCon",
                                            recCon: {
                                                fields: [
                                                    {
                                                        fieldInternedStr: 8,
                                                        expr: {
                                                            sum: {
                                                                oneofKind: "builtinLit",
                                                                builtinLit: {
                                                                    sum: {
                                                                        oneofKind: "textInternedStr",
                                                                        textInternedStr: 9,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    update: {
                                        sum: {
                                            oneofKind: "builtinLit",
                                            builtinLit: {
                                                sum: {
                                                    oneofKind: "textInternedStr",
                                                    textInternedStr: 10,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 4,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "structProj",
                                structProj: {
                                    fieldInternedStr: 8,
                                    struct: {
                                        sum: {
                                            oneofKind: "structCon",
                                            structCon: {
                                                fields: [
                                                    {
                                                        fieldInternedStr: 8,
                                                        expr: {
                                                            sum: {
                                                                oneofKind: "builtinLit",
                                                                builtinLit: {
                                                                    sum: {
                                                                        oneofKind: "textInternedStr",
                                                                        textInternedStr: 9,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 5,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "internedExpr",
                                internedExpr: 0,
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 6,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "structUpd",
                                structUpd: {
                                    fieldInternedStr: 8,
                                    struct: {
                                        sum: {
                                            oneofKind: "structCon",
                                            structCon: {
                                                fields: [
                                                    {
                                                        fieldInternedStr: 8,
                                                        expr: {
                                                            sum: {
                                                                oneofKind: "builtinLit",
                                                                builtinLit: {
                                                                    sum: {
                                                                        oneofKind: "textInternedStr",
                                                                        textInternedStr: 9,
                                                                    },
                                                                },
                                                            },
                                                        },
                                                    },
                                                ],
                                            },
                                        },
                                    },
                                    update: {
                                        sum: {
                                            oneofKind: "builtinLit",
                                            builtinLit: {
                                                sum: {
                                                    oneofKind: "textInternedStr",
                                                    textInternedStr: 10,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "typedGreeting",
            "appliedGreeting",
            "updatedOwner",
            "structOwner",
            "owner",
            "Alice",
            "Bob",
            "internedGreeting",
            "structUpdatedOwner",
            "cached",
            "a",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
            {
                segmentsInternedStr: [5],
            },
            {
                segmentsInternedStr: [6],
            },
            {
                segmentsInternedStr: [7],
            },
            {
                segmentsInternedStr: [11],
            },
            {
                segmentsInternedStr: [12],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [
            {
                sum: {
                    oneofKind: "builtinLit",
                    builtinLit: {
                        sum: {
                            oneofKind: "textInternedStr",
                            textInternedStr: 13,
                        },
                    },
                },
            },
        ],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createUpdateArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "update",
                                update: {
                                    sum: {
                                        oneofKind: "create",
                                        create: {
                                            template: createTemplateTypeConId(),
                                            expr: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind: "textInternedStr",
                                                            textInternedStr: 7,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 2,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "update",
                                update: {
                                    sum: {
                                        oneofKind: "fetch",
                                        fetch: {
                                            template: createTemplateTypeConId(),
                                            cid: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind: "textInternedStr",
                                                            textInternedStr: 8,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    {
                        nameWithType: {
                            nameInternedDname: 4,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: {
                            sum: {
                                oneofKind: "update",
                                update: {
                                    sum: {
                                        oneofKind: "exercise",
                                        exercise: {
                                            template: createTemplateTypeConId(),
                                            choiceInternedStr: 10,
                                            cid: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind: "textInternedStr",
                                                            textInternedStr: 8,
                                                        },
                                                    },
                                                },
                                            },
                                            arg: {
                                                sum: {
                                                    oneofKind: "builtinLit",
                                                    builtinLit: {
                                                        sum: {
                                                            oneofKind: "textInternedStr",
                                                            textInternedStr: 7,
                                                        },
                                                    },
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "CreateVault",
            "FetchVault",
            "Vault",
            "Alice",
            "00abc",
            "ExerciseVault",
            "Archive",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
            {
                segmentsInternedStr: [5],
            },
            {
                segmentsInternedStr: [6],
            },
            {
                segmentsInternedStr: [9],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createTemplateTypeConId(): TypeConId {
    return {
        module: {
            packageId: {
                sum: {
                    oneofKind: "selfPackageId",
                    selfPackageId: {},
                },
            },
            moduleNameInternedDname: 0,
        },
        nameInternedDname: 3,
    };
}

function createLambdaApplicationArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [],
                values: [
                    {
                        nameWithType: {
                            nameInternedDname: 1,
                            type: {
                                sum: {
                                    oneofKind: "builtin",
                                    builtin: {
                                        builtin: BuiltinType.TEXT,
                                        args: [],
                                    },
                                },
                            },
                        },
                        expr: createLetApplicationExpression(),
                    },
                ],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "applyGreeting",
            "greeting",
            "hello",
            "name",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createInternedTypeReferenceArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [
                    {
                        nameInternedDname: 1,
                        params: [],
                        serializable: true,
                        dataCons: {
                            oneofKind: "record",
                            record: {
                                fields: [
                                    {
                                        fieldInternedStr: 6,
                                        type: {
                                            sum: {
                                                oneofKind: "builtin",
                                                builtin: {
                                                    builtin: BuiltinType.TEXT,
                                                    args: [],
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                    {
                        nameInternedDname: 2,
                        params: [],
                        serializable: true,
                        dataCons: {
                            oneofKind: "record",
                            record: {
                                fields: [
                                    {
                                        fieldInternedStr: 7,
                                        type: {
                                            sum: {
                                                oneofKind: "internedType",
                                                internedType: 0,
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
                values: [],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "VaultIdentity",
            "Snapshot",
            "admin",
            "vaultIdentity",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
            {
                segmentsInternedStr: [5],
            },
        ],
        internedTypes: [
            {
                sum: {
                    oneofKind: "tapp",
                    tapp: {
                        lhs: {
                            sum: {
                                oneofKind: "con",
                                con: {
                                    tycon: {
                                        module: {
                                            packageId: {
                                                sum: {
                                                    oneofKind: "selfPackageId",
                                                    selfPackageId: {},
                                                },
                                            },
                                            moduleNameInternedDname: 0,
                                        },
                                        nameInternedDname: 1,
                                    },
                                    args: [],
                                },
                            },
                        },
                        rhs: {
                            sum: {
                                oneofKind: "builtin",
                                builtin: {
                                    builtin: BuiltinType.TEXT,
                                    args: [],
                                },
                            },
                        },
                    },
                },
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });
    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createEnumTypeReferenceArchiveBytes(): Uint8Array {
    const packageBytes = Package.toBinary({
        modules: [
            {
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [
                    {
                        nameInternedDname: 1,
                        params: [],
                        serializable: true,
                        dataCons: {
                            oneofKind: "enum",
                            enum: {
                                constructorsInternedStr: [6, 7],
                            },
                        },
                    },
                    {
                        nameInternedDname: 2,
                        params: [],
                        serializable: true,
                        dataCons: {
                            oneofKind: "record",
                            record: {
                                fields: [
                                    {
                                        fieldInternedStr: 8,
                                        type: {
                                            sum: {
                                                oneofKind: "con",
                                                con: {
                                                    tycon: {
                                                        module: {
                                                            packageId: {
                                                                sum: {
                                                                    oneofKind: "selfPackageId",
                                                                    selfPackageId: {},
                                                                },
                                                            },
                                                            moduleNameInternedDname: 0,
                                                        },
                                                        nameInternedDname: 1,
                                                    },
                                                    args: [],
                                                },
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    },
                ],
                values: [],
                templates: [],
                exceptions: [],
                interfaces: [],
            },
        ],
        internedStrings: [
            "sample-package",
            "1.0.0",
            "Sample",
            "Module",
            "VaultOperation",
            "Instruction",
            "OpDeposit",
            "OpRedeem",
            "operation",
        ],
        internedDottedNames: [
            {
                segmentsInternedStr: [2, 3],
            },
            {
                segmentsInternedStr: [4],
            },
            {
                segmentsInternedStr: [5],
            },
        ],
        metadata: {
            nameInternedStr: 0,
            versionInternedStr: 1,
        },
        internedTypes: [],
        internedKinds: [],
        internedExprs: [],
        importsSum: {
            oneofKind: undefined,
        },
    });

    const payloadBytes = ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: packageBytes,
        },
    });

    return Archive.toBinary({
        hashFunction: HashFunction.SHA256,
        payload: payloadBytes,
        hash: "sample-hash",
    });
}

function createLetApplicationExpression(): Expr {
    return {
        sum: {
            oneofKind: "let",
            let: {
                bindings: [
                    {
                        binder: createTextBinder(5),
                        bound: {
                            sum: {
                                oneofKind: "builtinLit",
                                builtinLit: {
                                    sum: {
                                        oneofKind: "textInternedStr",
                                        textInternedStr: 6,
                                    },
                                },
                            },
                        },
                    },
                ],
                body: {
                    sum: {
                        oneofKind: "app",
                        app: {
                            fun: {
                                sum: {
                                    oneofKind: "abs",
                                    abs: {
                                        param: [createTextBinder(7)],
                                        body: {
                                            sum: {
                                                oneofKind: "varInternedStr",
                                                varInternedStr: 7,
                                            },
                                        },
                                    },
                                },
                            },
                            args: [
                                {
                                    sum: {
                                        oneofKind: "varInternedStr",
                                        varInternedStr: 5,
                                    },
                                },
                            ],
                        },
                    },
                },
            } satisfies Block,
        },
    };
}

function createTextBinder(varInternedStr: number): VarWithType {
    return {
        varInternedStr,
        type: {
            sum: {
                oneofKind: "builtin",
                builtin: {
                    builtin: BuiltinType.TEXT,
                    args: [],
                },
            },
        },
    };
}
