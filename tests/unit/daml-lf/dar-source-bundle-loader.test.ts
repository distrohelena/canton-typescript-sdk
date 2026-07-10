import { describe, expect, it } from "vitest";
import { createSourceMappedDarFixture } from "../../fixtures/daml-lf/source-mapped-dar-fixture.js";
import { DarSourceBundleLoader } from "../../../src/daml-lf/index.js";

describe("DarSourceBundleLoader", () => {
    it("extracts source files and source-map metadata from a source-mapped dar", async () => {
        const bundle = await new DarSourceBundleLoader().loadSourceBundleOrThrowAsync(
            createSourceMappedDarFixture(),
        );

        expect(bundle.sourceFiles.map((file) => file.path)).toContain(
            "src/Main.daml",
        );
        expect(bundle.metadata.executables.length).toBeGreaterThan(0);
    });
});
