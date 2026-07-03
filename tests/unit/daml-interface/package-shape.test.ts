import { describe, expect, it } from "vitest";

describe("DAML interface package surface", () => {
    it("exports the daml interface generator subpath types", async () => {
        const module = await import("../../../src/daml-interface/index.js");

        expect(module.DamlInterfaceGenerator).toBeTypeOf("function");
        expect(module.DamlInterfaceGeneratorOptions).toBeTypeOf("function");
        expect(module.DamlInterfaceWriter).toBeTypeOf("function");
        expect(module.DamlInterfaceGenerationException).toBeTypeOf("function");
    });

    it(
        "does not export daml interface generator types from the root package",
        async () => {
            const rootModule = await import("../../../src/index.js");

            expect(rootModule).not.toHaveProperty("DamlInterfaceGenerator");
            expect(rootModule).not.toHaveProperty("DamlInterfaceWriter");
        },
        15000,
    );
});
