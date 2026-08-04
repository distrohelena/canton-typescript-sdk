import { describe, expect, it } from "vitest";
import {
    canonicalPublicNumericIdentity,
    compileCanonicalPublicNumericIdentityPartsSql,
    compileCanonicalPublicNumericIdentitySql,
} from "../../../src/query/canonical/public-identity.js";

describe("canonicalPublicNumericIdentity", () => {
    it("losslessly encodes UTF-8 identities as positive decimal strings", () => {
        expect(canonicalPublicNumericIdentity("A")).toBe("1065");
        expect(canonicalPublicNumericIdentity("\u0000A")).toBe("1000065");
        expect(canonicalPublicNumericIdentity("é")).toBe("1195169");
        expect(canonicalPublicNumericIdentity("pkg-app")).toMatch(/^[1-9]\d*$/);
        expect(canonicalPublicNumericIdentity("pkg-app")).not.toBe(canonicalPublicNumericIdentity("pkg-app\u0000"));
        expect(canonicalPublicNumericIdentity("a".repeat(43_690))).toHaveLength(131_071);
        expect(() => canonicalPublicNumericIdentity("a".repeat(43_691))).toThrow(/43690 UTF-8 bytes/);
    });

    it("casts PostgreSQL enum and domain identities to text before UTF-8 encoding", () => {
        expect(compileCanonicalPublicNumericIdentitySql('"identity"')).toContain(
            `convert_to(("identity")::text, 'UTF8')`,
        );
        expect(compileCanonicalPublicNumericIdentityPartsSql(['"payload_type"'])).toBe(
            `concat(octet_length(convert_to(("payload_type")::text, 'UTF8')), ':', ("payload_type")::text)`,
        );
    });
});
