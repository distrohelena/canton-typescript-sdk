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
            "generated/packages/sample-hash/sample/module/iou.ts",
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
});
