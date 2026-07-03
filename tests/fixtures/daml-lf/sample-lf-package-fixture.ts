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
                    dataTypes: [],
                    values: [],
                    templates: [],
                    exceptions: [],
                    interfaces: [],
                },
            ],
            internedStrings: ["sample-package", "1.0.0", "Sample", "Module"],
            internedDottedNames: [
                {
                    segmentsInternedStr: [2, 3],
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
