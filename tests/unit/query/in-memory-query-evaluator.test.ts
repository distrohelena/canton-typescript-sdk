import { describe, expect, it } from "vitest";
import { InMemoryQueryEvaluator } from "../../../src/query/canonical/in-memory-query-evaluator.js";
import { normalizeFindMany } from "../../../src/query/canonical/query-normalizer.js";
import { evaluatorCases, normalizeConformanceCase, queryConformanceDataset } from "./query-conformance-fixture.js";

describe("InMemoryQueryEvaluator", () => {
    it.each(evaluatorCases)("normalizes raw $operation args and evaluates $name", (entry) => {
        expect(new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeConformanceCase(entry))).toEqual(entry.expected);
    });

    it("keeps fixture and returned nested query values immutable", () => {
        const result = new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeConformanceCase(evaluatorCases.find((entry) => entry.name === "typed JSON projections and nested bounded includes")!)) as readonly Record<string, unknown>[];

        const fixtureDate = queryConformanceDataset.rows.contracts[0]?.createdAt as Date;

        const row = result[0]!;

        expect(() => fixtureDate.setTime(0)).toThrow();
        expect(() => fixtureDate.setYear(2000)).toThrow();
        expect(() => (queryConformanceDataset.rows.contracts[0]?.payload as Record<string, unknown>).owner = "Mallory").toThrow();
        expect(() => (queryConformanceDataset.rows.contracts[0]?.witnesses as unknown[]).push("Mallory")).toThrow();
        expect(() => (queryConformanceDataset.rows.transactions[0]?.externalTransactionHash as Uint8Array)[0] = 9).toThrow();
        expect(() => (queryConformanceDataset.rows.transactions[0]?.externalTransactionHash as Uint8Array).subarray(0)[0] = 9).toThrow();
        expect(() => (row.when as Date).setTime(0)).toThrow();
        expect(() => (row.exercises as unknown[]).push({})).toThrow();
        expect(() => ((row.exercises as readonly Record<string, unknown>[])[0]?.argument as Record<string, unknown>).by = "Mallory").toThrow();

        const withIncludedTransaction = new InMemoryQueryEvaluator().execute(queryConformanceDataset, normalizeFindMany("contracts", {
            where: { contractId: { equals: "C1" } },
            include: { createdTransaction: true },
        })) as readonly Record<string, unknown>[];

        const transaction = withIncludedTransaction[0]?.createdTransaction as Record<string, unknown>;

        expect(() => (transaction.effectiveAt as Date).setUTCFullYear(2000)).toThrow();
        expect(() => (transaction.traceContext as Record<string, unknown>).traceId = "changed").toThrow();
        expect((queryConformanceDataset.rows.transactions[0]?.traceContext as Record<string, unknown>).traceId).toBe("a");
        expect((queryConformanceDataset.rows.exercises[1]?.argument as Record<string, unknown>).by).toBe("Alice");
    });
});
