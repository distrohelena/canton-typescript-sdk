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
import { ReplaySourceMapException } from "../../../../src/debugger/index.js";
import { SourceCoverageValidator } from "../../../../src/debugger/source/source-coverage-validator.js";
import { SourceIndexedCompilation } from "../../../../src/debugger/source/source-indexed-compilation.js";
import { createSourceMappedDarFixture } from "../../../fixtures/daml-lf/source-mapped-dar-fixture.js";

describe("SourceCoverageValidator", () => {
    it("rejects a required symbol that has no source map entry", async () => {
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

        expect(() =>
            SourceCoverageValidator.validateOrThrow(indexed, [
                {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    definitionName: "missing",
                },
            ]),
        ).toThrow(ReplaySourceMapException);
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
