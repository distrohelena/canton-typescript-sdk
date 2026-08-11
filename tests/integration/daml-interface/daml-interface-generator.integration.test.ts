import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlInterfaceGenerator } from "../../../src/daml-interface/daml-interface-generator.js";
import { DamlInterfaceGeneratorOptions } from "../../../src/daml-interface/daml-interface-generator-options.js";
import { GeneratedDamlInterfaceProject } from "../../../src/daml-interface/emission-model/generated-daml-interface-project.js";
import { ProjectEmitter } from "../../../src/daml-interface/emission/project-emitter.js";
import { generateTemporaryProjectFromDarAsync } from "./generated-project-test-helper.js";

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
        expect(project.specFiles).toHaveLength(project.productionFiles.length);
        expect(project.specFiles.map((file) => file.path)).toEqual(
            project.productionFiles.map((file) => file.path.replace(/\.ts$/, ".spec.ts")),
        );
    });

    it("passes the selected import style to ProjectEmitter for Dalf and DAR generation", async () => {
        const project = new GeneratedDamlInterfaceProject({ templateFiles: [] });

        const emitProject = vi.fn(() => project);

        const projectEmitter = { emitProject } as unknown as ProjectEmitter;

        const generator = new DamlInterfaceGenerator(
            new DamlInterfaceGeneratorOptions({ moduleImportStyle: "ts-node" }),
            undefined,
            projectEmitter,
        );

        await generator.generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createLf2ArchiveBytes(),
        );
        await generator.generateFromDarOrThrowAsync(
            SampleLfPackageFixture.createTemplateGenerationDarBytes(
                SampleLfPackageFixture.createLf2ArchiveBytes(),
            ),
        );

        expect(emitProject).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            "ts-node",
        );
        expect(emitProject).toHaveBeenNthCalledWith(
            2,
            expect.anything(),
            "ts-node",
        );
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

    it("emits a local named type even when no template reaches it", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createUnusedLocalTypeLf2ArchiveBytes(),
        );

        expect(project.namedTypeFiles).toHaveLength(1);
        expect(project.namedTypeFiles[0]?.contents).toContain(
            "export interface UnusedExternalType",
        );
    });

    it("ignores non-serializable internal data types", async () => {
        const project = await new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createLf2ArchiveBytes({
                includeNonSerializableNatSyn: true,
            }),
        );

        expect(project.namedTypeFiles.map((file) => file.contents)).not.toContain(
            expect.stringContaining("NatSyn"),
        );
    });

    it("rejects a Dalf when an unused named type reaches an unresolved external type", async () => {
        await expect(new DamlInterfaceGenerator().generateFromDalfOrThrowAsync(
            SampleLfPackageFixture.createUnusedExternalReferencesLf2ArchiveBytes(),
        )).rejects.toThrow(
            "missing-package-id:Splice.Api.Token.HoldingV1:Holding",
        );
    });

    it("rejects a DAR when an unused named type reaches an unresolved external type", async () => {
        await expect(new DamlInterfaceGenerator().generateFromDarOrThrowAsync(
            SampleLfPackageFixture.createTemplateGenerationDarBytes(
                SampleLfPackageFixture.createUnusedExternalReferencesLf2ArchiveBytes(),
            ),
        )).rejects.toThrow(
            "missing-package-id:Splice.Api.Token.HoldingV1:Holding",
        );
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

            const temporaryProject = await generateTemporaryProjectFromDarAsync(VAULT_BASE_DAR);

            try {
                const binding = await readFile(`${temporaryProject.directory}/generated/packages/vault-base_0.0.1/oz/vault/base/test-token/cip112/test-underlying-holding.ts`, "utf8");

                expect(temporaryProject.project.specFiles).toHaveLength(
                    temporaryProject.project.productionFiles.length,
                );
                expect(temporaryProject.executedSpecPaths).toHaveLength(
                    temporaryProject.project.specFiles.length,
                );
                expect(binding).toContain("export class TestUnderlyingHoldingSplitUnderlyingExercisedEvent");
                expect(binding).toContain("public readonly result: Tuple2<string, string>;");
                expect(binding).toContain("DamlValueMaterializer.materialize<Tuple2<string, string>>");
            } finally {
                await temporaryProject.disposeAsync();
            }
        },
    );
});
