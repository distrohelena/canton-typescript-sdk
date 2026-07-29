import { BuiltinType } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";
import {
    Archive,
    ArchivePayload,
    HashFunction,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import { Package } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf2.js";

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

    private static wrapLf2Package(packageBytes: Uint8Array): Uint8Array {
        const payloadBytes = ArchivePayload.toBinary({
            minor: "1",
            patch: 0,
            sum: { oneofKind: "damlLf2", damlLf2: packageBytes },
        });

        return Archive.toBinary({
            hashFunction: HashFunction.SHA256,
            payload: payloadBytes,
            hash: "sample-hash",
        });
    }
}
