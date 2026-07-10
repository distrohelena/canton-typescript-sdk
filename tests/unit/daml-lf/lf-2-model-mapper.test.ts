import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlLfPackageLoader } from "../../../src/daml-lf/daml-lf-package-loader.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfNodeKind } from "../../../src/daml-lf/model/daml-lf-node-kind.js";
import { DamlLfTemplate } from "../../../src/daml-lf/model/daml-lf-template.js";
import { Archive, ArchivePayload, HashFunction } from "../../../src/transports/grpc/generated/canton/com/digitalasset/daml/lf/archive/daml_lf.js";
import {
    BuiltinType,
    Package,
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
