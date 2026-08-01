import { describe, expect, it } from "vitest";
import {
    EXAMPLE_DAR_SHA256,
    loadExampleApplicationFixtureAsync,
} from "../../../examples/shared/application-fixture.js";

describe("loadExampleApplicationFixtureAsync", () => {
    it("loads the pinned Canton Explorer Debug Playground application", async () => {
        const fixture = await loadExampleApplicationFixtureAsync();

        expect(EXAMPLE_DAR_SHA256).toBe(
            "307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29",
        );
        expect(fixture.mainPackageId).toBe(
            "4c71b7db4631a5573c96bba609474b2b3e544c2aae7851124403c8ae5169a687",
        );
        expect(fixture.templateId).toEqual({
            packageId: fixture.mainPackageId,
            moduleName: "DebugPlayground",
            entityName: "Message",
        });
        expect(fixture.packageIds).toContain(fixture.mainPackageId);
    });
});
