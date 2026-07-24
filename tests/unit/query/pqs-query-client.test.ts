import { describe, expect, it, vi } from "vitest";
import { PqsQueryClient } from "../../../src/query/pqs/pqs-query-client.js";
import { PqsSchemaProfileV1 } from "../../../src/query/pqs/pqs-schema-profile.js";

describe("PQS query client", () => {
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
                where: { templateId: { equals: "pkg:Module:Template" } },
            }),
        ).resolves.toEqual([
            expect.objectContaining({ contractId: "cid", active: true }),
        ]);
        expect(query.mock.calls[0][1]).toEqual(["pkg:Module:Template"]);
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

    it("rejects physical fields outside the selected profile relation", async () => {
        const query = vi.fn();

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(
            client.packages.findMany({ where: { unexpected: { equals: "x" } } }),
        ).rejects.toThrow("unexpected is not a field of __packages");
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
            orderBy: { ix: "desc" },
        });
        expect(query.mock.calls[1][0]).toContain('"transaction_id" is not null');
        expect(query.mock.calls[1][0]).toContain('"transaction_id" = any($1)');
        expect(query.mock.calls[1][0]).toContain('order by "ix" desc');
        expect(query.mock.calls[1][1]).toEqual([["a", "b"]]);
    });

    it("supports profile-controlled numeric aggregates", async () => {
        const query = vi.fn().mockResolvedValue({ rows: [{ count: "2", min_pk: "1", sum_pk: "3" }] });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.packages.aggregate({ count: true, min: ["pk"], sum: ["pk"] })).resolves.toEqual({
            count: 2,
            min: { pk: "1" },
            sum: { pk: "3" },
        });
        expect(query.mock.calls[0][0]).toContain('min("pk")::text as "min_pk"');
        await expect(client.packages.aggregate({ max: ["id"] })).rejects.toThrow("id is not a numeric aggregate field");
    });

    it("aggregates logical contract lifecycle offsets", async () => {
        const query = vi.fn().mockResolvedValue({
            rows: [
                { contract_id: "one", template_id: "pkg:M:T", package_id: "pkg", witnesses: [], created_event_offset: "10", archived_event_offset: null, active: true },
                { contract_id: "two", template_id: "pkg:M:T", package_id: "pkg", witnesses: [], created_event_offset: "20", archived_event_offset: "30", active: false },
            ],
        });

        const client = new PqsQueryClient({ query } as never, new PqsSchemaProfileV1());

        await expect(client.contracts.aggregate({ count: true, min: ["createdEventOffset"], sum: ["createdEventOffset", "archivedEventOffset"] })).resolves.toEqual({
            count: 2,
            min: { createdEventOffset: "10" },
            sum: { createdEventOffset: "30", archivedEventOffset: "30" },
        });
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
});
