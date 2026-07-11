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

    it("indexes a compiler expression location by its canonical child path", async () => {
        const calledValue = new DamlLfExpression({ textLiteral: "called" });
        const definition = new DamlLfValueDefinition({
            name: "archive",
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                application: {
                    function: calledValue,
                    arguments: [new DamlLfExpression({ textLiteral: "argument" })],
                },
            }),
        });
        const compilation = createCompilationWithDefinition(definition);
        const indexed = SourceIndexedCompilation.createOrThrow(compilation, [
            await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                createSourceMappedDarFixture({
                    packageId: "pkg-sample",
                    definitionName: "archive",
                    expressionLocations: [
                        {
                            packageId: "pkg-sample",
                            moduleName: "Main",
                            definitionName: "archive",
                            expressionPath: [0],
                            path: "src/Main.daml",
                            startLine: 868,
                            startColumn: 8,
                            endLine: 868,
                            endColumn: 54,
                        },
                    ],
                }),
            ),
        ]);

        expect(indexed.getExpressionSource(calledValue)).toEqual({
            path: "src/Main.daml",
            startLine: 868,
            startColumn: 8,
            endLine: 868,
            endColumn: 54,
        });
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
    return createCompilationWithDefinition(
        new DamlLfValueDefinition({
            name: definitionName,
            type: new DamlLfType({}),
            expression: new DamlLfExpression({
                textLiteral: "demo",
            }),
        }),
    );
}

function createCompilationWithDefinition(
    definition: DamlLfValueDefinition,
): DamlLfCompilation {
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
                            definition,
                        ],
                    }),
                ],
            }),
        ]),
    );
}
