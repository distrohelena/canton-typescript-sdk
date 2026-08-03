import { describe, expect, it } from "vitest";
import { createQueryDataset, relatedQueryRows, type QueryDataset } from "../../../src/query/canonical/query-dataset.js";
import { InMemoryQueryEvaluator } from "../../../src/query/canonical/in-memory-query-evaluator.js";
import { normalizeFindMany } from "../../../src/query/canonical/query-normalizer.js";
import { queryConformanceDataset } from "./query-conformance-fixture.js";

function mutableDataset(): QueryDataset {
    return JSON.parse(JSON.stringify(queryConformanceDataset)) as QueryDataset;
}

describe("createQueryDataset", () => {
    it("returns an immutable snapshot whose indexes cannot become stale after input mutation", () => {
        const input = mutableDataset();

        const dataset = createQueryDataset(input);

        (input.rows.packages as Record<string, unknown>[])[0]!.id = "changed";
        (input.rows.contracts as Record<string, unknown>[])[0]!.payload = { owner: "changed" };
        expect(Object.isFrozen(dataset.rows.packages)).toBe(true);
        expect(dataset.rows.packages[0]?.id).toBe("pkg-app");
        expect(new InMemoryQueryEvaluator().execute(dataset, normalizeFindMany("packages", { select: { id: true } }))).toEqual([{ id: "pkg-app" }, { id: "pkg-other" }, { id: "pkg-unicode" }]);
    });

    it("caches one compiled snapshot for raw inputs and resolves raw helper lookups", () => {
        const input = mutableDataset();

        const evaluator = new InMemoryQueryEvaluator();

        const query = normalizeFindMany("packages", { select: { id: true } });

        const first = createQueryDataset(input);

        expect(createQueryDataset(input)).toBe(first);
        expect(relatedQueryRows(input, "contracts", input.rows.contracts[0]!, "exercises").map((row) => row.contractId)).toEqual(["C1"]);
        (input.rows.packages as Record<string, unknown>[])[0]!.id = "changed";
        expect(evaluator.execute(input, query)).toEqual([{ id: "pkg-app" }, { id: "pkg-other" }, { id: "pkg-unicode" }]);
    });

    it("rejects malformed relation, edge, lookup, and source-local declarations", () => {
        const missingRelation = mutableDataset();

        delete (missingRelation.rows as Partial<QueryDataset["rows"]>).packages;
        expect(() => createQueryDataset(missingRelation)).toThrow("missing packages rows");

        const missingEdge = mutableDataset();

        delete (missingEdge.edges.contracts as Record<string, unknown>).exercises;
        expect(() => createQueryDataset(missingEdge)).toThrow("missing contracts.exercises edge");

        const arity = mutableDataset();

        (arity.edges.contracts as Record<string, { from: string[]; to: string[] }>).exercises = { from: ["contractId"], to: ["contractId", "packagePk"] };
        expect(() => createQueryDataset(arity)).toThrow("lookup arity differs");

        const invalidSource = mutableDataset();

        (invalidSource.edges.contracts as Record<string, { from: string[]; to: string[] }>).exercises = { from: ["missing"], to: ["contractId"] };
        expect(() => createQueryDataset(invalidSource)).toThrow("source path missing is invalid");

        const invalidTarget = mutableDataset();

        (invalidTarget.edges.contracts as Record<string, { from: string[]; to: string[] }>).exercises = { from: ["contractId"], to: ["missing"] };
        expect(() => createQueryDataset(invalidTarget)).toThrow("target path missing is invalid");

        const invalidLocal = mutableDataset();

        (invalidLocal.sourceLocalKeys as Record<string, readonly (readonly string[])[]>).packages = [["missing"]];
        expect(() => createQueryDataset(invalidLocal)).toThrow("source-local key path missing is invalid");
    });

    it("rejects duplicate local keys and duplicate to-one targets while allowing to-many targets", () => {
        const duplicateLocal = mutableDataset();

        duplicateLocal.rows = { ...duplicateLocal.rows, packages: [...duplicateLocal.rows.packages, { ...duplicateLocal.rows.packages[0] }] };
        expect(() => createQueryDataset(duplicateLocal)).toThrow("packages source-local key is not unique");

        const duplicateToOne = mutableDataset();

        duplicateToOne.rows = { ...duplicateToOne.rows, contractTypes: [...duplicateToOne.rows.contractTypes, { ...duplicateToOne.rows.contractTypes[0], pk: "30" }] };
        expect(() => createQueryDataset(duplicateToOne)).toThrow("contracts.contractType has multiple to-one targets");

        expect(createQueryDataset(mutableDataset())).toBeTruthy();
    });

    it("validates declared paths even when source or target rows are empty", () => {
        const emptyLocal = mutableDataset();

        emptyLocal.rows = { ...emptyLocal.rows, packages: [] };
        (emptyLocal.sourceLocalKeys as Record<string, readonly (readonly string[])[]>).packages = [["missing"]];
        expect(() => createQueryDataset(emptyLocal)).toThrow("source-local key path missing is invalid");

        const emptySource = mutableDataset();

        emptySource.rows = { ...emptySource.rows, contracts: [] };
        (emptySource.edges.contracts as Record<string, { from: string[]; to: string[] }>).exercises = { from: ["missing"], to: ["contractId"] };
        expect(() => createQueryDataset(emptySource)).toThrow("source path missing is invalid");

        const emptyTarget = mutableDataset();

        emptyTarget.rows = { ...emptyTarget.rows, exercises: [] };
        (emptyTarget.edges.contracts as Record<string, { from: string[]; to: string[] }>).exercises = { from: ["contractId"], to: ["missing"] };
        expect(() => createQueryDataset(emptyTarget)).toThrow("target path missing is invalid");
    });
});
