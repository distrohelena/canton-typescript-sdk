# Update Lookup Reconciliation Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add example 96, a gRPC-only proof that one streamed Message transaction is reconciled exactly by update ID and offset on Canton 3.5.7 and 3.5.8.

**Architecture:** Reuse an example-private generated Message `UpdateFormat` builder for stream and unary requests. A fixture-specific shared assertion module captures and compares exact ACS-delta transactions; a dependency-injected workflow owns the one deadline, ordering, and bounded output; the entry point only creates/disposes the client.

**Tech Stack:** TypeScript ESM, Vitest, generated protobuf-ts `ledgerApiV2`, public `OperationDeadline`, existing fixture/workflow helpers, authenticated local 3.5.7/3.5.8 participants.

---

## Preconditions

- Read `docs/superpowers/specs/2026-08-02-update-lookup-reconciliation-example-design.md` and the existing examples 92, 94, and 95 first; the design wins on conflict.
- Preserve `package.json`'s user-owned version hunk and the four untracked July plans. Use `apply_patch` for all edits; all shell commands start with `rtk`; stage only named files.
- Work on `main` as authorized. Do not modify `cn-quickstart`, `src/`, generated protobuf files, public exports, JSON transport, or the DAR.
- TDD is mandatory: execute each RED command before implementation, then its GREEN command. Run `rtk npm run examples:check` after each implementation task.

## Files

- Modify: `examples/shared/ledger-requests.ts` — export a generated Message UpdateFormat builder and retain existing stream request behavior.
- Modify: `tests/unit/examples/ledger-requests.test.ts` — lock the format factory and existing stream request shape.
- Create: `examples/shared/update-lookup-reconciliation.ts` — exact captured-transaction extraction and lookup equivalence assertions.
- Create: `tests/unit/examples/update-lookup-reconciliation.test.ts` — structural and negative assertion tests.
- Create: `examples/shared/update-lookup-reconciliation-workflow.ts` — one-deadline stream/submit/lookups workflow.
- Create: `tests/unit/examples/update-lookup-reconciliation-workflow.test.ts` — ordering, options, no-retry, cleanup, logging tests.
- Create: `examples/96-update-lookup-reconciliation.ts` — thin executable runner.
- Modify: `tests/unit/examples/application-example-sources.test.ts` — AST/source contracts for example 96.
- Modify: `package.json` and `README.md` — exact workflow script/documentation only.

### Task 1: Share the generated Message update format

**Files:** Modify `examples/shared/ledger-requests.ts`, `tests/unit/examples/ledger-requests.test.ts`

- [ ] Write failing tests for `buildMessageUpdateFormat({ party, templateId })`: it validates all ID parts, builds `includeTransactions`, `ACS_DELTA`, `verbose: true`, a single party/template filter, `#packageName`, and no raw hash.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/ledger-requests.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Extract the current private format construction into that exported examples-only builder; make `buildUpdatesRequest` call it without changing its public behavior.
- [ ] Run GREEN: `rtk proxy npx vitest run tests/unit/examples/ledger-requests.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check` and `rtk git diff --check`.
- [ ] Commit only these files: `git add examples/shared/ledger-requests.ts tests/unit/examples/ledger-requests.test.ts && git commit -m "refactor: share Message update format examples"`.

### Task 2: Capture and compare exact update transactions

**Files:** Create `examples/shared/update-lookup-reconciliation.ts`, `tests/unit/examples/update-lookup-reconciliation.test.ts`

- [ ] Write failing tests for an extractor that skips unrelated updates but returns one only when a generated `GetUpdatesResponse` is a transaction with nonempty update ID/offset/synchronizer ID and exactly one strict, labelled self-party Message created event for the known contract/text/template. Cover wrong oneof, duplicate matching created events, wrong ID/template/field labels/kinds/values/visibility, and absent identifiers.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/update-lookup-reconciliation.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Implement minimal fixture-specific extraction using `ledgerApiV2.*.is` and `assertExactCreatedMessagePayload({ requireFieldLabels: true })`; retain the captured transaction fields needed by reconciliation.
- [ ] Add failing tests that `GetUpdateResponse` lookup transactions exactly match the captured stream transaction's update ID, offset, synchronizer ID, command ID, single created Message event, payload, template, and visibility; reject reassignment/topology/empty and every mismatch.
- [ ] Run RED, implement the generated-response assertion, then run GREEN with the same command.
- [ ] Run `rtk npm run examples:check`, `rtk git diff --check`, and commit only Task 2 files with `feat: add update lookup reconciliation assertions`.

