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
});

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
