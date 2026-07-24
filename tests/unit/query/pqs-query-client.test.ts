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
});
