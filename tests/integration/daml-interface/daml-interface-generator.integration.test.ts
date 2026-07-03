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
        expect(project.templateFiles[0].path).toBe("generated/sample/module/iou.ts");
        expect(project.registryFile?.path).toBe("generated/registry.ts");
        expect(project.indexFile?.path).toBe("generated/index.ts");
    });
});
