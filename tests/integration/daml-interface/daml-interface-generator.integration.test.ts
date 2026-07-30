import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { DamlInterfaceCli } from "../../../src/daml-interface/cli/daml-interface-cli.js";

const VAULT_BASE_DAR = process.env.DAML_INTERFACE_VAULT_BASE_DAR;

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
    it("generates recursive generic records and variants reached by a template", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createGenericRecursiveLf2ArchiveBytes(),
        );

        expect(project.templateFiles).toHaveLength(1);

        const namedTypes = project.namedTypeFiles[0]?.contents;

        const template = project.templateFiles[0]?.contents;

        const descriptors = project.supportFiles.find(
            (file) => file.path === "generated/support/descriptors.ts",
        )?.contents;

        expect(namedTypes).toContain("export interface Node<A>");
        expect(namedTypes).toContain("readonly next: Node<A> | undefined;");
        expect(namedTypes).toContain("export interface Left<A>");
        expect(namedTypes).toContain("readonly right: Right<A> | undefined;");
        expect(namedTypes).toContain("export type GenericVariant<A> =");
        expect(template).toContain("readonly textNode: Node<string>;");
        expect(template).toContain("readonly intNode: Node<bigint>;");
        expect(descriptors).toContain('entityName: "Node" }, typeArguments: [typeArguments[0]!]');
        expect(descriptors).toContain('entityName: "Right" }, typeArguments: [typeArguments[0]!]');
    });

    it.skipIf(VAULT_BASE_DAR === undefined)(
        "generates configured Vault Base SplitUnderlying with its concrete Tuple2 result application",
        async () => {
            if (VAULT_BASE_DAR === undefined) {
                throw new Error("DAML_INTERFACE_VAULT_BASE_DAR must be set to run this external integration test");
            } else if (!existsSync(VAULT_BASE_DAR)) {
                throw new Error(`DAML_INTERFACE_VAULT_BASE_DAR does not exist: ${VAULT_BASE_DAR}`);
            }

            const outputDirectory = await mkdtemp(join(tmpdir(), "vault-base-generated-"));

            try {
                const exitCode = await new DamlInterfaceCli().runAsync([
                    "--input", VAULT_BASE_DAR,
                    "--output", outputDirectory,
                ]);

                const binding = await readFile(join(
                    outputDirectory,
                    "generated/packages/vault-base_0.0.1/oz/vault/base/test-token/cip112/test-underlying-holding.ts",
                ), "utf8");

                expect(exitCode).toBe(0);
                expect(binding).toContain("export class TestUnderlyingHoldingSplitUnderlyingExercisedEvent");
                expect(binding).toContain("public readonly result: Tuple2<string, string>;");
                expect(binding).toContain("DamlValueMaterializer.materialize<Tuple2<string, string>>");
            } finally {
                await rm(outputDirectory, { recursive: true, force: true });
            }
        },
    );
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
