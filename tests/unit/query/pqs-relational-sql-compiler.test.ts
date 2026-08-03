import { describe, expect, it } from "vitest";
import { compilePqsRelationFindMany } from "../../../src/query/pqs/pqs-relational-sql-compiler.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";
import { normalizeFindMany } from "../../../src/query/canonical/query-normalizer.js";

describe("PQS relational SQL compiler", () => {
    it("compiles profile-controlled root reads with multi-field ordering", () => {
        const query = compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {
            where: { name: { ilike: "app%" } },
            select: { id: true, name: true },
            orderBy: [{ name: "asc" }, { version: "desc" }],
            take: 10,
            skip: 5,
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain('select "id" as "id", "name" as "name" from "public"."__packages"');
        expect(query.text).toContain('where "name" ilike $1');
        expect(query.text).toContain('order by "name" asc, "version" desc, "pk" asc');
        expect(query.values).toEqual(["app%", 10, 5]);
    });

    it("rejects fields outside the selected relation profile", () => {
        expect(() => compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {
            where: { unknown: { equals: "x" } },
        }), new PqsSchemaProfileV1())).toThrow("unknown is not a field of packages");
    });

    it("compiles canonical multi-field package ordering with stable ordering", () => {
        const query = compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {
            where: { name: { ilike: "app%" } },
            select: { id: true, name: true },
            orderBy: [{ name: "asc" }, { version: "desc" }],
            take: 10,
            skip: 5,
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain('order by "name" asc, "version" desc, "pk" asc');
        expect(query.values).toEqual(["app%", 10, 5]);
    });
});
