import { describe, expect, it, vi } from "vitest";
import { PqsQueryClient } from "../../../src/query/pqs/pqs-query-client.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";

describe("PQS query client", () => {
    it("makes explicit contract cache lifecycle calls no-ops without querying PQS", async () => {
        const query = vi.fn();

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.cacheContracts({ parties: ["Alice"] })).resolves.toEqual({ source: "pqs", cached: false });
        await expect(client.invalidateContractsCache({ parties: ["Alice"] })).resolves.toBeUndefined();
        expect(query).not.toHaveBeenCalled();
    });

    it("preserves the logical contract default SQL and result ordering", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [
                { contract_id: "C2", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "2", created_at: null, archived_event_offset: null, archived_at: null, active: true, template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template" },
                { contract_id: "C1", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "1", created_at: null, archived_event_offset: null, archived_at: null, active: true, template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template" },
            ],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.findMany()).resolves.toMatchObject([
            { contractId: "C2" }, { contractId: "C1" },
        ]);
        expect(query.mock.calls[0][0]).toContain("order by contract_row.contract_id asc");
    });

    it("waits for PQS readiness before executing logical contract reads", async () => {
        let release!: () => void;
        const ready = new Promise<void>((resolve) => { release = resolve; });
        const query = vi.fn().mockResolvedValue({ rows: [{ contract_id: "cid" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1(), ready);

        const many = client.contracts.findMany({ select: { contractId: true } });
        const unique = client.contracts.findUnique({ where: { contractId: "cid" }, select: { contractId: true } });
        await Promise.resolve();
        expect(query).not.toHaveBeenCalled();

        release();
        await expect(many).resolves.toEqual([{ contractId: "cid" }]);
        await expect(unique).resolves.toEqual({ contractId: "cid" });
        expect(query).toHaveBeenCalledTimes(2);
    });

    it("wraps rejected logical contract readiness", async () => {
        const query = vi.fn();
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1(), Promise.reject({ code: "schema" }));

        await expect(client.contracts.findMany({ select: { contractId: true } })).rejects.toMatchObject({ operation: "contracts.findMany", code: "schema" });
        expect(query).not.toHaveBeenCalled();
    });

    it("maps logical contract rows from parameterized queries", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [
                {
                    contract_id: "cid",
                    template_id: "pkg:Module:Template",
                    package_id: "pkg",
                    payload: { owner: "Alice" },
                    witnesses: ["Alice"],
                    created_event_offset: "42",
                    created_at: new Date("2026-01-01T00:00:00Z"),
                    archived_event_offset: null,
                    archived_at: null,
                    active: true,
                },
            ],
        });

        const client = new PqsQueryClient(
            { query } as never,
            new PqsSchemaProfileV1(),
        );

        await expect(
            client.contracts.findMany({
                where: {
                    templateId: {
                        packageId: { equals: "pkg" },
                        moduleName: { equals: "Module" },
                        entityName: { equals: "Template" },
                    },
                },
            }),
        ).resolves.toEqual([
            expect.objectContaining({ contractId: "cid", active: true }),
        ]);
        expect(query.mock.calls[0][1]).toEqual(["pkg", "Module", "Template"]);
    });

    it("maps partial and nested logical contract includes from their canonical result shapes", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{
                contract_id: "cid", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "42", created_at: null, archived_event_offset: null, archived_at: null, active: true,
                template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template",
                contractType: { pk: "1", exercises: [{ contractId: "cid" }] }, archivedTransaction: null,
            }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.findMany({
            include: {
                contractType: { select: { pk: true }, include: { exercises: { take: 1, select: { contractId: true } } } },
                archivedTransaction: { select: { ix: true } },
            },
        })).resolves.toEqual([expect.objectContaining({
            contractId: "cid", contractType: { pk: "1", exercises: [{ contractId: "cid" }] }, archivedTransaction: null,
        })]);
    });

    it("projects contract payload JSON scalars", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{ contract_id: "cid", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "42", archived_event_offset: null, active: true, template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template", owner: "Alice" }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.findMany({
            select: { json: { owner: { field: "payload", path: ["owner"], as: "text" } } },
        })).resolves.toEqual([{ owner: "Alice" }]);
        expect(query.mock.calls[0][0]).toContain('contract_row.payload #>> $1::text[] as "owner"');
        expect(query.mock.calls[0][1]).toEqual([["owner"]]);
    });

    it("preserves requested exercise relations in nested contract includes", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{
                contract_id: "cid", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "42", archived_event_offset: null, active: true,
                template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template",
                contract_type: { pk: "1", template_fqn: "pkg:Module:Template", aliases: [], payload_type: "", package_name: "", module_name: "", entity_name: "" },
                created_transaction: { ix: "42", transaction_id: "tx", offset: "42", effective_at: null, workflow_id: null, domain_id: null, trace_context: null, external_transaction_hash: null, paid_traffic_cost: null },
                archived_transaction: null,
                exercises: [{
                    contract_id: "cid", exercised_at_ix: "42", tpe_pk: "1", contract_tpe_pk: "1", exercise_event_pk: "7", argument: {}, result: {}, redaction_id: null, package_pk: "1", controllers: [], last_descendant_node_id: 0, witnesses: [],
                    exerciseType: { pk: "1", choice: "Transfer", consuming: false, aliases: [], package_name: "pkg", module_name: "Module", entity_name: "Template", template_fqn: "pkg:Module:Template", choice_fqn: "pkg:Module:Template:Transfer" },
                    contract: { contractId: "cid", templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" }, packageId: "pkg", payload: {}, witnesses: [], createdEventOffset: "42", createdAt: null, archivedEventOffset: null, archivedAt: null, active: true },
                    package: { pk: "1", name: "package", version: "1.0", id: "pkg" },
                    event: { pk: "7", tx_ix: "42", event_id: "exercise-event", type: "exercised" },
                    transaction: { ix: "42", offset: "42", transaction_id: "exercise-tx", effective_at: null, workflow_id: null, domain_id: null, trace_context: null, external_transaction_hash: null, paid_traffic_cost: null },
                }],
            }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        const rows = await client.contracts.findMany({
            include: {
                contractType: true,
                createdTransaction: true,
                archivedTransaction: true,
                exercises: { take: 2, include: { exerciseType: true, contract: true, package: true, event: true, transaction: true } },
            },
        });

        expect(rows[0]).toMatchObject({
            contractId: "cid",
            contractType: { pk: "1", templateFqn: "pkg:Module:Template" },
            createdTransaction: { ix: "42", transactionId: "tx" },
            archivedTransaction: null,
            exercises: [{
                contractId: "cid",
                exercisedAtIx: "42",
                exerciseType: { choice: "Transfer", consuming: false, packageName: "pkg", moduleName: "Module", entityName: "Template" },
                contract: { contractId: "cid", templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" } },
                package: { id: "pkg" },
                event: { eventId: "exercise-event" },
                transaction: { transactionId: "exercise-tx" },
            }],
        });
        expect(query.mock.calls[0][0]).toContain("jsonb_build_object('pk', (select case when octet_length");
        expect(query.mock.calls[0][0]).toContain('jsonb_agg("exercises_limited".value)');
        expect(query.mock.calls[0][1]).toEqual([2]);
    });

    it("bounds filtered and ordered nested contract relations before aggregating them", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await client.contracts.findMany({
            include: {
                exercises: {
                    take: 2,
                    where: { witnesses: { has: "Alice" } },
                    select: { contractId: true, exercisedAtIx: true },
                    orderBy: [{ exercisedAtIx: "desc" }],
                    include: { transaction: true },
                },
            },
        });

        const sql = query.mock.calls[0][0];
        expect(sql).toContain('from (select jsonb_build_object(\'contractId\', "exercises"."contract_id", \'exercisedAtIx\', (select "canonical_transaction"."offset"');
        expect(sql).toContain('$1 = any("exercises"."witnesses")');
        expect(sql).toContain('order by (select "canonical_transaction"."offset" from "public"."__transactions" "canonical_transaction" where "canonical_transaction"."ix" = "exercises"."exercised_at_ix") desc');
        expect(sql).toContain('jsonb_agg("exercises_limited".value)');
        expect(query.mock.calls[0][1]).toEqual(["Alice", 2]);
    });

    it("returns only the requested fields for a nested contract relation selection", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{
                contract_id: "cid", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "42", archived_event_offset: null, active: true,
                template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template",
                exercises: [{ contractId: "cid", exercisedAtIx: "42" }],
            }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        const rows = await client.contracts.findMany({
            include: { exercises: { take: 1, select: { contractId: true, exercisedAtIx: true } } },
        });

        expect(rows[0]?.exercises).toEqual([{ contractId: "cid", exercisedAtIx: "42" }]);
    });

    it("extracts JSON fields inside nested contract relation selections", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{
                contract_id: "cid", package_id: "pkg", payload: {}, witnesses: [], created_event_offset: "42", archived_event_offset: null, active: true,
                template_package_id: "pkg", template_module_name: "Module", template_entity_name: "Template",
                exercises: [{ owner: "Alice" }],
            }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.findMany({
            include: {
                exercises: {
                    take: 1,
                    select: { json: { owner: { field: "argument", path: ["owner"], as: "text" } } },
                },
            },
        })).resolves.toEqual([expect.objectContaining({ exercises: [{ owner: "Alice" }] })]);
        expect(query.mock.calls[0][0]).toContain('"exercises"."argument" #>> $1::text[]');
        expect(query.mock.calls[0][1]).toEqual([["owner"], 1]);
    });

    it("runs validated raw queries with separate values", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ contract_id: "cid" }] });

        const client = new PqsQueryClient(
            { query } as never,
            new PqsSchemaProfileV1(),
        );

        await expect(
            client.$queryRaw<{ contract_id: string }>(
                "select contract_id from __contracts where contract_id = $1",
                ["cid"],
            ),
        ).resolves.toEqual([{ contract_id: "cid" }]);
        expect(query).toHaveBeenCalledWith(
            "select contract_id from __contracts where contract_id = $1",
            ["cid"],
        );
    });

    it("preserves read-only SQL checks and wraps physical executor failures", async () => {
        const query = vi.fn().mockRejectedValue({ code: "57014" });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findMany()).rejects.toMatchObject({ operation: "__packages.findMany", code: "57014" });
        await expect(client.$queryRaw("delete from __packages")).rejects.toThrow("read-only");
        expect(query).toHaveBeenCalledTimes(1);
    });

    it("rejects malformed logical contract reads asynchronously before executing", async () => {
        const query = vi.fn();
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        const malformedMany = client.contracts.findMany({ where: { unexpected: { equals: "x" } } } as never);
        expect(malformedMany).toHaveProperty("then");
        await expect(malformedMany).rejects.toThrow("unexpected is not a field of contracts");

        const malformedUnique = client.contracts.findUnique({ where: { unexpected: "x" } } as never);
        expect(malformedUnique).toHaveProperty("then");
        await expect(malformedUnique).rejects.toThrow("findUnique.where must contain one declared unique key of contracts");
        expect(query).not.toHaveBeenCalled();
    });

    it("queries physical PQS relations through typed delegates", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ id: "package-id" }] });

        const client = new PqsQueryClient(
            { query } as never,
            new PqsSchemaProfileV1(),
        );

        await expect(client.packages.findMany()).resolves.toEqual([
            { id: "package-id" },
        ]);
        expect(query.mock.calls[0][0]).toContain('from "public"."__packages"');
        expect(query.mock.calls[0][0]).not.toMatch(/from "public"\."__packages" order by/);
    });

    it("maps raw PQS event and transaction values to ledger canonical shapes", async () => {
        const query = vi.fn()
            .mockResolvedValueOnce({ rows: [{ event_id: { offset: "547", node_id: 0 }, type: "exercise" }] })
            .mockResolvedValueOnce({ rows: [{ workflow_id: "", trace_context: { trace_parent: "00-trace", trace_state: "" } }] })
            .mockResolvedValueOnce({ rows: [{ pk: "7", transaction: { workflow_id: "", trace_context: { trace_parent: "00-trace", trace_state: "vendor=value" } } }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.events.findMany({ select: { eventId: true, type: true } })).resolves.toEqual([
            { eventId: "547:0", type: "exercised" },
        ]);
        await expect(client.transactions.findMany({ select: { workflowId: true, traceContext: true } })).resolves.toEqual([
            { workflowId: null, traceContext: { traceparent: "00-trace" } },
        ]);
        await expect(client.events.findMany({ select: { pk: true }, include: { transaction: { select: { workflowId: true, traceContext: true } } } })).resolves.toEqual([
            { pk: "7", transaction: { workflowId: null, traceContext: { traceparent: "00-trace", tracestate: "vendor=value" } } },
        ]);
    });

    it("includes every profile-declared physical relation through correlated queries", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{ pk: "1", name: "package", version: "1.0", id: "pkg", exercises: [{ contractId: "cid", packagePk: "1", controllers: [], witnesses: [] }] }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findMany({ include: { exercises: { take: 5 } } })).resolves.toEqual([
            expect.objectContaining({ id: "pkg", exercises: [expect.objectContaining({ contractId: "cid", packagePk: "1" })] }),
        ]);
        expect(query.mock.calls[0][0]).toContain('jsonb_agg("exercises_limited".value)');
        expect(query.mock.calls[0][0]).toContain('"exercises"."package_pk" = "public"."__packages"."pk"');
        expect(query.mock.calls[0][1]).toEqual([5]);
    });

    it("bounds filtered and ordered physical relation includes before aggregating them", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await client.packages.findMany({
            include: {
                exercises: {
                    take: 3,
                    where: { witnesses: { has: "Alice" } },
                    orderBy: [{ contractId: "asc" }],
                },
            },
        });

        const sql = query.mock.calls[0][0];
        expect(sql).toContain('from (select jsonb_build_object');
        expect(sql).toContain('$1 = any("exercises"."witnesses")');
        expect(sql).toContain(`order by "exercises"."contract_id" asc, (select (select case when octet_length`);
        expect(sql).toContain('jsonb_agg("exercises_limited".value)');
        expect(query.mock.calls[0][1]).toEqual(["Alice", 3]);
    });

    it("returns only requested fields for physical nested relation selections", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{ pk: "1", name: "package", version: "1.0", id: "pkg", exercises: [{ contractId: "cid" }] }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findMany({
            include: { exercises: { take: 1, select: { contractId: true } } },
        })).resolves.toEqual([{ pk: "1", name: "package", version: "1.0", id: "pkg", exercises: [{ contractId: "cid" }] }]);
    });

    it("extracts JSON fields inside physical nested relation selections", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{ pk: "1", name: "package", version: "1.0", id: "pkg", exercises: [{ owner: "Alice" }] }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findMany({
            include: {
                exercises: {
                    take: 1,
                    select: { json: { owner: { field: "argument", path: ["owner"], as: "text" } } },
                },
            },
        })).resolves.toEqual([{ pk: "1", name: "package", version: "1.0", id: "pkg", exercises: [{ owner: "Alice" }] }]);
        expect(query.mock.calls[0][0]).toContain('"exercises"."argument" #>> $1::text[]');
        expect(query.mock.calls[0][1]).toEqual([["owner"], 1]);
    });

    it("materializes logical contracts reached from recent update relations", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{
                ix: "42", offset: "42", transaction_id: "tx", effective_at: null, workflow_id: null, domain_id: null, trace_context: null, external_transaction_hash: null, paid_traffic_cost: null,
                events: [{
                    pk: "7", txIx: "42", eventId: "event", type: "exercised",
                    exercises: [{
                        contract: {
                            contractId: "cid", packageId: "pkg", payload: { owner: "Alice" }, witnesses: ["Alice"],
                            createdEventOffset: "42", createdAt: null, archivedEventOffset: null, archivedAt: null,
                            active: true, templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" },
                        },
                    }],
                }],
            }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.transactions.findMany({
            include: { events: { take: 10, include: { exercises: { take: 10, include: { contract: true } } } } },
        })).resolves.toEqual([expect.objectContaining({
            events: [expect.objectContaining({ exercises: [expect.objectContaining({ contract: expect.objectContaining({ contractId: "cid", templateId: { packageId: "pkg", moduleName: "Module", entityName: "Template" } }) })] })],
        })]);
        expect(query.mock.calls[0][0]).toContain("'contractId'");
        expect(query.mock.calls[0][0]).toContain("'templateId'");
    });

    it("selects logical contract fields and JSON projections through a physical relation", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{
                tpe_pk: "1", contract_tpe_pk: "1", exercise_event_pk: null, exercised_at_ix: null, contract_id: "cid", argument: {}, result: {}, redaction_id: null, package_pk: "1", controllers: [], last_descendant_node_id: "0", witnesses: [],
                contract: { contractId: "cid", owner: "Alice" },
            }],
        });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.exercises.findMany({
            include: { contract: { select: { contractId: true, json: { owner: { field: "payload", path: ["owner"], as: "text" } } } } },
        })).resolves.toEqual([expect.objectContaining({ contract: { contractId: "cid", owner: "Alice" } })]);
        expect(query.mock.calls[0][0]).toContain('"contract"."payload" #>> $1::text[]');
        expect(query.mock.calls[0][1]).toEqual([["owner"]]);
    });

    it("filters physical relation traversals by logical contract predicates", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await client.exercises.findMany({
            where: {
                contract: {
                    active: true,
                    witnesses: { has: "Alice" },
                    payload: { match: { owner: { equals: "Alice" } } },
                },
            },
        });

        expect(query.mock.calls[0][0]).toContain('"contract"."archived_at_ix" is null');
        expect(query.mock.calls[0][0]).toContain('$1 = any("contract"."witnesses")');
        expect(query.mock.calls[0][0]).toContain('"contract"."payload" #>> $2::text[] = $3');
        expect(query.mock.calls[0][1]).toEqual(["Alice", ["owner"], "Alice"]);
    });

    it("binds physical relation filters and pagination", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await client.packages.findMany({
            where: { id: { equals: "package-id" } },
            select: { id: true, name: true },
            take: 10,
            skip: 5,
        });

        expect(query.mock.calls[0][0]).toContain("where \"id\" = $1");
        expect(query.mock.calls[0][1]).toEqual(["package-id", 10, 5]);
    });

    it("compiles profile-declared to-many relation predicates", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await client.transactions.findMany({
            where: { exercises: { some: { witnesses: { has: "Alice" } } } },
        });

        expect(query.mock.calls[0][0]).toContain('exists (select 1 from "public"."__exercises" "exercises"');
        expect(query.mock.calls[0][0]).toContain('"exercises"."exercised_at_ix" = "public"."__transactions"."ix"');
        expect(query.mock.calls[0][1]).toEqual(["Alice"]);
    });

    it("compiles typed JSON path predicates for profiled JSON columns", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await client.exercises.findMany({ where: { argument: { path: ["owner"], equals: "Alice" } } });

        expect(query.mock.calls[0][0]).toContain('"argument" #>> $1::text[] = $2');
        expect(query.mock.calls[0][1]).toEqual([["owner"], "Alice"]);
    });

    it("projects named typed JSON scalars", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ owner: "Alice" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.exercises.findMany({
            select: { json: { owner: { field: "argument", path: ["owner"], as: "text" } } },
        })).resolves.toEqual([{ owner: "Alice" }]);
        expect(query.mock.calls[0][0]).toContain('"argument" #>> $1::text[] as "owner"');
        expect(query.mock.calls[0][1]).toEqual([["owner"]]);
    });

    it("compiles physical logical, range, and pattern predicates", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());
        await client.packages.findMany({ where: { or: [{ name: { ilike: "app%" } }, { pk: { gte: "10" } }], not: { id: { equals: "legacy" } } } });
        expect(query.mock.calls[0][0]).toContain(`("name" ilike $1 or (select case when octet_length`);
        expect(query.mock.calls[0][1]).toEqual(["app%", "10", "legacy"]);
    });

    it("rejects physical fields outside the selected profile relation", async () => {
        const query = vi.fn();

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(
            client.packages.findMany({ where: { unexpected: { equals: "x" } } }),
        ).rejects.toThrow("unexpected is not a field of packages");
        expect(query).not.toHaveBeenCalled();
    });

    it("rejects malformed public input before calling the executor", async () => {
        const query = vi.fn();
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findMany({
            where: { unknown: { equals: "x" } },
        } as never)).rejects.toThrow("unknown is not a field of packages");
        expect(query).not.toHaveBeenCalled();
    });

    it("counts physical relation rows with a bound filter", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ count: "2" }] });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.count({ where: { name: { equals: "app" } } })).resolves.toBe(2);
        expect(query.mock.calls[0][0]).toContain("count(*)");
        expect(query.mock.calls[0][1]).toEqual(["app"]);
    });

    it("supports unique reads, in/null predicates, ordering, and public field aliases", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ pk: "1", id: "package-id" }] });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findUnique({ where: { id: "package-id" } })).resolves.toEqual({ pk: "1", id: "package-id" });
        expect(query.mock.calls[0][0]).toContain('"id" = $1');
        expect(query.mock.calls[0][0]).toContain("limit $2");
        expect(query.mock.calls[0][1]).toEqual(["package-id", 1]);

        await client.transactions.findMany({
            where: { transactionId: { in: ["a", "b"], isNot: null } },
            orderBy: [{ ix: "desc" }],
        });
        expect(query.mock.calls[1][0]).toContain('"transaction_id" is not null');
        expect(query.mock.calls[1][0]).toContain('"transaction_id" = any($1)');
        expect(query.mock.calls[1][0]).toContain('order by "offset" desc');
        expect(query.mock.calls[1][1]).toEqual([["a", "b"]]);
    });

    it("normalizes physical unique reads before executing exactly once", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ id: "package-id" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.findUnique({ where: { id: "package-id" } })).resolves.toEqual({ id: "package-id" });
        expect(query).toHaveBeenCalledTimes(1);
        await expect(client.packages.findUnique({ where: { unknown: "x" } } as never)).rejects.toThrow("findUnique.where must contain one declared unique key of packages");
        expect(query).toHaveBeenCalledTimes(1);
    });

    it("finds one deterministic logical type by its public key", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ pk: "101", packageName: "app" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contractTypes.findUnique({ where: { pk: "101" }, select: { pk: true, packageName: true } })).resolves.toEqual({ pk: "101", packageName: "app" });
        expect(query).toHaveBeenCalledTimes(1);
        expect(query.mock.calls[0][0]).toContain('with "logical_type_root" as (select distinct on (');
        expect(query.mock.calls[0][0]).toContain('"physical_type"."pk" asc');
        expect(query.mock.calls[0][0]).toContain('limit $2');
        expect(query.mock.calls[0][1]).toEqual(["101", 1]);
    });

    it("supports profile-controlled numeric aggregates", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ count: "2", min_pk: "1", sum_pk: "3" }] });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.aggregate({ count: true, min: ["pk"], sum: ["pk"] })).resolves.toEqual({
            count: 2,
            min: { pk: "1" },
            sum: { pk: "3" },
        });
        expect(query.mock.calls[0][0]).toContain(`min((select case when octet_length`);
        await expect(client.packages.aggregate({ max: ["id"] })).rejects.toThrow("id is not a numeric aggregate field");
    });

    it("aggregates logical contract lifecycle offsets", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [{ count: "2", min_createdEventOffset: "10", sum_createdEventOffset: "30", sum_archivedEventOffset: "30" }],
        });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.aggregate({ count: true, min: ["createdEventOffset"], sum: ["createdEventOffset", "archivedEventOffset"] })).resolves.toEqual({
            count: 2,
            min: { createdEventOffset: "10" },
            sum: { createdEventOffset: "30", archivedEventOffset: "30" },
        });
    });

    it("executes direct logical contract count and aggregate SQL", async () => {
        const query = vi.fn().mockResolvedValueOnce({ rows: [{ count: "2" }] }).mockResolvedValueOnce({ rows: [{ count: "2", min_createdEventOffset: "10", sum_createdEventOffset: "30" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.count({ parties: ["Alice"], where: { active: true } })).resolves.toBe(2);
        await expect(client.contracts.aggregate({ count: true, min: ["createdEventOffset"], sum: ["createdEventOffset"] })).resolves.toEqual({ count: 2, min: { createdEventOffset: "10" }, sum: { createdEventOffset: "30" } });
        expect(query.mock.calls[0][0]).toContain("select count(*)::text as count from");
        expect(query.mock.calls[0][0]).not.toContain("contract_row.contract_id as contract_id");
        expect(query.mock.calls[0][1]).toEqual([["Alice"]]);
        expect(query.mock.calls[1][0]).toContain('min(created_tx.offset)::text as "min_createdEventOffset"');
        expect(query.mock.calls[1][0]).not.toContain("contract_row.contract_id as contract_id");
    });

    it("groups contracts by JSON payload and witnesses", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ owner: "Alice", witnesses: "Alice", count: "2", sum_createdEventOffset: "42" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.groupBy({
            by: [{ payload: { name: "owner", path: ["owner"], as: "text" } }, "witnesses"],
            aggregate: { count: true, sum: ["createdEventOffset"] },
        })).resolves.toEqual([{ owner: "Alice", witnesses: "Alice", count: 2, sum_createdEventOffset: "42" }]);
        expect(query.mock.calls[0][0]).toContain("cross join lateral unnest(contract_row.witnesses)");
        expect(query.mock.calls[0][1]).toEqual([["owner"]]);
    });

    it("does not expose findUnique for exercises", () => {
        const client = new PqsQueryClient({ query: vi.fn() } as never, new PqsSchemaProfileV1());

        expect("findUnique" in client.exercises).toBe(false);
    });

    it("creates a profile-controlled delegate for every physical relation", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [] });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await Promise.all([
            client.contractTypes.findMany(),
            client.events.findMany(),
            client.exercises.findMany(),
            client.exerciseTypes.findMany(),
            client.packages.findMany(),
            client.transactions.findMany(),
            client.watermark.findMany(),
        ]);

        for (const relation of ["__contract_tpe", "__events", "__exercises", "__exercise_tpe", "__packages", "__transactions", "__watermark"]) {
            expect(query.mock.calls.some(([sql]) => sql.includes(`"${relation}"`))).toBe(true);
        }
    });

    it("groups events by type and a transaction time bucket", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ type: "created", transaction_effectiveAt_day: new Date("2026-01-01T00:00:00Z"), count: "2" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.events.groupBy({
            by: ["type", { transaction: { effectiveAt: { bucket: "day" } } }],
            where: { exercises: { some: { witnesses: { has: "Alice" } } } },
            aggregate: { count: true },
        })).resolves.toEqual([{ type: "created", transaction_effectiveAt_day: new Date("2026-01-01T00:00:00Z"), count: 2 }]);
        expect(query.mock.calls[0][0]).toContain('date_trunc(\'day\', "transaction"."effective_at")');
        expect(query.mock.calls[0][0]).toContain('group by case "event"."type"::text when \'create\' then \'created\' when \'exercise\' then \'exercised\' else "event"."type"::text end, date_trunc(\'day\', "transaction"."effective_at")');
        expect(query.mock.calls[0][0]).toContain('exists (select 1 from "public"."__exercises" "exercises"');
        expect(query.mock.calls[0][1]).toEqual(["Alice"]);
    });

    it("groups traffic by transaction domain and time bucket", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ domainId: "domain", effectiveAt_day: new Date("2026-01-01T00:00:00Z"), count: "2", sum_paidTrafficCost: "12" }] });
        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.transactions.groupBy({
            by: ["domainId", { effectiveAt: { bucket: "day" } }],
            aggregate: { count: true, sum: ["paidTrafficCost"] },
        })).resolves.toEqual([{ domainId: "domain", effectiveAt_day: new Date("2026-01-01T00:00:00Z"), count: 2, sum_paidTrafficCost: "12" }]);
        expect(query.mock.calls[0][0]).toContain('date_trunc(\'day\', "root"."effective_at")');
        expect(query.mock.calls[0][0]).toContain('sum("root"."paid_traffic_cost")::text as "sum_paidTrafficCost"');
    });
});
