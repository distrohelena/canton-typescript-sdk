import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfDataType } from "../../../src/daml-lf/model/daml-lf-data-type.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfTemplate } from "../../../src/daml-lf/model/daml-lf-template.js";
import { DamlLfTemplateId } from "../../../src/daml-lf/model/daml-lf-template-id.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";
import { ModuleReference } from "../../../src/daml-lf/model/module-reference.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { DamlLfResolutionException } from "../../../src/daml-lf/errors/daml-lf-resolution.exception.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";

describe("DamlLfCompilation", () => {
    it("resolves modules and referenced types across packages", () => {
        const dependencyReference = new TypeConReference({
            packageId: "dependency-hash",
            moduleName: "Dependency.Module",
            name: "DependencyRecord",
        });

        const dependencyPackage = new DamlLfPackage({
            packageId: "dependency-hash",
            packageName: "dependency-package",
            packageVersion: "1.0.0",
            languageVersion: {
                major: 2,
                minor: "1",
                patch: 0,
                toString: () => "2.1",
            },
            modules: [
                new DamlLfModule({
                    name: "Dependency.Module",
                    definitions: [
                        new DamlLfDataType({
                            name: "DependencyRecord",
                            fields: [
                                new DamlLfField({
                                    name: "value",
                                    type: new DamlLfType({
                                        builtinType: DamlLfBuiltinType.text,
                                    }),
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });

        const consumerPackage = new DamlLfPackage({
            packageId: "consumer-hash",
            packageName: "consumer-package",
            packageVersion: "1.0.0",
            languageVersion: {
                major: 2,
                minor: "1",
                patch: 0,
                toString: () => "2.1",
            },
            modules: [
                new DamlLfModule({
                    name: "Consumer.Module",
                    definitions: [
                        new DamlLfValueDefinition({
                            name: "usesDependency",
                            type: new DamlLfType({
                                typeConReference: dependencyReference,
                            }),
                            expression: new DamlLfExpression({}),
                        }),
                    ],
                }),
            ],
        });

        const workspace = new DamlLfWorkspace([
            dependencyPackage,
            consumerPackage,
        ]);

        const compilation = DamlLfCompilation.createOrThrow(workspace);

        const moduleSymbol = compilation.getModuleSymbolOrThrow(
            new ModuleReference({
                packageId: "dependency-hash",
                moduleName: "Dependency.Module",
            }),
        );

        const typeSymbol = compilation.getTypeSymbolOrThrow(dependencyReference);

        expect(moduleSymbol.name).toBe("Dependency.Module");
        expect(typeSymbol.definition.name).toBe("DependencyRecord");
    });

    it("rejects unresolved type references during compilation", () => {
        const brokenPackage = new DamlLfPackage({
            packageId: "broken-hash",
            packageName: "broken-package",
            packageVersion: "1.0.0",
            languageVersion: {
                major: 2,
                minor: "1",
                patch: 0,
                toString: () => "2.1",
            },
            modules: [
                new DamlLfModule({
                    name: "Broken.Module",
                    definitions: [
                        new DamlLfValueDefinition({
                            name: "brokenValue",
                            type: new DamlLfType({
                                typeConReference: new TypeConReference({
                                    packageId: "missing-hash",
                                    moduleName: "Missing.Module",
                                    name: "MissingType",
                                }),
                            }),
                            expression: new DamlLfExpression({}),
                        }),
                    ],
                }),
            ],
        });

        const workspace = new DamlLfWorkspace([brokenPackage]);

        expect(() => DamlLfCompilation.createOrThrow(workspace)).toThrow(
            DamlLfResolutionException,
        );
    });

    it("indexes an unused data type with a missing external direct reference for template generation", () => {
        const packageId = "consumer-hash";

        const moduleName = "Consumer.Module";

        const typeName = "UnusedExternalReference";

        const workspace = createWorkspaceWithUnusedDefinition(
            new DamlLfDataType({
                name: typeName,
                fields: [
                    new DamlLfField({
                        name: "missing",
                        type: createMissingExternalType(),
                    }),
                ],
            }),
        );

        expect(() => DamlLfCompilation.createOrThrow(workspace)).toThrow(
            DamlLfResolutionException,
        );

        const compilation = DamlLfCompilation.createForTemplateGeneration(
            workspace,
        );

        expect(compilation.getTypeSymbolOrThrow(new TypeConReference({
            packageId,
            moduleName,
            name: typeName,
        })).definition.name).toBe(typeName);
    });

    it("indexes an unused value definition with a missing external direct reference for template generation", () => {
        const workspace = createWorkspaceWithUnusedDefinition(
            new DamlLfValueDefinition({
                name: "unusedExternalReference",
                type: createMissingExternalType(),
                expression: new DamlLfExpression({}),
            }),
        );

        expect(() => DamlLfCompilation.createOrThrow(workspace)).toThrow(
            DamlLfResolutionException,
        );

        const compilation = DamlLfCompilation.createForTemplateGeneration(
            workspace,
        );

        expect(compilation.getValueDefinitionOrThrow(
            "consumer-hash",
            "Consumer.Module",
            "unusedExternalReference",
        ).name).toBe("unusedExternalReference");
    });

    it("keeps an unresolved ContractId target opaque during compilation", () => {
        expect(() => DamlLfCompilation.createOrThrow(
            createContractIdTemplateWorkspace([
                new DamlLfType({
                    typeConReference: new TypeConReference({
                        packageId: "missing-hash",
                        moduleName: "Holding",
                        name: "Holding",
                    }),
                }),
            ]),
        )).not.toThrow();
    });

    it.each([
        { argumentCount: 0, typeArguments: [] },
        {
            argumentCount: 2,
            typeArguments: [
                new DamlLfType({
                    typeConReference: new TypeConReference({
                        packageId: "missing-hash",
                        moduleName: "Holding",
                        name: "Holding",
                    }),
                }),
                new DamlLfType({ builtinType: DamlLfBuiltinType.text }),
            ],
        },
    ])("rejects ContractId with $argumentCount type arguments", ({ typeArguments }) => {
        expect(() => DamlLfCompilation.createOrThrow(
            createContractIdTemplateWorkspace(typeArguments),
        )).toThrow(/builtin 'contractId' requires 1 type argument/);
    });
});

function createContractIdTemplateWorkspace(
    typeArguments: readonly DamlLfType[],
): DamlLfWorkspace {
    const packageId = "consumer-hash";

    const moduleName = "Consumer.Module";

    const templateName = "Consumer";

    const fields = [
        new DamlLfField({
            name: "holding",
            type: new DamlLfType({
                builtinType: DamlLfBuiltinType.contractId,
                typeArguments,
            }),
        }),
    ];

    return new DamlLfWorkspace([
        new DamlLfPackage({
            packageId,
            packageName: "consumer-package",
            packageVersion: "1.0.0",
            languageVersion: {
                major: 2,
                minor: "1",
                patch: 0,
                toString: () => "2.1",
            },
            modules: [
                new DamlLfModule({
                    name: moduleName,
                    definitions: [
                        new DamlLfDataType({ name: templateName, fields }),
                        new DamlLfTemplate({
                            templateId: new DamlLfTemplateId({
                                packageId,
                                moduleName,
                                templateName,
                            }),
                            name: templateName,
                            parameterName: "self",
                            fields,
                            choices: [],
                        }),
                    ],
                }),
            ],
        }),
    ]);
}

function createWorkspaceWithUnusedDefinition(
    definition: DamlLfDataType | DamlLfValueDefinition,
): DamlLfWorkspace {
    return new DamlLfWorkspace([
        new DamlLfPackage({
            packageId: "consumer-hash",
            packageName: "consumer-package",
            packageVersion: "1.0.0",
            languageVersion: {
                major: 2,
                minor: "1",
                patch: 0,
                toString: () => "2.1",
            },
            modules: [
                new DamlLfModule({
                    name: "Consumer.Module",
                    definitions: [definition],
                }),
            ],
        }),
    ]);
}

function createMissingExternalType(): DamlLfType {
    return new DamlLfType({
        typeConReference: new TypeConReference({
            packageId: "missing-hash",
            moduleName: "Missing.Module",
            name: "MissingType",
        }),
    });
}
