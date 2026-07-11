import { strToU8, zipSync } from "fflate";

export function createSourceMappedDarFixture(init?: {
    additionalEntries?: Readonly<Record<string, Uint8Array>>;
    mainDalfBytes?: Uint8Array;
    packageId?: string;
    definitionName?: string;
    importedPackages?: readonly string[];
    executables?: readonly {
        packageId: string;
        moduleName: string;
        definitionName: string;
        path: string;
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
        precision?: "exact" | "fallback";
        entrypointKind?: "create" | "exercise";
        templateName?: string;
        choiceName?: string;
        choiceArgumentFieldName?: string;
    }[];
    expressionLocations?: readonly {
        packageId: string;
        moduleName: string;
        definitionName: string;
        expressionPath: readonly number[];
        path: string;
        startLine: number;
        startColumn: number;
        endLine: number;
        endColumn: number;
    }[];
}): Uint8Array {
    return zipSync({
        "META-INF/MANIFEST.MF": strToU8(
            "Manifest-Version: 1.0\nMain-Dalf: Sample.dalf\n",
        ),
        "Sample.dalf": init?.mainDalfBytes ?? new Uint8Array([1, 2, 3, 4]),
        "src/Main.daml": strToU8(
            "module Main where\n\narchive : ()\narchive = ()\n",
        ),
        "debug/source-map.json": strToU8(
            JSON.stringify({
                packageId: init?.packageId ?? "pkg-sample",
                importedPackages: init?.importedPackages ?? [],
                executables:
                    init?.executables ?? [
                        {
                            packageId: init?.packageId ?? "pkg-sample",
                            moduleName: "Main",
                            definitionName: init?.definitionName ?? "archive",
                            path: "src/Main.daml",
                            startLine: 3,
                            startColumn: 1,
                            endLine: 4,
                            endColumn: 13,
                        },
                    ],
                expressionLocations: init?.expressionLocations ?? [],
            }),
        ),
        ...(init?.additionalEntries ?? {}),
    });
}
