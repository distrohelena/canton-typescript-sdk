import { describe, expect, it } from "vitest";
import { compileContractFindMany, compileContractGroupBy } from "../../../src/query/pqs/pqs-sql-compiler.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";
import { normalizeFindMany, normalizeGroupBy } from "../../../src/query/canonical/query-normalizer.js";

describe("PQS SQL compiler", () => {
    it("binds contract filters as positional values", () => {
        const query = compileContractFindMany(
            normalizeFindMany("contracts", {
                where: {
                    templateId: { packageId: { equals: "package" }, moduleName: { equals: "Module" }, entityName: { equals: "Template" } },
                    active: true,
                    witnesses: { has: "Alice" },
                },
                orderBy: [{ createdEventOffset: "desc" }],
                take: 20,
                skip: 10,
            }),
            new PqsSchemaProfileV1("public"),
        );

        expect(query.text).toContain('from "public"."__contracts" contract_row');
        expect(query.text).toContain("contract_row.creation_package_id");
        expect(query.text).toContain("$1");
        expect(query.values).toEqual(["package", "Module", "Template", "Alice", 20, 10]);
    });

    it("narrows logical contract reads to witnesses when parties are supplied", () => {
        const compiled = compileContractFindMany(
            normalizeFindMany("contracts", { parties: ["Alice", "Bob"] }),
            new PqsSchemaProfileV1(),
        );

        expect(compiled.text).toContain("contract_row.witnesses && $1::text[]");
        expect(compiled.values).toEqual([["Alice", "Bob"]]);
    });

    it("compiles nested range, pattern, and payload-path filters with bound values", () => {
        const compiled = compileContractFindMany(normalizeFindMany("contracts", {
            where: { and: [
                { createdEventOffset: { gte: "100" } },
                { payload: { match: { owner: { city: { ilike: "new%" } } } } },
                { not: { active: { equals: false } } },
            ] },
        }), new PqsSchemaProfileV1());

        expect(compiled.text).toContain("contract_row.created_at_ix >= $1");
        expect(compiled.text).toContain("contract_row.payload #>> $2::text[] ilike $3");
        expect(compiled.text).toContain("not (contract_row.archived_at_ix is not null)");
        expect(compiled.values).toEqual(["100", ["owner", "city"], "new%"]);
    });

    it("groups contracts by payload extraction and unnested witnesses", () => {
        const query = compileContractGroupBy(normalizeGroupBy("contracts", {
            where: { active: true },
            by: [
                { payload: { name: "owner", path: ["owner"], as: "text" } },
                "witnesses",
            ],
            aggregate: { count: true, sum: ["createdEventOffset"] },
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain("contract_row.payload #>> $1::text[] as \"owner\"");
        expect(query.text).toContain("cross join lateral unnest(contract_row.witnesses) as witness(value)");
        expect(query.text).toContain("sum(contract_row.created_at_ix)::text as \"sum_createdEventOffset\"");
        expect(query.values).toEqual([["owner"]]);
    });

    it("filters contracts through profiled exercise relations", () => {
        const query = compileContractFindMany(normalizeFindMany("contracts", {
            where: { exercises: { some: { witnesses: { has: "Alice" } } } },
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain('exists (select 1 from "public"."__exercises" "exercises"');
        expect(query.text).toContain('"exercises"."contract_id" = contract_row."contract_id"');
        expect(query.values).toEqual(["Alice"]);
    });

    it("compiles canonical nested exercise predicates without changing bindings", () => {
        const query = compileContractFindMany(normalizeFindMany("contracts", {
            where: { exercises: { some: { witnesses: { has: "Alice" } } } },
            take: 2,
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain('exists (select 1 from "public"."__exercises" "exercises"');
        expect(query.values).toEqual(["Alice", 2]);
    });

    it("compiles canonical contract group queries", () => {
        const query = compileContractGroupBy(normalizeGroupBy("contracts", {
            by: ["witnesses"],
            aggregate: { count: true },
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain("cross join lateral unnest(contract_row.witnesses)");
    });
});
