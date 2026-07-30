import { BuiltinType } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import {
    Archive,
    ArchivePayload,
    HashFunction,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { Package, Type } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import { strToU8, zipSync } from "fflate";

export class SampleLfPackageFixture {
    public static createLf2ArchiveBytes(): Uint8Array {
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
                                        {
                                            fieldInternedStr: 7,
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
                    ],
                    values: [
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
                    templates: [
                        {
                            tyconInternedDname: 1,
                            paramInternedStr: 8,
                            choices: [
                                {
                                    nameInternedStr: 10,
                                    consuming: true,
                                    argBinder: {
                                        varInternedStr: 11,
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
                                    retType: {
                                        sum: {
                                            oneofKind: "builtin",
                                            builtin: {
                                                builtin: BuiltinType.TEXT,
                                                args: [],
                                            },
                                        },
                                    },
                                    update: {
                                        sum: {
                                            oneofKind: "builtinLit",
                                            builtinLit: {
                                                sum: {
                                                    oneofKind: "textInternedStr",
                                                    textInternedStr: 11,
                                                },
                                            },
                                        },
                                    },
                                    selfBinderInternedStr: 12,
                                },
                            ],
                            implements: [],
                        },
                    ],
                    exceptions: [],
                    interfaces: [],
                },
            ],
            internedStrings: [
                "sample-package",
                "1.0.0",
                "Sample",
                "Module",
                "Iou",
                "greeting",
                "issuer",
                "owner",
                "this",
                "hello",
                "Transfer",
                "newOwner",
                "self",
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

    /** A materialization fixture with nested values and two independently typed choices. */
    public static createMaterializationLf2ArchiveBytes(): Uint8Array {
        const builtin = (builtinType: BuiltinType, args: readonly unknown[] = []) => ({
            sum: { oneofKind: "builtin" as const, builtin: { builtin: builtinType, args } },
        });

        const apply = (lhs: ReturnType<typeof builtin>, rhs: ReturnType<typeof builtin>) => ({
            sum: { oneofKind: "tapp" as const, tapp: { lhs, rhs } },
        });

        const typeCon = (nameInternedDname: number) => ({
            sum: {
                oneofKind: "con" as const,
                con: {
                    tycon: {
                        module: {
                            packageId: { sum: { oneofKind: "selfPackageId" as const, selfPackageId: {} } },
                            moduleNameInternedDname: 0,
                        },
                        nameInternedDname,
                    },
                    args: [],
                },
            },
        });

        const packageBytes = Package.toBinary({
            modules: [{
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [{
                    nameInternedDname: 1,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                { fieldInternedStr: 6, type: builtin(BuiltinType.TEXT) },
                                { fieldInternedStr: 7, type: typeCon(2) },
                                { fieldInternedStr: 8, type: apply(builtin(BuiltinType.LIST), builtin(BuiltinType.TEXT)) },
                                { fieldInternedStr: 9, type: apply(builtin(BuiltinType.OPTIONAL), builtin(BuiltinType.TEXT)) },
                            ],
                        },
                    },
                }, {
                    nameInternedDname: 2,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                { fieldInternedStr: 10, type: builtin(BuiltinType.TEXT) },
                                { fieldInternedStr: 11, type: builtin(BuiltinType.TEXT) },
                            ],
                        },
                    },
                }],
                values: [],
                templates: [{
                    tyconInternedDname: 1,
                    paramInternedStr: 12,
                    choices: [{
                        nameInternedStr: 13,
                        consuming: false,
                        argBinder: { varInternedStr: 14, type: builtin(BuiltinType.TEXT) },
                        retType: builtin(BuiltinType.TEXT),
                        update: { sum: { oneofKind: undefined } },
                        selfBinderInternedStr: 15,
                    }, {
                        nameInternedStr: 16,
                        consuming: true,
                        argBinder: { varInternedStr: 17, type: builtin(BuiltinType.UNIT) },
                        retType: builtin(BuiltinType.UNIT),
                        update: { sum: { oneofKind: undefined } },
                        selfBinderInternedStr: 15,
                    }],
                    implements: [],
                }],
                exceptions: [],
                interfaces: [],
            }],
            internedStrings: [
                "sample-package", "1.0.0", "Sample", "Module", "Iou", "Details",
                "issuer", "details", "tags", "note", "owner", "reference", "this",
                "Transfer", "newOwner", "self", "Archive", "unit",
            ],
            internedDottedNames: [
                { segmentsInternedStr: [2, 3] },
                { segmentsInternedStr: [4] },
                { segmentsInternedStr: [5] },
            ],
            metadata: { nameInternedStr: 0, versionInternedStr: 1 },
            internedTypes: [],
            internedKinds: [],
            internedExprs: [],
            importsSum: { oneofKind: undefined },
        });

        return this.wrapLf2Package(packageBytes);
    }

    /** A template that reaches self- and mutually-recursive generic named types. */
    public static createGenericRecursiveLf2ArchiveBytes(): Uint8Array {
        const builtin = (builtinType: BuiltinType): Type => ({
            sum: { oneofKind: "builtin", builtin: { builtin: builtinType, args: [] } },
        });

        const typeVariable = (varInternedStr: number): Type => ({
            sum: { oneofKind: "var", var: { varInternedStr, args: [] } },
        });

        const typeCon = (nameInternedDname: number, args: readonly Type[] = []): Type => ({
            sum: {
                oneofKind: "con",
                con: {
                    tycon: {
                        module: {
                            packageId: { sum: { oneofKind: "selfPackageId", selfPackageId: {} } },
                            moduleNameInternedDname: 0,
                        },
                        nameInternedDname,
                    },
                    args: [...args],
                },
            },
        });

        const optional = (element: Type): Type => ({
            sum: {
                oneofKind: "tapp",
                tapp: { lhs: builtin(BuiltinType.OPTIONAL), rhs: element },
            },
        });

        const parameter = { varInternedStr: 8, kind: { sum: { oneofKind: "star" as const, star: {} } } };

        const packageBytes = Package.toBinary({
            modules: [{
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [{
                    nameInternedDname: 1,
                    params: [parameter],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                { fieldInternedStr: 9, type: typeVariable(8) },
                                { fieldInternedStr: 10, type: optional(typeCon(1, [typeVariable(8)])) },
                            ],
                        },
                    },
                }, {
                    nameInternedDname: 2,
                    params: [parameter],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: { fields: [{ fieldInternedStr: 11, type: optional(typeCon(3, [typeVariable(8)])) }] },
                    },
                }, {
                    nameInternedDname: 3,
                    params: [parameter],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                { fieldInternedStr: 9, type: typeVariable(8) },
                                { fieldInternedStr: 12, type: optional(typeCon(2, [typeVariable(8)])) },
                            ],
                        },
                    },
                }, {
                    nameInternedDname: 4,
                    params: [parameter],
                    serializable: true,
                    dataCons: {
                        oneofKind: "variant",
                        variant: {
                            fields: [
                                { fieldInternedStr: 13, type: builtin(BuiltinType.UNIT) },
                                { fieldInternedStr: 14, type: typeVariable(8) },
                            ],
                        },
                    },
                }, {
                    nameInternedDname: 5,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [
                                { fieldInternedStr: 15, type: typeCon(1, [builtin(BuiltinType.TEXT)]) },
                                { fieldInternedStr: 16, type: typeCon(1, [builtin(BuiltinType.INT64)]) },
                                { fieldInternedStr: 17, type: typeCon(2, [builtin(BuiltinType.TEXT)]) },
                                { fieldInternedStr: 18, type: typeCon(4, [builtin(BuiltinType.TEXT)]) },
                            ],
                        },
                    },
                }],
                values: [],
                templates: [{
                    tyconInternedDname: 5,
                    paramInternedStr: 19,
                    choices: [],
                    implements: [],
                }],
                exceptions: [],
                interfaces: [],
            }],
            internedStrings: [
                "Sample", "Generic", "Node", "Left", "Right", "GenericVariant", "GenericIou", "unused",
                "a", "label", "next", "right", "left", "Empty", "Value", "textNode", "intNode", "leftText", "variant", "this",
            ],
            internedDottedNames: [
                { segmentsInternedStr: [0, 1] },
                { segmentsInternedStr: [2] },
                { segmentsInternedStr: [3] },
                { segmentsInternedStr: [4] },
                { segmentsInternedStr: [5] },
                { segmentsInternedStr: [6] },
            ],
            metadata: { nameInternedStr: 7, versionInternedStr: 7 },
            internedTypes: [],
            internedKinds: [],
            internedExprs: [],
            importsSum: { oneofKind: undefined },
        });

        return this.wrapLf2Package(packageBytes);
    }

    /** One Dalf whose ContractId targets a deliberately absent external Holding package. */
    public static createOpaqueContractIdLf2ArchiveBytes(): Uint8Array {
        const externalHolding = () => ({
            sum: {
                oneofKind: "con" as const,
                con: {
                    tycon: {
                        module: {
                            packageId: {
                                sum: {
                                    oneofKind: "importedPackageIdInternedStr" as const,
                                    importedPackageIdInternedStr: 10,
                                },
                            },
                            moduleNameInternedDname: 2,
                        },
                        nameInternedDname: 3,
                    },
                    args: [],
                },
            },
        });

        const contractId = () => ({
            sum: {
                oneofKind: "builtin" as const,
                builtin: {
                    builtin: BuiltinType.CONTRACT_ID,
                    args: [externalHolding()],
                },
            },
        });

        const packageBytes = Package.toBinary({
            modules: [{
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [{
                    nameInternedDname: 1,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [{ fieldInternedStr: 5, type: contractId() }],
                        },
                    },
                }],
                values: [],
                templates: [{
                    tyconInternedDname: 1,
                    paramInternedStr: 6,
                    choices: [{
                        nameInternedStr: 7,
                        consuming: false,
                        argBinder: { varInternedStr: 8, type: contractId() },
                        retType: contractId(),
                        update: { sum: { oneofKind: undefined } },
                        selfBinderInternedStr: 9,
                    }],
                    implements: [],
                }],
                exceptions: [],
                interfaces: [],
            }],
            internedStrings: [
                "Sample", "Opaque", "Splice", "Holding", "unused", "holding", "this",
                "Transfer", "newHolding", "self", "missing", "Api", "Token", "HoldingV1",
            ],
            internedDottedNames: [
                { segmentsInternedStr: [0, 1] },
                { segmentsInternedStr: [1] },
                { segmentsInternedStr: [2, 11, 12, 13] },
                { segmentsInternedStr: [3] },
            ],
            metadata: { nameInternedStr: 4, versionInternedStr: 4 },
            internedTypes: [],
            internedKinds: [],
            internedExprs: [],
            importsSum: { oneofKind: undefined },
        });

        return this.wrapLf2Package(packageBytes);
    }

    /** A package with unresolved external references that no emitted template reaches. */
    public static createUnusedExternalReferencesLf2ArchiveBytes(): Uint8Array {
        return this.createExternalReferencesLf2ArchiveBytes("unused");
    }

    /** A package whose template field directly references an unavailable external type. */
    public static createExternalReferenceInTemplateFieldLf2ArchiveBytes(): Uint8Array {
        return this.createExternalReferencesLf2ArchiveBytes("field");
    }

    /** A package whose template choice directly references an unavailable external type. */
    public static createExternalReferenceInTemplateChoiceLf2ArchiveBytes(): Uint8Array {
        return this.createExternalReferencesLf2ArchiveBytes("choice");
    }

    /** A manifest-backed, multi-entry DAR containing the supplied main Dalf and a second template Dalf. */
    public static createTemplateGenerationDarBytes(mainDalfBytes: Uint8Array): Uint8Array {
        return zipSync({
            "META-INF/MANIFEST.MF": strToU8(
                "Manifest-Version: 1.0\nMain-Dalf: lazy-main.dalf\n",
            ),
            "lazy-main.dalf": mainDalfBytes,
            "second-template.dalf": this.createSecondTemplateLf2ArchiveBytes(),
        });
    }

    /** Two same-named templates and generated-name reserved labels for compiler integration coverage. */
    public static createCollisionLf2ArchiveBytes(): Uint8Array {
        const text = () => ({
            sum: { oneofKind: "builtin" as const, builtin: { builtin: BuiltinType.TEXT, args: [] } },
        });

        const module = (nameInternedDname: number, templateInternedDname: number) => ({
            nameInternedDname,
            synonyms: [],
            dataTypes: [{
                nameInternedDname: templateInternedDname,
                params: [],
                serializable: true,
                dataCons: {
                    oneofKind: "record" as const,
                    record: {
                        fields: [
                            { fieldInternedStr: 8, type: text() },
                            { fieldInternedStr: 9, type: text() },
                            { fieldInternedStr: 10, type: text() },
                        ],
                    },
                },
            }],
            values: [],
            templates: [{
                tyconInternedDname: templateInternedDname,
                paramInternedStr: 11,
                choices: [],
                implements: [],
            }],
            exceptions: [],
            interfaces: [],
        });

        const packageBytes = Package.toBinary({
            modules: [module(0, 2), module(1, 2)],
            internedStrings: [
                "First", "Second", "Iou", "sample-package", "1.0.0", "Sample",
                "Module", "unused", "get", "contractId", "constructor", "this",
            ],
            internedDottedNames: [
                { segmentsInternedStr: [5, 0] },
                { segmentsInternedStr: [5, 1] },
                { segmentsInternedStr: [2] },
            ],
            metadata: { nameInternedStr: 3, versionInternedStr: 4 },
            internedTypes: [],
            internedKinds: [],
            internedExprs: [],
            importsSum: { oneofKind: undefined },
        });

        return this.wrapLf2Package(packageBytes);
    }

    private static createExternalReferencesLf2ArchiveBytes(
        reachableReference: "unused" | "field" | "choice",
    ): Uint8Array {
        const text = () => ({
            sum: {
                oneofKind: "builtin" as const,
                builtin: { builtin: BuiltinType.TEXT, args: [] },
            },
        });

        const externalHolding = () => ({
            sum: {
                oneofKind: "con" as const,
                con: {
                    tycon: {
                        module: {
                            packageId: {
                                sum: {
                                    oneofKind: "importedPackageIdInternedStr" as const,
                                    importedPackageIdInternedStr: 12,
                                },
                            },
                            moduleNameInternedDname: 4,
                        },
                        nameInternedDname: 5,
                    },
                    args: [],
                },
            },
        });

        const packageBytes = Package.toBinary({
            modules: [{
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [{
                    nameInternedDname: 1,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [{
                                fieldInternedStr: 7,
                                type: reachableReference === "field"
                                    ? externalHolding()
                                    : text(),
                            }],
                        },
                    },
                }, {
                    nameInternedDname: 2,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: {
                            fields: [{ fieldInternedStr: 7, type: externalHolding() }],
                        },
                    },
                }],
                values: [{
                    nameWithType: {
                        nameInternedDname: 3,
                        type: externalHolding(),
                    },
                    expr: { sum: { oneofKind: undefined } },
                }],
                templates: [{
                    tyconInternedDname: 1,
                    paramInternedStr: 8,
                    choices: [{
                        nameInternedStr: 9,
                        consuming: false,
                        argBinder: {
                            varInternedStr: 10,
                            type: reachableReference === "choice"
                                ? externalHolding()
                                : text(),
                        },
                        retType: text(),
                        update: { sum: { oneofKind: undefined } },
                        selfBinderInternedStr: 11,
                    }],
                    implements: [],
                }],
                exceptions: [],
                interfaces: [],
            }],
            internedStrings: [
                "Sample", "Lazy", "Iou", "UnusedExternalType", "unusedExternalValue", "Holding",
                "sample-package", "issuer", "this", "Transfer", "newIssuer", "self",
                "missing-package-id", "Splice", "Api", "Token", "HoldingV1", "1.0.0",
            ],
            internedDottedNames: [
                { segmentsInternedStr: [0, 1] },
                { segmentsInternedStr: [2] },
                { segmentsInternedStr: [3] },
                { segmentsInternedStr: [4] },
                { segmentsInternedStr: [13, 14, 15, 16] },
                { segmentsInternedStr: [5] },
            ],
            metadata: { nameInternedStr: 6, versionInternedStr: 17 },
            internedTypes: [],
            internedKinds: [],
            internedExprs: [],
            importsSum: { oneofKind: undefined },
        });

        return this.wrapLf2Package(packageBytes);
    }

    private static createSecondTemplateLf2ArchiveBytes(): Uint8Array {
        const text = () => ({
            sum: {
                oneofKind: "builtin" as const,
                builtin: { builtin: BuiltinType.TEXT, args: [] },
            },
        });

        const packageBytes = Package.toBinary({
            modules: [{
                nameInternedDname: 0,
                synonyms: [],
                dataTypes: [{
                    nameInternedDname: 1,
                    params: [],
                    serializable: true,
                    dataCons: {
                        oneofKind: "record",
                        record: { fields: [{ fieldInternedStr: 5, type: text() }] },
                    },
                }],
                values: [],
                templates: [{
                    tyconInternedDname: 1,
                    paramInternedStr: 6,
                    choices: [],
                    implements: [],
                }],
                exceptions: [],
                interfaces: [],
            }],
            internedStrings: [
                "Sample", "Second", "Note", "second-package", "1.0.0", "body", "this",
            ],
            internedDottedNames: [
                { segmentsInternedStr: [0, 1] },
                { segmentsInternedStr: [2] },
            ],
            metadata: { nameInternedStr: 3, versionInternedStr: 4 },
            internedTypes: [],
            internedKinds: [],
            internedExprs: [],
            importsSum: { oneofKind: undefined },
        });

        return this.wrapLf2Package(packageBytes, "second-template-package-id");
    }

    private static wrapLf2Package(
        packageBytes: Uint8Array,
        hash = "sample-hash",
    ): Uint8Array {
        const payloadBytes = ArchivePayload.toBinary({
            minor: "1",
            patch: 0,
            sum: { oneofKind: "damlLf2", damlLf2: packageBytes },
        });

        return Archive.toBinary({
            hashFunction: HashFunction.SHA256,
            payload: payloadBytes,
            hash,
        });
    }
}
