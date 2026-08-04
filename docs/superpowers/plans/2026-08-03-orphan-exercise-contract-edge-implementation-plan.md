# Orphan Exercise Contract Edge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a complete canonical query dataset to contain an exercise whose contract is absent, with an included contract shaped as `null`.

**Architecture:** Keep the edge complete and change only the canonical schema's nullability metadata for `exercises.contract`. Exercise includes then use the existing evaluator behavior for known-absent nullable to-one targets, matching PQS without changing public result types or fabricating ledger data.

**Tech Stack:** TypeScript, Vitest, ESLint, npm ESM/CJS build

---

### Task 1: Make the exercise-to-contract edge nullable

**Files:**
- Modify: `tests/unit/query/query-dataset.test.ts`
- Modify: `src/query/canonical/query-schema.ts`

- [ ] **Step 1: Write the failing regression test**

Add this test inside `describe("createQueryDataset", ...)`:

```ts
it("permits a complete orphan exercise and includes its absent contract as null", () => {
    const input = mutableDataset();

    input.rows = {
        ...input.rows,
        contracts: input.rows.contracts.filter((row) => row.contractId !== "C2"),
    };

    expect(input.edges.exercises?.contract?.complete).toBeUndefined();

    const dataset = createQueryDataset(input);

    const result = new InMemoryQueryEvaluator().execute(dataset, normalizeFindMany("exercises", {
        where: { contractId: { equals: "C2" } },
        include: { contract: true },
    }));

    expect(result).toEqual([
        expect.objectContaining({ contractId: "C2", contract: null }),
    ]);
});
```

- [ ] **Step 2: Run the regression to verify RED**

Run: `rtk npm run test -- tests/unit/query/query-dataset.test.ts`

Expected: FAIL at `createQueryDataset(input)` with `Dataset exercises.contract has no target`.

- [ ] **Step 3: Implement the minimal schema change**

In `src/query/canonical/query-schema.ts`, change only the exercise contract edge:

```ts
contract: { target: "contracts", cardinality: "one", nullable: true },
```

Do not set `complete: false` and do not change `ExerciseResult.contract`.

- [ ] **Step 4: Run the regression to verify GREEN**

Run: `rtk npm run test -- tests/unit/query/query-dataset.test.ts`

Expected: PASS, including the orphan exercise regression.

- [ ] **Step 5: Run focused query coverage**

Run: `rtk npm run test -- tests/unit/query/query-dataset.test.ts tests/unit/query/in-memory-query-evaluator.test.ts tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts`

Expected: PASS.

- [ ] **Step 6: Run the full offline query suite**

Run: `rtk npm run test -- tests/unit/query`

Expected: PASS.

- [ ] **Step 7: Run static verification**

Run: `rtk npx eslint src/query/canonical/query-schema.ts tests/unit/query/query-dataset.test.ts`

Expected: exit 0 with no lint findings.

Run: `rtk npm run build`

Expected: both ESM and CJS builds succeed.

- [ ] **Step 8: Review and commit the scoped change**

Run: `rtk git diff --check && rtk git diff -- src/query/canonical/query-schema.ts tests/unit/query/query-dataset.test.ts docs/superpowers/plans/2026-08-03-orphan-exercise-contract-edge-implementation-plan.md`

Expected: no whitespace errors; only the regression, one schema boolean, and this plan are changed.

```bash
rtk git add src/query/canonical/query-schema.ts tests/unit/query/query-dataset.test.ts docs/superpowers/plans/2026-08-03-orphan-exercise-contract-edge-implementation-plan.md
rtk git commit -m "fix: make orphan exercise contract nullable"
```
