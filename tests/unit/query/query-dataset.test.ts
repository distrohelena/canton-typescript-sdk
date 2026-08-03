import { describe, expect, it } from "vitest";
import { createQueryDataset, type QueryDataset } from "../../../src/query/canonical/query-dataset.js";
import { queryConformanceDataset } from "./query-conformance-fixture.js";

function mutableDataset(): QueryDataset {
    return {
        rows: { ...queryConformanceDataset.rows },
        edges: Object.fromEntries(Object.entries(queryConformanceDataset.edges).map(([relation, edges]) => [relation, { ...edges }])) as QueryDataset["edges"],
        sourceLocalKeys: { ...queryConformanceDataset.sourceLocalKeys },
    };
}

describe("createQueryDataset", () => {
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
});
