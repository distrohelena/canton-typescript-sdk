import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";

describe("DamlInterfaceGenerator", () => {
    it("builds a generated project from dalf archive bytes", async () => {
        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();

        const generator = new DamlInterfaceGenerator();

        const project = await generator.generateFromDalfOrThrowAsync(
            archiveBytes,
        );

        expect(project.templateFiles).toHaveLength(1);
        expect(project.templateFiles[0].path).toBe(
            "generated/packages/sample-package_1.0.0/sample/module/iou.ts",
        );
        expect(project.registryFile?.path).toBe("generated/registry.ts");
        expect(project.indexFile?.path).toBe("generated/index.ts");
    });

    it("generates one Dalf with an absent ContractId target as string-shaped bindings", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createOpaqueContractIdLf2ArchiveBytes(),
        );

        expect(project.templateFiles).toHaveLength(1);

        const contents = project.templateFiles[0]!.contents;

        expect(contents).toContain("readonly holding: string;");
        expect(contents).toContain("public readonly argument: string;");
        expect(contents).toContain("public readonly result: string;");
        expect(contents.match(/\{ kind: \"contractId\" \}/g)).toHaveLength(3);
        expect(contents).not.toContain("contract:");
        expect(contents).not.toContain("Splice.Api.Token.HoldingV1");
        expect(contents).not.toContain("missing");
    });

    it("generates a Dalf while skipping unused unresolved external references", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createUnusedExternalReferencesLf2ArchiveBytes(),
        );

        expect(project.templateFiles.map((file) => file.path)).toEqual([
            "generated/packages/sample-package_1.0.0/sample/lazy/iou.ts",
        ]);
        expectProjectToExcludeExternalHolding(project);
    });

    it("generates every template from a multi-entry DAR while skipping unused unresolved external references", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDarOrThrowAsync(
            SampleLfPackageFixture.createTemplateGenerationDarBytes(
                SampleLfPackageFixture.createUnusedExternalReferencesLf2ArchiveBytes(),
            ),
        );

        expect(project.templateFiles.map((file) => file.path)).toEqual([
            "generated/packages/sample-package_1.0.0/sample/lazy/iou.ts",
            "generated/packages/second-package_1.0.0/sample/second/note.ts",
        ]);
        expectProjectToExcludeExternalHolding(project);
    });

    it("rejects a Dalf when a template field reaches an unresolved external named type", async () => {
        await expect(new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createExternalReferenceInTemplateFieldLf2ArchiveBytes(),
        )).rejects.toThrow(
            "missing-package-id:Splice.Api.Token.HoldingV1:Holding",
        );
    });

    it("rejects a DAR when a template choice reaches an unresolved external named type", async () => {
        await expect(new DamlInterfaceGenerator().generateFromDarOrThrowAsync(
            SampleLfPackageFixture.createTemplateGenerationDarBytes(
                SampleLfPackageFixture.createExternalReferenceInTemplateChoiceLf2ArchiveBytes(),
            ),
        )).rejects.toThrow(
            "missing-package-id:Splice.Api.Token.HoldingV1:Holding",
        );
    });
});

function expectProjectToExcludeExternalHolding(project: {
    readonly templateFiles: readonly { readonly contents: string }[];
    readonly namedTypeFiles: readonly { readonly contents: string }[];
    readonly supportFiles: readonly { readonly contents: string }[];
    readonly registryFile?: { readonly contents: string };
    readonly indexFile?: { readonly contents: string };
}): void {
    for (const file of [
        ...project.templateFiles,
        ...project.namedTypeFiles,
        ...project.supportFiles,
        project.registryFile,
        project.indexFile,
    ]) {
        expect(file?.contents).not.toContain("missing-package-id");
        expect(file?.contents).not.toContain("Splice.Api.Token.HoldingV1");
        expect(file?.contents).not.toContain("Holding");
    }
}
