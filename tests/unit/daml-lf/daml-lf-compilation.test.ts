import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfDataType } from "../../../src/daml-lf/model/daml-lf-data-type.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
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
});
