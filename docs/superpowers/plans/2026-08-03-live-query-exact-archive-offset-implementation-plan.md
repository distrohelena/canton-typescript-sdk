# Live Query Exact Archive Offset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make parity watermark readiness target the exact visible Archive transaction offset.

**Architecture:** Add one archive helper to the existing live-query runtime module. It returns a strictly validated generated transaction offset, which parity stores directly; pruning remains unchanged.

**Tech Stack:** TypeScript, Vitest, generated protobuf-ts `Transaction`.

---

### Task 1: Exact Archive offset

**Files:**
- Modify: `tests/live/runtime/live-query-manager-factory.ts`
- Test: `tests/unit/live/live-query-model-fixture.test.ts`
- Verify unchanged: `tests/live/runtime/live-query-pruning-fixture.ts`

- [ ] Add a failing success test using `Transaction.create({ offset: "157" })` and malformed-response cases for missing transaction, empty, zero, signed, and nonnumeric offsets. Assert every malformed case rejects with the explicit live-fixture offset error rather than a raw `TypeError`.
- [ ] Run `rtk npm run test -- tests/unit/live/live-query-model-fixture.test.ts`; expect failure because the archive helper is missing.
- [ ] Implement `archiveLiveIouAsync` with `submitAndWaitForTransactionAsync` and the existing Archive request. Structurally narrow the response's `unknown` transaction to a non-null object before reading `offset`, then require `/^[1-9]\d*$/`; all malformed shapes throw the explicit live-fixture offset error.
- [ ] Replace parity's Archive submission and later ledger-end read with the helper's exact returned offset.
- [ ] Rerun the focused test; expect all cases to pass.
- [ ] Run `rtk npm run test -- tests/unit/live/live-query-model-fixture.test.ts tests/unit/live/live-query-runtime-safety.test.ts tests/unit/smoke/package-shape.test.ts`; expect all tests to pass.
- [ ] Run `rtk npx eslint tests/live/runtime/live-query-manager-factory.ts tests/unit/live/live-query-model-fixture.test.ts`; expect no issues.
- [ ] Run `rtk npm run build`; expect exit code 0.
- [ ] Run `rtk git diff --check && rtk git diff --exit-code -- tests/live/runtime/live-query-pruning-fixture.ts`; expect exit code 0 and no pruning diff.
- [ ] Run `rtk git add tests/live/runtime/live-query-manager-factory.ts tests/unit/live/live-query-model-fixture.test.ts docs/superpowers/plans/2026-08-03-live-query-exact-archive-offset-implementation-plan.md && rtk git commit -m "fix: use exact parity archive offset"`.
