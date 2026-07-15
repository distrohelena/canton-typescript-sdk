import { describe, expect, test } from "vitest";

describe("public testing API", () => {
    test("exports an invariant campaign factory", async () => {
        const modulePath = "../../../src/testing/index.js";

        const testing = await import(modulePath);

        expect(testing.defineInvariantCampaign).toBeTypeOf("function");
    });
});