### Task 3: Implement the single-deadline workflow and runner

**Files:** Create `examples/shared/update-lookup-reconciliation-workflow.ts`, `tests/unit/examples/update-lookup-reconciliation-workflow.test.ts`, `examples/96-update-lookup-reconciliation.ts`

- [ ] Write failing workflow tests using injected client/fixture/party/compatibility/deadline/run-id/logger dependencies. Assert one deadline is created first; setup completes before one saved nonblank ledger end; the single generated format is shared; `iterator.next()` is called before one create submission; unrelated stream updates are skipped; ID then offset lookup uses generated requests and fresh deadline options; no request is retried.
- [ ] Include RED tests for iterator `return()` exact-once cleanup and for cleanup failure not masking stream/submit/lookup primary errors; assert an otherwise-successful cleanup failure surfaces.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/update-lookup-reconciliation-workflow.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Implement the dependency-injected workflow using `submitAndWaitForTransactionAsync`, generated `GetUpdatesRequest`, `GetUpdateByIdRequest`, and `GetUpdateByOffsetRequest`. Use `runClientWorkflowWithDisposalAsync` in the runner and existing localnet defaults. Never sleep, poll, use a second `RequestOptions`, version branch, JSON call, or hash lookup.
- [ ] Run GREEN: `rtk proxy npx vitest run tests/unit/examples/update-lookup-reconciliation-workflow.test.ts tests/unit/examples/update-lookup-reconciliation.test.ts tests/unit/examples/ledger-requests.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check` and `rtk git diff --check`; commit only Task 3 files with `feat: add update lookup reconciliation example`.

### Task 4: Lock source contracts and document execution

**Files:** Modify `tests/unit/examples/application-example-sources.test.ts`, `package.json`, `README.md`

- [ ] Write failing AST/source-contract tests requiring example 96's one deadline, post-setup `getLedgerEndAsync`, saved offset validation, `iterator.next()` before submit, `ACS_DELTA`, `#packageName`, verbose format, `getUpdateByIdAsync`, `getUpdateByOffsetAsync`, lifecycle disposal, and bounded safe output.
- [ ] Add negative source assertions for `getUpdateByHashAsync`, JSON transport, raw package hash selector, `sleep`/polling/retry, and participant-version conditional branches.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Add `example:workflow:update-lookup-reconciliation` using `npm run build && node --loader ts-node/esm examples/96-update-lookup-reconciliation.ts`; document prerequisites, durable-state warning, exact reconciliation purpose, and 3.5.7/3.5.8 tested status. Preserve the package version hunk.
- [ ] Run GREEN: `rtk proxy npx vitest run tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check`, `rtk git diff --check`, and commit only the three Task 4 files with `docs: document update lookup reconciliation example`.

### Task 5: Prove the common participant path

**Files:** No tracked source changes; keep sanitized evidence only under ignored `.superpowers/sdd/`.

- [ ] Run focused unit proof:
  `rtk proxy npx vitest run tests/unit/examples/update-lookup-reconciliation.test.ts tests/unit/examples/update-lookup-reconciliation-workflow.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check`, then `rtk npm run build`, `rtk npm test`, `rtk npm run test:live`, changed-TypeScript ESLint, `rtk npm run verify:pack`, `rtk npm pack --dry-run`, and `rtk git diff --check`. Report full-lint failures only as the existing baseline if encountered.
- [ ] Run the exact package script against each authenticated sidecar without exposing credentials: 3.5.7 default party, 3.5.7 explicit party, 3.5.8 default party, and 3.5.8 explicit party. Refresh credentials only within the child command.
- [ ] Record four sanitized evidence rows: participant release/path, source commit/common path, mode, run marker, actor, contract ID, update ID, offset, synchronizer ID, and both lookup confirmations. Reject any evidence that contains tokens, authorization headers, endpoints, raw request/response, DAR bytes, or transaction hashes.
- [ ] Final scope check: only planned tracked files are committed; user dirt remains untouched; both versions used the same implementation with no hash or version branch.
