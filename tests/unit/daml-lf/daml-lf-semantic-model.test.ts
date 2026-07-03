import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfDataType } from "../../../src/daml-lf/model/daml-lf-data-type.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfField } from "../../../src/daml-lf/model/daml-lf-field.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";

describe("DamlLfSemanticModel", () => {
    it("returns record fields for a resolved type reference", () => {
        const recordReference = new TypeConReference({
            packageId: "dependency-hash",
            moduleName: "Dependency.Module",
            name: "DependencyRecord",
        });

        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
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
                                            name: "owner",
                                            type: new DamlLfType({
                                                builtinType:
                                                    DamlLfBuiltinType.text,
                                            }),
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ],
                }),
            ]),
        );

        const semanticModel = compilation.createSemanticModel();

        expect(
            semanticModel
                .getRecordFieldsOrThrow(recordReference)
                .map((field) => field.name),
        ).toEqual(["owner"]);
    });
});
