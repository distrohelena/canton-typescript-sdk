import { describe, expect, it } from "vitest";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
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
});

function createTemplateFile(init: {
    packageId: string;
    namespaceAlias: string;
    contents: string;
}): GeneratedTemplateBindingFile {
    const path = `generated/packages/${init.packageId}/main/foo.ts`;

    return new GeneratedTemplateBindingFile({
        path,
        contents: init.contents,
        binding: new GeneratedTemplateBinding({
            namespaceAlias: init.namespaceAlias,
            className: "Foo",
            templateIdLiteral: `${init.packageId}:Main:Foo`,
            path,
            createFieldsTypeName: "FooCreateFields",
            createdEventTypeName: "FooCreatedEvent",
            createFields: [],
            choices: [],
        }),
    });
}
