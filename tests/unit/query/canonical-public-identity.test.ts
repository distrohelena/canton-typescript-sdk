import { describe, expect, it } from "vitest";
import { canonicalPublicNumericIdentity } from "../../../src/query/canonical/public-identity.js";

describe("canonicalPublicNumericIdentity", () => {
    it("losslessly encodes UTF-8 identities as positive decimal strings", () => {
        expect(canonicalPublicNumericIdentity("A")).toBe("321");
        expect(canonicalPublicNumericIdentity("\u0000A")).toBe("65601");
        expect(canonicalPublicNumericIdentity("pkg-app")).toMatch(/^[1-9]\d*$/);
        expect(canonicalPublicNumericIdentity("pkg-app")).not.toBe(canonicalPublicNumericIdentity("pkg-app\u0000"));
    });
});
