import { describe, expect, it } from "vitest";
import { getLiveSeededContextAsync } from "../runtime/live-seeded-context.js";

describe("live seeded context", () => {
    it("creates and caches the shared live seeded context", async () => {
        const firstContext = await getLiveSeededContextAsync();

        const secondContext = await getLiveSeededContextAsync();

        expect(firstContext).toBe(secondContext);
        expect(firstContext.jsonAllocatedParty).toMatchObject({
            identifier: expect.stringContaining("sdk-live-party-"),
        });
        expect(firstContext.uploadedDarBytes.length).toBeGreaterThan(0);
        expect(firstContext.mainPackageId).toBeTruthy();
        expect(firstContext.packageIds.length).toBeGreaterThan(0);
    });
});
