import { describe, expect, it } from "vitest";
import * as relationalCompiler from "../../../src/query/pqs/pqs-relational-sql-compiler.js";
import { compilePqsRelationFindMany, compilePqsRelationGroupBy } from "../../../src/query/pqs/pqs-relational-sql-compiler.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";
import { normalizeAggregate, normalizeCount, normalizeFindMany, normalizeGroupBy } from "../../../src/query/canonical/query-normalizer.js";
import { canonicalPublicNumericIdentity } from "../../../src/query/canonical/public-identity.js";

describe("PQS relational SQL compiler", () => {
    it("compiles public key fields from source-independent semantic identities", () => {
        const query = compilePqsRelationFindMany("__exercises", normalizeFindMany("exercises", {
            where: { packagePk: { equals: canonicalPublicNumericIdentity("pkg-app") } },
            select: { tpePk: true, contractTpePk: true, exerciseEventPk: true, exercisedAtIx: true, packagePk: true },
            orderBy: [{ packagePk: "asc" }],
        }), new PqsSchemaProfileV1());

        expect(query.text).not.toContain('"package_pk" as "packagePk"');
        expect(query.text).toContain('"canonical_package"."pk" = "package_pk"');
        expect(query.text).toContain('"canonical_event"."pk" = "exercise_event_pk"');
        expect(query.text).toContain('"canonical_transaction"."ix" = "exercised_at_ix"');
        expect(query.text).toContain('"canonical_contract_type"."pk" = "contract_tpe_pk"');
        expect(query.text).toContain('"canonical_exercise_type"."pk" = "tpe_pk"');
        expect(query.values).toEqual([canonicalPublicNumericIdentity("pkg-app")]);

        const nested = compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {
            include: { exercises: { take: 1, select: { packagePk: true } } },
        }), new PqsSchemaProfileV1());

        expect(nested.text).toMatch(/'packagePk', \(select trunc\(power\(256::numeric[\s\S]*\)::text/);
    });
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

        const aggregateResult = aggregate("__packages", normalizeAggregate("packages", {
            where: { name: { equals: "app" } }, count: true, min: ["pk"], sum: ["pk"],
        }), new PqsSchemaProfileV1());
        expect(aggregateResult.text).toContain('min(trunc(power(256::numeric');
        expect(aggregateResult.text).toContain('sum(trunc(power(256::numeric');
        expect(aggregateResult.values).toEqual(["app"]);
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
        expect(query.text).toContain('order by "name" asc, "version" desc, trunc(power(256::numeric');
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

        expect(query.text).toContain('order by "name" asc, "version" desc, trunc(power(256::numeric');
        expect(query.values).toEqual(["app%", 10, 5]);
    });

    it("preserves unordered SQL for an unpaginated package read", () => {
        const query = compilePqsRelationFindMany("__packages", normalizeFindMany("packages", {}), new PqsSchemaProfileV1());

        expect(query.text).toContain('trunc(power(256::numeric');
        expect(query.text).toContain('as "pk", "name" as "name", "version" as "version", "id" as "id" from "public"."__packages"');
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

        expect(query.text).toContain('select "contract_id" as "contractId", "argument" #>> $2::text[] as "choice" from "public"."__exercises"');
        expect(query.text).toContain('"canonical_exercise_type"."pk" = "tpe_pk"');
        expect(query.text).toContain('"canonical_contract_type"."pk" = "contract_tpe_pk"');
        expect(query.text).toContain('"canonical_event"."pk" = "exercise_event_pk"');
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

    it("canonicalizes event identities and types while filtering physical event values", () => {
        const profile = new PqsSchemaProfileV1();
        const query = compilePqsRelationFindMany("__events", normalizeFindMany("events", {
            where: { and: [
                { type: { in: ["created", "exercised"] } },
                { eventId: { equals: "547:0" } },
            ] },
            select: { eventId: true, type: true },
            orderBy: [{ type: "asc" }],
        }), profile);
        const count = relationalCompiler.compilePqsRelationCount("__events", normalizeCount("events", {
            where: { type: { equals: "exercised" } },
        }), profile);
        const group = compilePqsRelationGroupBy("__events", normalizeGroupBy("events", {
            by: ["type"],
            aggregate: { count: true },
        }), profile);

        const eventId = `(to_jsonb("event_id")->>'offset') || ':' || (to_jsonb("event_id")->>'node_id')`;
        const eventType = `case "type"::text when 'create' then 'created' when 'exercise' then 'exercised' else "type"::text end`;

        expect(query.text).toContain(`${eventId} as "eventId"`);
        expect(query.text).toContain(`${eventType} as "type"`);
        expect(query.text).toContain('"type" = any($1)');
        expect(query.text).toContain(`${eventId} = $2`);
        expect(query.text).toContain(`order by ${eventType} asc`);
        expect(query.values).toEqual([["create", "exercise"], "547:0"]);
        expect(count.text).toContain('"type" = $1');
        expect(count.values).toEqual(["exercise"]);
        expect(group.text).toContain(`case "event"."type"::text when 'create' then 'created' when 'exercise' then 'exercised' else "event"."type"::text end as "type"`);
        expect(group.text).toContain(`group by case "event"."type"::text`);
    });

    it("canonicalizes transaction workflow and trace context in roots, predicates, and includes", () => {
        const query = compilePqsRelationFindMany("__transactions", normalizeFindMany("transactions", {
            where: {
                workflowId: { is: null },
                traceContext: { path: ["traceparent"], equals: "00-trace" },
            },
            select: { workflowId: true, traceContext: true },
            include: { events: { take: 1, select: { eventId: true, type: true } } },
        }), new PqsSchemaProfileV1());
        const nested = compilePqsRelationFindMany("__events", normalizeFindMany("events", {
            select: { pk: true },
            include: { transaction: { select: { workflowId: true, traceContext: true } } },
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain(`nullif("workflow_id", '') as "workflowId"`);
        expect(query.text).toContain(`jsonb_build_object('traceparent', nullif(to_jsonb("trace_context")->>'trace_parent', ''), 'tracestate', nullif(to_jsonb("trace_context")->>'trace_state', ''))`);
        expect(query.text).toContain(`nullif("workflow_id", '') is null`);
        expect(query.text).toContain(`jsonb_build_object('traceparent', nullif(to_jsonb("trace_context")->>'trace_parent', ''), 'tracestate', nullif(to_jsonb("trace_context")->>'trace_state', ''))`);
        expect(query.text).toContain("#>> $1::text[] = $2");
        expect(query.text).toContain(`'eventId', (to_jsonb("events"."event_id")->>'offset') || ':' || (to_jsonb("events"."event_id")->>'node_id')`);
        expect(query.text).toContain(`'type', case "events"."type"::text when 'create' then 'created' when 'exercise' then 'exercised' else "events"."type"::text end`);
        expect(query.values).toEqual([["traceparent"], "00-trace", 1]);
        expect(nested.text).toContain(`'workflowId', nullif("transaction"."workflow_id", '')`);
        expect(nested.text).toContain(`'traceContext', case when "transaction"."trace_context" is null then null else jsonb_strip_nulls(jsonb_build_object('traceparent', nullif(to_jsonb("transaction"."trace_context")->>'trace_parent', ''), 'tracestate', nullif(to_jsonb("transaction"."trace_context")->>'trace_state', ''))) end`);
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

        expect(query.text).toContain('jsonb_build_object(\'contractId\', "exercises"."contract_id"');
        expect(query.text).toContain('"canonical_exercise_type"."pk" = "exercises"."tpe_pk"');
        expect(query.text).toContain('"canonical_contract_type"."pk" = "exercises"."contract_tpe_pk"');
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

    it("canonicalizes lifecycle offsets and package IDs in nested contract includes", () => {
        const query = compilePqsRelationFindMany("__transactions", normalizeFindMany("transactions", {
            select: { offset: true },
            include: {
                createdContracts: {
                    take: 1,
                    where: { createdEventOffset: { gte: "500" } },
                    orderBy: [{ archivedEventOffset: "desc" }],
                    select: { packageId: true, templateId: true, createdEventOffset: true, archivedEventOffset: true },
                },
            },
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain("coalesce(\"createdContracts\".\"creation_package_id\", (select contract_package.\"id\"");
        expect(query.text).toContain("'templateId', jsonb_build_object('packageId', coalesce(\"createdContracts\".\"creation_package_id\"");
        expect(query.text).toContain("select created_transaction.\"offset\" from \"public\".\"__transactions\" created_transaction where created_transaction.\"ix\" = \"createdContracts\".\"created_at_ix\"");
        expect(query.text).toContain("select archived_transaction.\"offset\" from \"public\".\"__transactions\" archived_transaction where archived_transaction.\"ix\" = \"createdContracts\".\"archived_at_ix\"");
        expect(query.text).toContain(") >= $1");
        expect(query.text).toContain("order by (select archived_transaction.\"offset\"");
        expect(query.values).toEqual(["500", 1]);
    });

    it("preserves parameter order for JSON and relational canonical predicates", () => {
        const query = compilePqsRelationFindMany("__exercises", normalizeFindMany("exercises", {
            where: {
                argument: { path: ["choice"], equals: "Archive" },
                contract: { payload: { match: { owner: { equals: "Alice" } } } },
            },
        }), new PqsSchemaProfileV1());

        expect(query.text).toContain('"canonical_exercise_type"."pk" = "tpe_pk"');
        expect(query.text).toContain('"canonical_contract_type"."pk" = "contract_tpe_pk"');
        expect(query.text).toContain('"canonical_event"."pk" = "exercise_event_pk"');
        expect(query.text).toContain('"canonical_package"."pk" = "package_pk"');
        expect(query.text).toContain('"argument" #>> $1::text[] = $2');
        expect(query.values).toEqual([["choice"], "Archive", ["owner"], "Alice"]);
    });

    it("rejects raw-shaped compiler input at the canonical discriminant boundary", () => {
        expect(() => compilePqsRelationFindMany("__packages", { where: { id: { equals: "pkg" } } } as unknown as ReturnType<typeof normalizeFindMany>, new PqsSchemaProfileV1()))
            .toThrow("requires a canonical findMany query");
    });
});
