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
}
