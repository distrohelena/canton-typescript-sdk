import { describe, expect, it } from "vitest";

describe("DAML-LF package surface", () => {
    it("exports the daml lf parser subpath types", async () => {
        const damlLfModule = await import("../../../src/daml-lf/index.js");

        expect(damlLfModule.DarArchiveLoader).toBeTypeOf("function");
        expect(damlLfModule.DamlLfPackageLoader).toBeTypeOf("function");
        expect(damlLfModule.DamlLfDecodeException).toBeTypeOf("function");
    });

    it("does not export daml lf parser types from the root package", async () => {
        const rootModule = await import("../../../src/index.js");

        expect(rootModule).not.toHaveProperty("DarArchiveLoader");
        expect(rootModule).not.toHaveProperty("DamlLfPackageLoader");
    });
});
