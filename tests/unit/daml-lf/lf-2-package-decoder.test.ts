import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlLfPackageLoader } from "../../../src/daml-lf/daml-lf-package-loader.js";

describe("DamlLfPackageLoader", () => {
    it("loads an LF 2.x package from archive bytes", () => {
        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();
        const loader = new DamlLfPackageLoader();

        const result = loader.loadPackageOrThrow(archiveBytes);

        expect(result.languageVersion.major).toBe(2);
        expect(result.languageVersion.minor).toBe("1");
        expect(result.rawPackage.modules).toHaveLength(1);
        expect(result.rawPackage.metadata?.nameInternedStr).toBe(0);
    });
});
