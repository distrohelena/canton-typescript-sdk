# Live Query PQS Party Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed the live query parity fixture under a party visible to its configured PQS ingestion user.

**Architecture:** Add a strict resolver to the existing parity runtime module. It honors an authoritative explicit party, otherwise inspects public user-right DTOs and either allocates under any-party visibility, reuses exactly one listed party, or fails explicitly; the pruning fixture remains unchanged.

**Tech Stack:** TypeScript, Vitest, public Canton SDK user-management APIs.

---

### Task 1: Specify party resolution

**Files:**
- Modify: `tests/unit/live/live-query-model-fixture.test.ts`
- Modify: `tests/live/runtime/live-query-manager-factory.ts`

- [ ] Add failing unit tests for explicit override, blank-override fallback, default/overridden rights user, `canReadAsAnyParty` precedence over listed rights, one deduplicated `canReadAs`/`canActAs` party, no party, and ambiguous parties. Assert failure messages name the ledger user and `SDK_TEST_PQS_VISIBLE_PARTY` escape hatch.
- [ ] Run `rtk npm run test -- tests/unit/live/live-query-model-fixture.test.ts` and confirm failures are caused by the missing resolver.
- [ ] Implement `resolveLiveQueryParityPartyAsync` using `ListUserRightsRequest` and `UserRightKind`, with the strict precedence and errors in the approved design.
- [ ] Rerun the focused test and confirm every branch passes.

### Task 2: Integrate and verify

**Files:**
- Modify: `tests/live/runtime/live-query-manager-factory.ts`
- Verify unchanged: `tests/live/runtime/live-query-pruning-fixture.ts`

- [ ] Replace only parity's unconditional allocation with the resolver, then retain `grantLedgerUserActAsAsync` and existing seed commands.
- [ ] Run `rtk npm run test -- tests/unit/live/live-query-model-fixture.test.ts tests/unit/live/live-query-runtime-safety.test.ts tests/unit/smoke/package-shape.test.ts`; expect all tests to pass.
- [ ] Run `rtk npx eslint tests/live/runtime/live-query-manager-factory.ts tests/unit/live/live-query-model-fixture.test.ts`; expect no issues.
- [ ] Run `rtk npm run build`; expect exit code 0 for the ESM/CJS build.
- [ ] Run `rtk git diff --check`; expect exit code 0 with no output.
- [ ] Inspect the diff to confirm pruning still performs its own dedicated allocation.
- [ ] Run `rtk git add tests/live/runtime/live-query-manager-factory.ts tests/unit/live/live-query-model-fixture.test.ts docs/superpowers/plans/2026-08-03-live-query-pqs-party-visibility-implementation-plan.md && rtk git commit -m "fix: seed parity under PQS-visible party"`.
