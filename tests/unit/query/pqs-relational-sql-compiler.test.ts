import { describe, expect, it } from "vitest";
import * as relationalCompiler from "../../../src/query/pqs/pqs-relational-sql-compiler.js";
import { compilePqsRelationFindMany, compilePqsRelationGroupBy } from "../../../src/query/pqs/pqs-relational-sql-compiler.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";
import { normalizeAggregate, normalizeCount, normalizeFindMany, normalizeGroupBy } from "../../../src/query/canonical/query-normalizer.js";

describe("PQS relational SQL compiler", () => {
    it("quotes hostile JSON projection aliases in root, nested, and group SQL", () => {
        const rootName = 'root"; drop table x; --';
        const nestedName = "nested'); select 1; --";
        const groupName = 'group"; --';
        const profile = new PqsSchemaProfileV1();
        const query = compilePqsRelationFindMany("__exercises", normalizeFindMany("exercises", {
            select: { json: { [rootName]: { field: "argument", path: ["name"], as: "text" } } },
            include: { contract: { select: { json: { [nestedName]: { field: "payload", path: ["name"], as: "text" } } } } },
        }), profile);

        expect(query.text).toContain('as "root""; drop table x; --"');
        expect(query.text).toContain("'nested''); select 1; --'");
        expect(compilePqsRelationGroupBy("__exercises", normalizeGroupBy("exercises", {
            by: [{ argument: { name: groupName, path: ["name"], as: "text" } }], aggregate: { count: true },
        }), profile).text).toContain('as "group""; --"');
    });
    it("compiles physical counts directly from canonical predicates", () => {
        const compileCount = relationalCompiler["compilePqsRelationCount"] as undefined | ((relation: "__packages", query: ReturnType<typeof normalizeCount>, profile: PqsSchemaProfileV1) => { readonly text: string; readonly values: readonly unknown[] });

        expect(compileCount).toBeTypeOf("function");
        expect(compileCount?.("__packages", normalizeCount("packages", {
            where: {
                or: [{ name: { ilike: "app%" } }, { id: { equals: "pkg" } }],
            },
        }), new PqsSchemaProfileV1())).toEqual({
            text: 'select count(*)::text as count from "public"."__packages" where ("name" ilike $1 or "id" = $2)',
            values: ["app%", "pkg"],
        });
    });

    it("owns aggregate and group-by predicate parameter ordering", () => {
        const aggregate = relationalCompiler["compilePqsRelationAggregate"] as (relation: "__packages", query: ReturnType<typeof normalizeAggregate>, profile: PqsSchemaProfileV1) => { readonly text: string; readonly values: readonly unknown[] };
        const groupBy = relationalCompiler["compilePqsRelationGroupBy"] as (relation: "__packages", query: ReturnType<typeof normalizeGroupBy>, profile: PqsSchemaProfileV1) => { readonly text: string; readonly values: readonly unknown[] };

        expect(aggregate("__packages", normalizeAggregate("packages", {
            where: { name: { equals: "app" } }, count: true, min: ["pk"], sum: ["pk"],
        }), new PqsSchemaProfileV1())).toEqual({
            text: 'select count(*)::text as count, min("pk")::text as "min_pk", sum("pk")::text as "sum_pk" from "public"."__packages" where "name" = $1',
            values: ["app"],
        });
        expect(groupBy("__packages", normalizeGroupBy("packages", {
            by: ["name"], where: { id: { equals: "pkg" } }, aggregate: { count: true },
        }), new PqsSchemaProfileV1())).toEqual({
            text: 'select "root"."name" as "name", count(*)::text as count from "public"."__packages" "root" where "root"."id" = $1 group by "root"."name"',
            values: ["pkg"],
        });
    });

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

    it("preserves unordered SQL for an unpaginated package read", () => {
        const query = compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {}), new PqsSchemaProfileV1());

        expect(query.text).toBe('select "pk" as "pk", "name" as "name", "version" as "version", "id" as "id" from "public"."__packages"');
        expect(query.values).toEqual([]);
    });

    it("compiles physical scalar and JSON projections with a canonical result shape", () => {
        const query = compilePqsRelationFindMany("__exercises", normalizeFindMany("exercises", {
            select: {
                contractId: true,
                json: { choice: { field: "argument", path: ["choice"], as: "text" } },
            },
            orderBy: [{ contractId: "asc" }],
            take: 3,
        }), new PqsSchemaProfileV1());

        expect(query.text).toBe('select "contract_id" as "contractId", "argument" #>> $2::text[] as "choice" from "public"."__exercises" order by "contract_id" asc, "tpe_pk" asc, "contract_tpe_pk" asc, "exercise_event_pk" asc limit $1');
        expect(query.values).toEqual([3, ["choice"]]);
        expect(query.resultShape).toEqual({
            relation: "__exercises", cardinality: "many",
            fields: [{ name: "contractId" }],
            json: [{ name: "choice", field: "argument", path: ["choice"], as: "text" }],
            includes: [],
        });
        expect(Object.isFrozen(query.resultShape)).toBe(true);
        expect(Object.isFrozen(query.resultShape.fields)).toBe(true);
        expect(Object.isFrozen(query.resultShape.json[0].path)).toBe(true);
    });

    it("compiles bounded nested physical includes from canonical nodes", () => {
        const query = compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {
            select: { id: true },
            include: {
                exercises: {
                    where: { contractId: { equals: "C1" } },
                    select: {
                        contractId: true,
                        json: { choice: { field: "argument", path: ["choice"], as: "text" } },
                    },
                    orderBy: [{ contractId: "desc" }],
                    take: 2,
                    include: { exerciseType: { where: { choice: { equals: "Archive" } }, select: { choice: true } } },
                },
            },
        }), new PqsSchemaProfileV1());

        expect(query.text).toBe('select "id" as "id", (select coalesce(jsonb_agg("exercises_limited".value), \'[]\'::jsonb) from (select jsonb_build_object(\'contractId\', "exercises"."contract_id", \'choice\', "exercises"."argument" #>> $1::text[], \'exerciseType\', (select jsonb_build_object(\'choice\', "exerciseType"."choice") from "public"."__exercise_tpe" "exerciseType" where "exerciseType"."pk" = "exercises"."tpe_pk" and ("exerciseType"."choice" = $2))) as value from "public"."__exercises" "exercises" where "exercises"."package_pk" = "public"."__packages"."pk" and ("exercises"."contract_id" = $3) order by "exercises"."contract_id" desc, "exercises"."tpe_pk" asc, "exercises"."contract_tpe_pk" asc, "exercises"."exercise_event_pk" asc limit $4) "exercises_limited") as "exercises" from "public"."__packages"');
        expect(query.values).toEqual([["choice"], "Archive", "C1", 2]);
        expect(query.resultShape.includes).toEqual([{
            edge: "exercises", target: "__exercises", cardinality: "many",
            shape: {
                relation: "__exercises", cardinality: "many", fields: [{ name: "contractId" }], json: [{ name: "choice", field: "argument", path: ["choice"], as: "text" }],
                includes: [{ edge: "exerciseType", target: "__exercise_tpe", cardinality: "one", shape: { relation: "__exercise_tpe", cardinality: "one", fields: [{ name: "choice" }], json: [], includes: [] } }],
            },
        }]);
    });

    it("compiles logical contract targets as canonical include shapes", () => {
        const query = compilePqsRelationFindMany("__exercises", normalizeFindMany("exercises", {
            select: { contractId: true },
            include: { contract: { select: { contractId: true, active: true } } },
        }), new PqsSchemaProfileV1());

        expect(query.text).toBe('select "contract_id" as "contractId", (select jsonb_build_object(\'contractId\', "contract"."contract_id", \'active\', "contract"."archived_at_ix" is null) from "public"."__contracts" "contract" where "contract"."contract_id" = "public"."__exercises"."contract_id" and (true)) as "contract" from "public"."__exercises"');
        expect(query.values).toEqual([]);
        expect(query.resultShape.includes[0]).toMatchObject({ edge: "contract", target: "__contracts", cardinality: "one" });
        expect(query.resultShape.includes[0]?.shape.fields).toEqual([{ name: "contractId" }, { name: "active" }]);
    });

    it("preserves parameter order for JSON and relational canonical predicates", () => {
        const query = compilePqsRelationFindMany("__exercises", normalizeFindMany("exercises", {
            where: {
                argument: { path: ["choice"], equals: "Archive" },
                contract: { payload: { match: { owner: { equals: "Alice" } } } },
            },
        }), new PqsSchemaProfileV1());

        expect(query.text).toBe('select "tpe_pk" as "tpePk", "contract_tpe_pk" as "contractTpePk", "exercise_event_pk" as "exerciseEventPk", "exercised_at_ix" as "exercisedAtIx", "contract_id" as "contractId", "argument" as "argument", "result" as "result", "redaction_id" as "redactionId", "package_pk" as "packagePk", "controllers" as "controllers", "last_descendant_node_id" as "lastDescendantNodeId", "witnesses" as "witnesses" from "public"."__exercises" where ("argument" #>> $1::text[] = $2 and exists (select 1 from "public"."__contracts" "contract" where "contract"."contract_id" = "public"."__exercises"."contract_id" and ("contract"."payload" #>> $3::text[] = $4)))');
        expect(query.values).toEqual([["choice"], "Archive", ["owner"], "Alice"]);
    });

    it("rejects raw-shaped compiler input at the canonical discriminant boundary", () => {
        expect(() => compilePqsRelationFindMany("__packages", { where: { id: { equals: "pkg" } } } as unknown as ReturnType<typeof normalizeFindMany>, new PqsSchemaProfileV1()))
            .toThrow("requires a canonical findMany query");
    });
});
