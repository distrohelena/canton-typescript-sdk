import { describe, expect, it } from "vitest";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { TypeConReference } from "../../../src/daml-lf/model/type-con-reference.js";
import { DamlInterfaceAnalysisResult } from "../../../src/daml-interface/analysis/daml-interface-analyzer.js";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { GeneratedNamedTypeFile } from "../../../src/daml-interface/emission-model/generated-named-type-file.js";
import { GeneratedTemplateBinding } from "../../../src/daml-interface/emission-model/generated-template-binding.js";
import { GeneratedTemplateBindingFile } from "../../../src/daml-interface/emission-model/generated-template-binding-file.js";
import { SupportFileEmitter } from "../../../src/daml-interface/emission/support-file-emitter.js";

describe("SupportFileEmitter", () => {
    it("namespaces template modules so same Foo interface and class do not collide", () => {
        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [
                createTemplateFile({
                    packageId: "package-one",
                    namespaceAlias: "PackageOneMain",
                    contents: "export interface Foo {}\n",
                }),
                createTemplateFile({
                    packageId: "package-two",
                    namespaceAlias: "PackageTwoMain",
                    contents: "export class Foo {}\n",
                }),
            ],
        });

        const emitter = new SupportFileEmitter();

        const namespaceFiles = emitter.emitNamespaceFiles(project);

        const index = emitter.emitIndexFile(project);

        expect(namespaceFiles.map((file) => file.path)).toEqual([
            "generated/packages/package-one/main/index.ts",
            "generated/packages/package-two/main/index.ts",
        ]);
        expect(index.contents).toContain(
            'export * as PackageOneMain from "./packages/package-one/main/index.js";',
        );
        expect(index.contents).toContain(
            'export * as PackageTwoMain from "./packages/package-two/main/index.js";',
        );
        expect(index.contents).not.toContain('export * from "./packages/');
    });

    it("rejects colliding exported symbols from templates in the same module", () => {
        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [
                createTemplateFile({
                    packageId: "sample-hash",
                    namespaceAlias: "SampleHashMain",
                    className: "Foo",
                    templateName: "Foo",
                    contents: "export class Foo {}\n",
                }),
                createTemplateFile({
                    packageId: "sample-hash",
                    namespaceAlias: "SampleHashMain",
                    className: "FooCreateFields",
                    templateName: "FooCreateFields",
                    contents: "export class FooCreateFields {}\n",
                }),
            ],
        });

        expect(() => new SupportFileEmitter().emitNamespaceFiles(project))
            .toThrow(/FooCreateFields.*sample-hash:Main:Foo/);
    });

    it("rejects a remaining cross-kind collision between a named type and template export", () => {
        const templateFile = createTemplateFile({
            packageId: "sample-hash",
            namespaceAlias: "SampleHashMain",
            className: "Node",
            templateName: "Node",
            contents: "export class Node {}\n",
        });

        const namedTypeFile = new GeneratedNamedTypeFile({
            path: "generated/packages/sample-hash/main/types.ts",
            contents: "export interface Node {}\n",
            packageId: "sample-hash",
            moduleName: "Main",
            namespaceAlias: "SampleHashMain",
            exportedTypeNames: ["Node"],
        });

        expect(() => new SupportFileEmitter().emitNamespaceFiles(
            new GeneratedDamlInterfaceProject({
                templateFiles: [templateFile],
                namedTypeFiles: [namedTypeFile],
            }),
        )).toThrow(/Node.*sample-hash:Main:Node.*types\.ts/);
    });

    it("deep freezes generated descriptor graphs", async () => {
        const identity = new TypeConReference({
            packageId: "sample-hash",
            moduleName: "Main",
            name: "Node",
        });

        const analysis = new DamlInterfaceAnalysisResult({
            templates: [],
            typeDefinitions: [{
                identity,
                kind: "record",
                fields: [{
                    damlLabel: "next",
                    propertyName: "next",
                    type: {
                        kind: "optional",
                        element: { kind: "namedReference", identity },
                    },
                }, {
                    damlLabel: "label",
                    propertyName: "label",
                    type: { kind: "primitive", builtinType: DamlLfBuiltinType.text },
                }],
            }],
        });

        const descriptors = new SupportFileEmitter().emitSupportFiles(analysis)
            .find((file) => file.path === "generated/support/descriptors.ts");

        const module = await import(`data:text/javascript;base64,${Buffer.from(
            transpileModule(descriptors!.contents, {
                compilerOptions: {
                    module: ModuleKind.ESNext,
                    target: ScriptTarget.ES2022,
                },
            }).outputText,
        ).toString("base64")}`) as {
            generatedDamlTypeDescriptorRegistry: {
                resolve(identity: { packageId: string; moduleName: string; entityName: string }): (() => unknown) | undefined;
            };
        };

        const descriptor = module.generatedDamlTypeDescriptorRegistry.resolve({
            packageId: "sample-hash",
            moduleName: "Main",
            entityName: "Node",
        })!() as {
            fields: Array<{
                type: { element: { identity: { packageId: string } } };
            }>;
        };

        expect(Object.isFrozen(descriptor)).toBe(true);
        expect(Object.isFrozen(descriptor.fields)).toBe(true);
        expect(Object.isFrozen(descriptor.fields[0])).toBe(true);
        expect(Object.isFrozen(descriptor.fields[0].type)).toBe(true);
        expect(Object.isFrozen(descriptor.fields[0].type.element.identity)).toBe(true);
        expect(() => descriptor.fields.push(descriptor.fields[0])).toThrow(TypeError);
        expect(() => {
            descriptor.fields[0].type.element.identity.packageId = "mutated";
        }).toThrow(TypeError);
    });
});

function createTemplateFile(init: {
    packageId: string;
    namespaceAlias: string;
    className?: string;
    templateName?: string;
    contents: string;
}): GeneratedTemplateBindingFile {
    const templateName = init.templateName ?? "Foo";

    const path = `generated/packages/${init.packageId}/main/${templateName.toLowerCase()}.ts`;

    const className = init.className ?? "Foo";

    return new GeneratedTemplateBindingFile({
        path,
        contents: init.contents,
        binding: new GeneratedTemplateBinding({
            namespaceAlias: init.namespaceAlias,
            className,
            templateIdentityKey: `${init.packageId}\u0000Main\u0000${templateName}`,
            templateIdLiteral: `${init.packageId}:Main:${templateName}`,
            path,
            createFieldsTypeName: `${className}CreateFields`,
            createdEventTypeName: `${className}CreatedEvent`,
            createFields: [],
            choices: [],
        }),
    });
}
