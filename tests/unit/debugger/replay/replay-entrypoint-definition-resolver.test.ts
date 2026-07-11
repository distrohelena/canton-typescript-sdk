import { describe, expect, it } from "vitest";
import {
    DamlLfChoice,
    DamlLfChoiceParameter,
    DamlLfCompilation,
    DamlLfDataType,
    DamlLfExpression,
    DamlLfLanguageVersion,
    DamlLfModule,
    DamlLfPackage,
    DamlLfTemplate,
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
        expect(resolved.replayBindingMode).toBe("standard");
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
        expect(resolved.replayBindingMode).toBe("templateChoice");
        expect(resolved.replayExpression.lambda?.parameters).toEqual([
            "self",
            "this",
            "choiceArg",
        ]);
        expect(resolved.replayExpression.lambda?.body.updateExpression?.kind).toBe(
            "fetch",
        );
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
        expect(resolved.replayBindingMode).toBe("templateChoice");
        expect(resolved.replayExpression.lambda?.parameters).toEqual([
            "self",
            "this",
            "choiceArg",
        ]);
        expect(resolved.replayExpression.lambda?.body.updateExpression?.kind).toBe(
            "fetch",
        );
    });

    it("falls back to the template choice body when nested executable metadata is missing", async () => {
        const indexedCompilation = await createIndexedCompilation({
            includeArchiveExecutable: false,
        });
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
        expect(resolved.definition.name).toBe("Vault$Archive");
        expect(resolved.replayBindingMode).toBe("templateChoice");
        expect(resolved.replayExpression.lambda?.parameters).toEqual([
            "self",
            "this",
            "choiceArg",
        ]);
    });
});

async function createIndexedCompilation(options?: {
    includeArchiveExecutable?: boolean;
}): Promise<SourceIndexedCompilation> {
    const includeArchiveExecutable = options?.includeArchiveExecutable ?? true;

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
                                        recordConstruction: {
                                            fields: [
                                                {
                                                    name: "m_exercise",
                                                    value: new DamlLfExpression({
                                                        lambda: {
                                                            parameters: [
                                                                "_",
                                                                "this",
                                                                "arg",
                                                            ],
                                                            body: new DamlLfExpression({
                                                                updateExpression: {
                                                                    kind: "exercise",
                                                                    templateId: {
                                                                        packageId: "pkg-sample",
                                                                        moduleName: "Main",
                                                                        templateName: "Vault",
                                                                    },
                                                                    choiceName: "Archive",
                                                                    contractId: new DamlLfExpression({
                                                                        variableName: "this",
                                                                    }),
                                                                    argument: new DamlLfExpression({
                                                                        variableName: "arg",
                                                                    }),
                                                                },
                                                            }),
                                                        },
                                                    }),
                                                },
                                            ],
                                        },
                                    }),
                                }),
                                new DamlLfDataType({
                                    name: "Vault",
                                    fields: [],
                                }),
                                new DamlLfTemplate({
                                    name: "Vault",
                                    parameterName: "this",
                                    templateId: new DamlLfTemplateId({
                                        packageId: "pkg-sample",
                                        moduleName: "Main",
                                        templateName: "Vault",
                                    }),
                                    fields: [],
                                    choices: [
                                        new DamlLfChoice({
                                            name: "Archive",
                                            selfBinderName: "self",
                                            parameter: new DamlLfChoiceParameter({
                                                name: "choiceArg",
                                                type: new DamlLfType({}),
                                            }),
                                            returnType: new DamlLfType({}),
                                            updateExpression: new DamlLfExpression({
                                                updateExpression: {
                                                    kind: "fetch",
                                                    templateId: {
                                                        packageId: "pkg-sample",
                                                        moduleName: "Main",
                                                        templateName: "Vault",
                                                    },
                                                    contractId: new DamlLfExpression({
                                                        variableName: "self",
                                                    }),
                                                },
                                            }),
                                        }),
                                    ],
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
                    ].filter((entry) =>
                        entry.entrypointKind !== "exercise"
                        || includeArchiveExecutable,
                    ),
                }),
            ),
        ],
    );
}
