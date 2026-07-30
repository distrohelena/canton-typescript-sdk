import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { GeneratedNamedTypeFile } from "../../../src/daml-interface/emission-model/generated-named-type-file.js";
import { GeneratedRegistryFile } from "../../../src/daml-interface/emission-model/generated-registry-file.js";
import { GeneratedSpecFile } from "../../../src/daml-interface/emission-model/generated-spec-file.js";
import { GeneratedSupportFile } from "../../../src/daml-interface/emission-model/generated-support-file.js";
import { GeneratedTemplateBinding } from "../../../src/daml-interface/emission-model/generated-template-binding.js";
import { GeneratedTemplateBindingFile } from "../../../src/daml-interface/emission-model/generated-template-binding-file.js";
import { DamlInterfaceWriter } from "../../../src/daml-interface/writing/daml-interface-writer.js";

describe("GeneratedDamlInterfaceProject", () => {
    it("pairs specs with all production artifact kinds", () => {
        const productionFiles = createProductionFiles();

        const specFiles = productionFiles.map((file) => new GeneratedSpecFile(
            file.path.replace(/\.ts$/, ".spec.ts"),
            'import "node:test";\n',
            file.path,
        ));

        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [productionFiles[0] as GeneratedTemplateBindingFile],
            namedTypeFiles: [productionFiles[1] as GeneratedNamedTypeFile],
            supportFiles: [
                productionFiles[2] as GeneratedSupportFile,
                productionFiles[3] as GeneratedSupportFile,
            ],
            registryFile: productionFiles[4] as GeneratedRegistryFile,
            indexFile: productionFiles[5] as GeneratedSupportFile,
            specFiles,
        });

        expect(project.productionFiles).toEqual(productionFiles);
        expect(project.specFiles).toEqual(specFiles);
        expect(project.specFiles).toHaveLength(project.productionFiles.length);
        expect(project.specFiles.map((file) => file.path)).toContain(
            "generated/packages/sample/main/iou.spec.ts",
        );
    });

    it("rejects malformed production and spec artifact pairings", () => {
        const templateFile = createProductionFiles()[0] as GeneratedTemplateBindingFile;

        expect(() => new GeneratedDamlInterfaceProject({
            templateFiles: [templateFile, templateFile],
        })).toThrow("Duplicate production file path");

        expect(() => new GeneratedDamlInterfaceProject({
            templateFiles: [templateFile],
            specFiles: [new GeneratedSpecFile(
                "generated/packages/sample/main/missing.spec.ts",
                "",
                "generated/packages/sample/main/missing.ts",
            )],
        })).toThrow("does not exist");

        expect(() => new GeneratedDamlInterfaceProject({
            templateFiles: [templateFile],
            specFiles: [new GeneratedSpecFile(
                "generated/packages/sample/main/not-iou.spec.ts",
                "",
                templateFile.path,
            )],
        })).toThrow("must be the sibling");

        expect(() => new GeneratedDamlInterfaceProject({
            templateFiles: [templateFile],
            specFiles: [
                new GeneratedSpecFile(
                    "generated/packages/sample/main/iou.spec.ts",
                    "",
                    templateFile.path,
                ),
                new GeneratedSpecFile(
                    "generated/packages/sample/main/iou.spec.ts",
                    "",
                    templateFile.path,
                ),
            ],
        })).toThrow("Duplicate generated spec file path");

        expect(() => new GeneratedDamlInterfaceProject({
            templateFiles: [new GeneratedTemplateBindingFile({
                path: "generated/packages/sample/main/iou.spec.ts",
                contents: "",
                binding: templateFile.binding,
            })],
        })).toThrow("must not end in .spec.ts");
    });

    it("defaults to no generated specs", () => {
        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [createProductionFiles()[0]],
        });

        expect(project.specFiles).toEqual([]);
    });
});

describe("DamlInterfaceWriter", () => {
    it("writes all production artifacts and their specs", async () => {
        const productionFiles = createProductionFiles();

        const project = new GeneratedDamlInterfaceProject({
            templateFiles: [productionFiles[0] as GeneratedTemplateBindingFile],
            namedTypeFiles: [productionFiles[1] as GeneratedNamedTypeFile],
            supportFiles: [
                productionFiles[2] as GeneratedSupportFile,
                productionFiles[3] as GeneratedSupportFile,
            ],
            registryFile: productionFiles[4] as GeneratedRegistryFile,
            indexFile: productionFiles[5] as GeneratedSupportFile,
            specFiles: productionFiles.map((file) => new GeneratedSpecFile(
                file.path.replace(/\.ts$/, ".spec.ts"),
                `import "node:test";\n// ${file.path}\n`,
                file.path,
            )),
        });

        const outputDirectory = await mkdtemp(join(tmpdir(), "daml-interface-writer-"));

        try {
            await new DamlInterfaceWriter().writeProjectAsync(project, outputDirectory);

            await expect(readFile(
                join(outputDirectory, "generated/packages/sample/main/iou.spec.ts"),
                "utf8",
            )).resolves.toContain("node:test");
            await expect(readFile(
                join(outputDirectory, "generated/packages/sample/main/types.spec.ts"),
                "utf8",
            )).resolves.toContain("types.ts");
            await expect(readFile(
                join(outputDirectory, "generated/support/runtime.spec.ts"),
                "utf8",
            )).resolves.toContain("runtime.ts");
            await expect(readFile(
                join(outputDirectory, "generated/packages/sample/main/index.spec.ts"),
                "utf8",
            )).resolves.toContain("packages/sample/main/index.ts");
            await expect(readFile(
                join(outputDirectory, "generated/registry.spec.ts"),
                "utf8",
            )).resolves.toContain("registry.ts");
            await expect(readFile(
                join(outputDirectory, "generated/index.spec.ts"),
                "utf8",
            )).resolves.toContain("index.ts");
        } finally {
            await rm(outputDirectory, { recursive: true, force: true });
        }
    });
});

function createProductionFiles(): readonly [
    GeneratedTemplateBindingFile,
    GeneratedNamedTypeFile,
    GeneratedSupportFile,
    GeneratedSupportFile,
    GeneratedRegistryFile,
    GeneratedSupportFile,
] {
    const templateFile = new GeneratedTemplateBindingFile({
        path: "generated/packages/sample/main/iou.ts",
        contents: "export class Iou {}\n",
        binding: new GeneratedTemplateBinding({
            className: "Iou",
            templateIdLiteral: "sample:Main:Iou",
            path: "generated/packages/sample/main/iou.ts",
            createFieldsTypeName: "IouCreateFields",
            createdEventTypeName: "IouCreatedEvent",
            createFields: [],
            choices: [],
        }),
    });

    return [
        templateFile,
        new GeneratedNamedTypeFile({
            path: "generated/packages/sample/main/types.ts",
            contents: "export interface IouData {}\n",
            packageId: "sample",
            moduleName: "Main",
            namespaceAlias: "SampleMain",
            exportedTypeNames: ["IouData"],
        }),
        new GeneratedSupportFile({
            path: "generated/support/runtime.ts",
            contents: "export const runtime = true;\n",
        }),
        new GeneratedSupportFile({
            path: "generated/packages/sample/main/index.ts",
            contents: "export {};\n",
        }),
        new GeneratedRegistryFile({
            path: "generated/registry.ts",
            contents: "export class Registry {}\n",
        }),
        new GeneratedSupportFile({
            path: "generated/index.ts",
            contents: "export {};\n",
        }),
    ];
}
