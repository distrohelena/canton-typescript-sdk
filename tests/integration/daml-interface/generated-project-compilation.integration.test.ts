import { describe, expect, it } from "vitest";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { generateTemporaryProjectAsync } from "./generated-project-test-helper.js";

describe("generated DAML project NodeNext compilation", () => {
    it("typechecks collision-safe root namespaces against the linked SDK package", async () => {
        const archiveBytes = SampleLfPackageFixture.createCollisionLf2ArchiveBytes();

        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            archiveBytes,
        );

        {
            const [first, second] = project.templateFiles;

            const consumerSource = [
                `import { ${first!.binding.namespaceAlias}, ${second!.binding.namespaceAlias} } from "./generated/index.js";`,
                "",
                `const first = ${first!.binding.namespaceAlias}.${first!.binding.className}.fromCreatedEvent({`,
                "    contractId: \"#first\",",
                "    templateId: { packageId: \"sample-hash\", moduleName: \"Sample.First\", entityName: \"Iou\" },",
                "    payload: { get: \"first\", contractId: \"first-id\", constructor: \"first-constructor\" },",
                "});",
                `const second = ${second!.binding.namespaceAlias}.${second!.binding.className}.fromCreatedEvent({`,
                "    contractId: \"#second\",",
                "    templateId: { packageId: \"sample-hash\", moduleName: \"Sample.Second\", entityName: \"Iou\" },",
                "    payload: { get: \"second\", contractId: \"second-id\", constructor: \"second-constructor\" },",
                "});",
                "void first.get;",
                "void second.get;",
                "void first.contractId;",
                "void second.contractId;",
                "",
            ].join("\n");

            const compiledProject = await generateTemporaryProjectAsync(
                archiveBytes,
                consumerSource,
            );

            try {
                expect(compiledProject.project.indexFile?.contents).toContain(
                    `export * as ${first!.binding.namespaceAlias}`,
                );

                const emittedSource = compiledProject.project.templateFiles
                    .map((file) => file.contents)
                    .join("\n");

                expect(emittedSource).toContain("readonly get: string;");
                expect(emittedSource).not.toMatch(/readonly (contractId|constructor):/);
                expect(compiledProject.executedSpecPaths).toEqual(
                    compiledProject.project.specFiles.map((file) =>
                        `${compiledProject.directory}/dist/${file.path.replace(/\.ts$/, ".js")}`,
                    ).sort(),
                );
            } finally {
                await compiledProject.disposeAsync();
            }
        }
    });
});
