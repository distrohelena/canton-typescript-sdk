import { describe, expect, it } from "vitest";
import { createQueryDataset, IncompleteQueryEdgeError, relatedQueryRows, type QueryDataset } from "../../../src/query/canonical/query-dataset.js";
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
        (input.rows.contracts as Record<string, unknown>[])[0]!.contractId = "changed";

        const bucket = relatedQueryRows(input, "contracts", input.rows.contracts[0]!, "exercises");

        expect(bucket.map((row) => row.contractId)).toEqual(["C1"]);
        expect(() => (bucket as Record<string, unknown>[]).push({})).toThrow();
        expect(() => relatedQueryRows(input, "contracts", { contractId: "alien" }, "exercises")).toThrow("does not belong");
        expect(() => relatedQueryRows(first, "contracts", { contractId: "C1" }, "exercises")).toThrow("does not belong");
        expect(relatedQueryRows(first, "contracts", first.rows.contracts[0]!, "exercises").map((row) => row.contractId)).toEqual(["C1"]);
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

        const invalidCompleteness = mutableDataset();

        (invalidCompleteness.edges.contracts as Record<string, { complete: unknown }>).createdTransaction.complete = "no";
        expect(() => createQueryDataset(invalidCompleteness)).toThrow("contracts.createdTransaction completeness marker is invalid");
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

    it("supports frozen private edge keys without adding join metadata to public rows", () => {
        const input = mutableDataset();

        input.rows = {
            ...input.rows,
            contracts: [{ ...input.rows.contracts[0]!, packageId: "creation-package" }],
            contractTypes: [{ ...input.rows.contractTypes[0]!, packageName: "representative-package" }],
            exercises: [],
        };
        (input.edges.contracts as Record<string, unknown>).contractType = {
            privateKeys: {
                source: [["creation-package", "App", "Asset"]],
                target: [["creation-package", "App", "Asset"]],
            },
        };

        const dataset = createQueryDataset(input);

        expect(relatedQueryRows(dataset, "contracts", dataset.rows.contracts[0]!, "contractType")).toEqual([dataset.rows.contractTypes[0]]);
        expect(Object.keys(dataset.rows.contracts[0]!)).toEqual(["contractId", "templateId", "packageId", "payload", "witnesses", "createdEventOffset", "createdAt", "archivedEventOffset", "archivedAt", "active"]);
        expect(Object.isFrozen(dataset.edges.contracts!.contractType!.privateKeys!.source)).toBe(true);
        expect(() => (dataset.edges.contracts!.contractType!.privateKeys!.source as unknown[]).push([])).toThrow();
    });

    it("rejects private edge key arity, lengths, and duplicate to-one targets", () => {
        const short = mutableDataset();

        (short.edges.contracts as Record<string, unknown>).contractType = {
            privateKeys: { source: [], target: [["one"]] },
        };
        expect(() => createQueryDataset(short)).toThrow("private source length differs");

        const duplicate = mutableDataset();

        duplicate.rows = { ...duplicate.rows, contractTypes: [...duplicate.rows.contractTypes, { ...duplicate.rows.contractTypes[0]!, pk: "99" }] };
        (duplicate.edges.contracts as Record<string, unknown>).contractType = {
            privateKeys: { source: [["one"], ["two"], ["three"]], target: [["one"], ["two"], ["one"]] },
        };
        expect(() => createQueryDataset(duplicate)).toThrow("multiple to-one targets");
    });

    it("permits empty private joins and resolves private keys from raw precompiled rows", () => {
        const empty = mutableDataset();

        empty.rows = { ...empty.rows, contracts: [], contractTypes: [], exercises: [] };
        (empty.edges.contracts as Record<string, unknown>).contractType = { privateKeys: { source: [], target: [] } };
        (empty.edges.contractTypes as Record<string, unknown>).contracts = { privateKeys: { source: [], target: [] } };
        expect(createQueryDataset(empty)).toBeTruthy();

        const raw = mutableDataset();

        (raw.edges.contracts as Record<string, unknown>).contractType = {
            privateKeys: { source: [["pkg-app", "App", "Asset"], ["pkg-app", "App", "Asset"], ["pkg-other", "Other", "Note"]], target: [["pkg-app", "App", "Asset"], ["pkg-other", "Other", "Note"]] },
        };
        expect(relatedQueryRows(raw, "contracts", raw.rows.contracts[0]!, "contractType")).toEqual([expect.objectContaining({ pk: "10" })]);
    });

    it("rejects missing required to-one targets for public and private edge keys", () => {
        const missingPublic = mutableDataset();

        missingPublic.rows = {
            ...missingPublic.rows,
            contracts: [{ ...missingPublic.rows.contracts[0]!, createdEventOffset: "999" }, ...missingPublic.rows.contracts.slice(1)],
        };
        expect(() => createQueryDataset(missingPublic)).toThrow("contracts.createdTransaction has no target");

        const missingPrivate = mutableDataset();

        (missingPrivate.edges.contracts as Record<string, unknown>).contractType = {
            privateKeys: {
                source: [["missing"], ["missing"], ["missing"]],
                target: [["present-one"], ["present-two"]],
            },
        };
        expect(() => createQueryDataset(missingPrivate)).toThrow("contracts.contractType has no target");
    });

    it("permits explicitly incomplete required edges but fails deterministically when traversed", () => {
        const input = mutableDataset();

        input.rows = {
            ...input.rows,
            contracts: [{ ...input.rows.contracts[0]!, createdEventOffset: "999" }, ...input.rows.contracts.slice(1)],
        };
        (input.edges.contracts as Record<string, unknown>).createdTransaction = {
            from: ["createdEventOffset"],
            to: ["ix"],
            complete: false,
        };

        const dataset = createQueryDataset(input);

        expect(dataset.rows.contracts[0]).not.toHaveProperty("createdTransactionComplete");
        expect(() => relatedQueryRows(dataset, "contracts", dataset.rows.contracts[0]!, "createdTransaction")).toThrow(IncompleteQueryEdgeError);
        expect(() => relatedQueryRows(dataset, "contracts", dataset.rows.contracts[0]!, "createdTransaction")).toThrow("Dataset edge contracts.createdTransaction is incomplete");
    });
});
