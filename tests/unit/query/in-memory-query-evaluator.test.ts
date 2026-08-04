import { describe, expect, it } from "vitest";
import { InMemoryQueryEvaluator } from "../../../src/query/canonical/in-memory-query-evaluator.js";
import { normalizeAggregate, normalizeFindMany } from "../../../src/query/canonical/query-normalizer.js";
import { evaluatorCases, normalizeConformanceCase, queryConformanceDataset } from "./query-conformance-fixture.js";

describe("InMemoryQueryEvaluator", () => {
    it.each(evaluatorCases)("normalizes raw $operation args and evaluates $name", (entry) => {
        expect(new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeConformanceCase(entry))).toEqual(entry.expected);
    });

    it("mirrors PostgreSQL null equality, LIKE, and aggregate diagnostics", () => {
        const evaluator = new InMemoryQueryEvaluator();

        expect(evaluator.execute(queryConformanceDataset, normalizeFindMany("transactions", { where: { workflowId: { equals: null } }, select: { ix: true } }))).toEqual([]);
        expect(evaluator.execute(queryConformanceDataset, normalizeFindMany("transactions", { where: { workflowId: { in: [null, "wf"] } }, select: { ix: true } }))).toEqual([{ ix: "200" }]);
        expect(evaluator.execute(queryConformanceDataset, normalizeFindMany("packages", { where: { name: { like: "app%" } }, select: { id: true } }))).toEqual([{ id: "pkg-app" }, { id: "pkg-other" }]);
        expect(evaluator.execute(queryConformanceDataset, normalizeFindMany("packages", { where: { name: { like: "\n_" } }, select: { id: true } }))).toEqual([{ id: "pkg-unicode" }]);
        expect(() => evaluator.execute(queryConformanceDataset, normalizeAggregate("packages", { min: ["id"] }))).toThrow("id is not a numeric aggregate field of packages");
    });

    it("keeps fixture and returned nested query values immutable", () => {
        const result = new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeConformanceCase(evaluatorCases.find((entry) => entry.name === "typed JSON projections and nested bounded includes")!)) as readonly Record<string, unknown>[];

        const fixtureDate = queryConformanceDataset.rows.contracts[0]?.createdAt as Date;

        const row = result[0]!;

        expect(() => fixtureDate.setTime(0)).toThrow();
        expect(() => fixtureDate.setYear(2000)).toThrow();
        expect(() => Date.prototype.setTime.call(fixtureDate, 0)).toThrow();
        expect(() => Date.prototype.setUTCFullYear.call(fixtureDate, 2000)).toThrow();
        expect(fixtureDate).toBeInstanceOf(Date);
        expect(fixtureDate.toISOString()).toBe("2026-01-05T10:15:00.000Z");
        expect(fixtureDate.valueOf()).toBe(new Date("2026-01-05T10:15:00.000Z").valueOf());
        expect(JSON.stringify({ fixtureDate })).toBe('{"fixtureDate":"2026-01-05T10:15:00.000Z"}');
        expect(() => (queryConformanceDataset.rows.contracts[0]?.payload as Record<string, unknown>).owner = "Mallory").toThrow();
        expect(() => (queryConformanceDataset.rows.contracts[0]?.witnesses as unknown[]).push("Mallory")).toThrow();
        expect(() => (queryConformanceDataset.rows.transactions[0]?.externalTransactionHash as Uint8Array)[0] = 9).toThrow();
        expect(() => (queryConformanceDataset.rows.transactions[0]?.externalTransactionHash as Uint8Array).subarray(0)[0] = 9).toThrow();

        const fixtureBytes = queryConformanceDataset.rows.transactions[0]?.externalTransactionHash as Uint8Array;

        expect(() => fixtureBytes.valueOf()[0] = 9).toThrow();
        expect(() => Uint8Array.prototype.set.call(fixtureBytes, [9])).toThrow();
        expect(() => fixtureBytes.slice()[0] = 9).toThrow();
        new Uint8Array(fixtureBytes.buffer)[0] = 9;
        expect([...fixtureBytes]).toEqual([1, 2]);
        expect(() => (row.when as Date).setTime(0)).toThrow();
        expect(() => Date.prototype.setTime.call(row.when as Date, 0)).toThrow();
        expect(() => (row.exercises as unknown[]).push({})).toThrow();
        expect(() => ((row.exercises as readonly Record<string, unknown>[])[0]?.argument as Record<string, unknown>).by = "Mallory").toThrow();

        const withIncludedTransaction = new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeFindMany("contracts", {
            where: { contractId: { equals: "C1" } },
            include: { createdTransaction: true },
        })) as readonly Record<string, unknown>[];

        const transaction = withIncludedTransaction[0]?.createdTransaction as Record<string, unknown>;

        expect(() => (transaction.effectiveAt as Date).setUTCFullYear(2000)).toThrow();
        expect(() => (transaction.traceContext as Record<string, unknown>).traceId = "changed").toThrow();
        expect((queryConformanceDataset.rows.transactions[0]?.traceContext as Record<string, unknown>).traceparent).toBe("00-trace");
        expect((queryConformanceDataset.rows.exercises[1]?.argument as Record<string, unknown>).by).toBe("Alice");

        const byteResult = new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeFindMany("transactions", {
            where: { ix: { equals: "100" } },
            select: { externalTransactionHash: true },
        })) as readonly Record<string, unknown>[];

        const returnedBytes = byteResult[0]?.externalTransactionHash as Uint8Array;

        expect(() => returnedBytes.valueOf()[0] = 9).toThrow();
        expect([...returnedBytes]).toEqual([1, 2]);
    });
});
