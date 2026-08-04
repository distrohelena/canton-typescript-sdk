# gRPC Orphan Exercise Projection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materialize valid projected exercise history when the corresponding contract creation is not visible.

**Architecture:** Relax only the exercised-event materialization branch. Orphans use their exercise template for `contractTpePk` and produce no contract lifecycle state; known contracts retain creation-template linking, upgrade behavior, and contradiction checks.

**Tech Stack:** TypeScript, Vitest, generated Ledger API protobuf events.

---

### Task 1: Project orphan exercises

**Files:**
- Modify: `src/query/grpc/grpc-relation-mapper.ts`
- Test: `tests/unit/query/grpc-relation-mapper.test.ts`

- [ ] Replace the old unknown-contract rejection assertion with a consuming orphan regression asserting one transaction, event, and exercise; zero contracts and creation identities; exercise-derived contract/exercise type and package identities; and `contractTpePk` matching the exercise-template contract type. Add a second regression proving multiple consuming orphans for the same unseen contract materialize independently with no hidden lifecycle state.
- [ ] Add an explicit known-lifecycle contradiction test with create → consuming exercise → second consuming exercise, expecting the already-archived error.
- [ ] Run `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts`; expect RED with the current unknown-contract `ValidationError`.
- [ ] Change the exercise loop so `target === undefined` still emits the exercise row using the exercise template for `contractTpePk`; guard known-target archived checks and consuming lifecycle updates behind a real target.
- [ ] Rerun `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts`; expect all tests to pass, including upgrade and explicit known-lifecycle contradiction coverage.
- [ ] Run `rtk npm run test -- tests/unit/query/grpc-relation-mapper.test.ts tests/unit/query/grpc-query-client.test.ts tests/unit/query/grpc-query-snapshot-reader.test.ts`; expect all focused mapper/client/snapshot tests to pass.
- [ ] Run `rtk npm run test -- tests/unit/query`; expect the full offline query suite to pass.
- [ ] Run `rtk npx eslint src/query/grpc/grpc-relation-mapper.ts tests/unit/query/grpc-relation-mapper.test.ts`; expect no issues.
- [ ] Run `rtk npm run build`; expect exit code 0.
- [ ] Run `rtk git diff --check`; expect exit code 0.
- [ ] Run `rtk git add src/query/grpc/grpc-relation-mapper.ts tests/unit/query/grpc-relation-mapper.test.ts docs/superpowers/plans/2026-08-03-grpc-orphan-exercise-projection-implementation-plan.md && rtk git commit -m "fix: materialize orphan projected exercises"`.
