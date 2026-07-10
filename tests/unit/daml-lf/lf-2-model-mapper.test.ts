import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlLfPackageLoader } from "../../../src/daml-lf/daml-lf-package-loader.js";
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
