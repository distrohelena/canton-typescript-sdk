import { describe, expect, it } from "vitest";
import { InMemoryQueryEvaluator } from "../../../src/query/canonical/in-memory-query-evaluator.js";
import { evaluatorCases, queryConformanceDataset } from "./query-conformance-fixture.js";

describe("InMemoryQueryEvaluator", () => {
    it.each(evaluatorCases)("evaluates $name", ({ query, expected }) => {
        expect(new InMemoryQueryEvaluator().execute(queryConformanceDataset, query)).toEqual(expected);
    });
});
