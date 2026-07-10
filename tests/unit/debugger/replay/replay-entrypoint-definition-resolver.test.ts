import { describe, expect, it } from "vitest";
import {
    DamlLfCompilation,
    DamlLfExpression,
    DamlLfLanguageVersion,
    DamlLfModule,
    DamlLfPackage,
    DamlLfTemplateId,
    DamlLfType,
    DamlLfValueDefinition,
    DamlLfWorkspace,
    DarSourceBundleLoader,
} from "../../../../src/daml-lf/index.js";
import { ReplayEntrypointDefinitionResolver } from "../../../../src/debugger/replay/replay-entrypoint-definition-resolver.js";
import { ReplayEntrypoint } from "../../../../src/debugger/replay/replay-entrypoint.js";
import { SourceIndexedCompilation } from "../../../../src/debugger/source/source-indexed-compilation.js";
import { createSourceMappedDarFixture } from "../../../fixtures/daml-lf/source-mapped-dar-fixture.js";

describe("ReplayEntrypointDefinitionResolver", () => {
    it("resolves create entrypoints from dar source-map executable metadata", async () => {
        const indexedCompilation = await createIndexedCompilation();
        const resolver = new ReplayEntrypointDefinitionResolver(
            indexedCompilation,
        );

        const resolved = resolver.resolveEntrypointDefinitionOrThrow(
            new ReplayEntrypoint({
                kind: "create",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                argument: {
                    owner: "Alice",
                },
            }),
        );

        expect(resolved.packageId).toBe("pkg-sample");
        expect(resolved.moduleName).toBe("Main");
        expect(resolved.definition.name).toBe("createVaultHandler");
    });

    it("resolves exercised entrypoints from template and choice metadata", async () => {
        const indexedCompilation = await createIndexedCompilation();
        const resolver = new ReplayEntrypointDefinitionResolver(
            indexedCompilation,
        );

        const resolved = resolver.resolveEntrypointDefinitionOrThrow(
            new ReplayEntrypoint({
                kind: "exercise",
                templateId: {
                    packageId: "pkg-sample",
                    moduleName: "Main",
                    entityName: "Vault",
                },
                contractId: "00abc",
                choice: "Archive",
                argument: {},
            }),
        );

        expect(resolved.packageId).toBe("pkg-sample");
        expect(resolved.moduleName).toBe("Main");
        expect(resolved.definition.name).toBe("archiveVaultHandler");
    });

    it("resolves nested choice handlers from template and choice metadata", async () => {
        const indexedCompilation = await createIndexedCompilation();
        const resolver = new ReplayEntrypointDefinitionResolver(
            indexedCompilation,
        );

        const resolved = resolver.resolveChoiceDefinitionOrThrow(
            new DamlLfTemplateId({
                packageId: "pkg-sample",
                moduleName: "Main",
                templateName: "Vault",
            }),
            "Archive",
        );

        expect(resolved.packageId).toBe("pkg-sample");
        expect(resolved.moduleName).toBe("Main");
        expect(resolved.definition.name).toBe("archiveVaultHandler");
    });
});

async function createIndexedCompilation(): Promise<SourceIndexedCompilation> {
    return SourceIndexedCompilation.createOrThrow(
        DamlLfCompilation.createOrThrow(
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
                                    name: "createVaultHandler",
                                    type: new DamlLfType({}),
                                    expression: new DamlLfExpression({
                                        textLiteral: "created",
                                    }),
                                }),
                                new DamlLfValueDefinition({
                                    name: "archiveVaultHandler",
                                    type: new DamlLfType({}),
                                    expression: new DamlLfExpression({
                                        textLiteral: "archived",
                                    }),
                                }),
                            ],
                        }),
                    ],
                }),
            ]),
        ),
        [
            await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
                createSourceMappedDarFixture({
                    packageId: "pkg-sample",
                    executables: [
                        {
                            packageId: "pkg-sample",
                            moduleName: "Main",
                            definitionName: "createVaultHandler",
                            path: "src/Main.daml",
                            startLine: 3,
                            startColumn: 1,
                            endLine: 4,
                            endColumn: 13,
                            entrypointKind: "create",
                            templateName: "Vault",
                        },
                        {
                            packageId: "pkg-sample",
                            moduleName: "Main",
                            definitionName: "archiveVaultHandler",
                            path: "src/Main.daml",
                            startLine: 3,
                            startColumn: 1,
                            endLine: 4,
                            endColumn: 13,
                            entrypointKind: "exercise",
                            templateName: "Vault",
                            choiceName: "Archive",
                        },
                    ],
                }),
            ),
        ],
    );
}
