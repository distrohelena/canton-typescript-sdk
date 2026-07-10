import { strToU8, zipSync } from "fflate";

export function createSourceMappedDarFixture(): Uint8Array {
    return zipSync({
        "META-INF/MANIFEST.MF": strToU8(
            "Manifest-Version: 1.0\nMain-Dalf: Sample.dalf\n",
        ),
        "Sample.dalf": new Uint8Array([1, 2, 3, 4]),
        "src/Main.daml": strToU8(
            "module Main where\n\narchive : ()\narchive = ()\n",
        ),
        "debug/source-map.json": strToU8(
            JSON.stringify({
                executables: [
                    {
                        packageId: "pkg-sample",
                        moduleName: "Main",
                        definitionName: "archive",
                        path: "src/Main.daml",
                        startLine: 3,
                        startColumn: 1,
                        endLine: 4,
                        endColumn: 13,
                    },
                ],
            }),
        ),
    });
}
