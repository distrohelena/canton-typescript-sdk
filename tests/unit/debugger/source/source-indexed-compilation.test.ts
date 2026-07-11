import { describe, expect, it } from "vitest";
import {
    DamlLfCompilation,
    DamlLfExpression,
    DamlLfLanguageVersion,
    DamlLfModule,
    DamlLfPackage,
    DamlLfType,
    DamlLfValueDefinition,
    DamlLfWorkspace,
    DarSourceBundleLoader,
} from "../../../../src/daml-lf/index.js";
import { SourceIndexedCompilation } from "../../../../src/debugger/source/source-indexed-compilation.js";
import { createSourceMappedDarFixture } from "../../../fixtures/daml-lf/source-mapped-dar-fixture.js";

describe("SourceIndexedCompilation", () => {
    it("indexes executable definitions against dar source spans", async () => {
        const indexed = SourceIndexedCompilation.createOrThrow(
            createCompilation("archive"),
            [
                await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                    createSourceMappedDarFixture({
                        packageId: "pkg-sample",
                        definitionName: "archive",
                    }),
                ),
            ],
        );

        expect(
            indexed.getDefinitionSourceOrThrow("pkg-sample", "Main", "archive"),
        ).toEqual(
            expect.objectContaining({
                path: "src/Main.daml",
            }),
        );
    });

    it("defaults unannotated definition metadata to fallback precision", async () => {
        const indexed = await createIndexedCompilation();

        expect(
            (
                indexed.getDefinitionSourceOrThrow(
                    "pkg-sample",
                    "Main",
                    "archive",
                ) as { precision?: string }
            ).precision,
        ).toBe("fallback");
    });

    it("preserves exact precision from DAR metadata", async () => {
        const indexed = await createIndexedCompilation("exact");

        expect(
            (
                indexed.getDefinitionSourceOrThrow(
                    "pkg-sample",
                    "Main",
                    "archive",
                ) as { precision?: string }
            ).precision,
        ).toBe("exact");
    });
});

async function createIndexedCompilation(
    precision?: "exact" | "fallback",
): Promise<SourceIndexedCompilation> {
    return SourceIndexedCompilation.createOrThrow(
        createCompilation("archive"),
        [
            await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                createSourceMappedDarFixture({
                    packageId: "pkg-sample",
                    definitionName: "archive",
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
                            precision,
                        },
                    ],
                }),
            ),
        ],
    );
}

function createCompilation(definitionName: string): DamlLfCompilation {
    return DamlLfCompilation.createOrThrow(
        new DamlLfWorkspace([
            new DamlLfPackage({
                packageId: "pkg-sample",
                packageName: "sample",
                packageVersion: "1.0.0",
                languageVersion: new DamlLfLanguageVersion({
                    major: 2,
                    minor: "dev",
                    patch: 0,
                }),
                modules: [
                    new DamlLfModule({
                        name: "Main",
                        definitions: [
                            new DamlLfValueDefinition({
                                name: definitionName,
                                type: new DamlLfType({}),
                                expression: new DamlLfExpression({
                                    textLiteral: "demo",
                                }),
                            }),
                        ],
                    }),
                ],
            }),
        ]),
    );
}
