import { describe, expect, it } from "vitest";
import { DamlLfCompilation } from "../../../src/daml-lf/daml-lf-compilation.js";
import { DamlLfInterpreterScaffold } from "../../../src/daml-lf/interpreter/daml-lf-interpreter-scaffold.js";
import { DamlLfWorkspace } from "../../../src/daml-lf/daml-lf-workspace.js";
import { DamlLfExpression } from "../../../src/daml-lf/model/daml-lf-expression.js";
import { DamlLfModule } from "../../../src/daml-lf/model/daml-lf-module.js";
import { DamlLfPackage } from "../../../src/daml-lf/model/daml-lf-package.js";
import { DamlLfType } from "../../../src/daml-lf/model/daml-lf-type.js";
import { DamlLfValueDefinition } from "../../../src/daml-lf/model/daml-lf-value-definition.js";

describe("DamlLfInterpreterScaffold", () => {
    it("exposes the compilation and builtin dispatch contracts", () => {
        const compilation = DamlLfCompilation.createOrThrow(
            new DamlLfWorkspace([
                new DamlLfPackage({
                    packageId: "sample-hash",
                    packageName: "sample-package",
                    packageVersion: "1.0.0",
                    languageVersion: {
                        major: 2,
                        minor: "1",
                        patch: 0,
                        toString: () => "2.1",
                    },
                    modules: [
                        new DamlLfModule({
                            name: "Sample.Module",
                            definitions: [
                                new DamlLfValueDefinition({
                                    name: "value",
                                    type: new DamlLfType({}),
                                    expression: new DamlLfExpression({}),
                                }),
                            ],
                        }),
                    ],
                }),
            ]),
        );

        const scaffold = new DamlLfInterpreterScaffold(compilation);

        expect(scaffold.getCompilation()).toBe(compilation);
        expect(scaffold.getBuiltinDispatch()).toBeDefined();
    });
});
