import { describe, expect, it } from "vitest";
import { SampleLfPackageFixture } from "../../fixtures/daml-lf/sample-lf-package-fixture.js";
import { DamlLfPackageLoader } from "../../../src/daml-lf/daml-lf-package-loader.js";
import { DamlLfBuiltinType } from "../../../src/daml-lf/model/daml-lf-builtin-type.js";
import { DamlLfNodeKind } from "../../../src/daml-lf/model/daml-lf-node-kind.js";

describe("LF 2.x model mapper", () => {
    it("maps a decoded LF package into the public immutable model", () => {
        const archiveBytes = SampleLfPackageFixture.createLf2ArchiveBytes();
        const loader = new DamlLfPackageLoader();

        const packageModel = loader.loadPackageOrThrow(archiveBytes);

        expect(DamlLfNodeKind.package).toBe("package");
        expect(DamlLfBuiltinType.text).toBe("text");
        expect(packageModel.packageName).toBe("sample-package");
        expect(packageModel.packageVersion).toBe("1.0.0");
        expect(packageModel.modules).toHaveLength(1);
        expect(packageModel.modules[0].name).toBe("Sample.Module");
        expect(packageModel.modules[0].definitions).toHaveLength(1);
        expect(packageModel.modules[0].definitions[0].name).toBe("greeting");
    });
});
