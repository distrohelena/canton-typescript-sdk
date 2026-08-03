# Read-only Pruning Preflight Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add example 97, a gRPC-only, non-mutating preflight that classifies a required operator offset against sampled participant pruning watermarks without claiming an unobserved offset is queryable.

**Architecture:** An example-private pure module parses canonical decimal offsets with `BigInt`, checks only time-valid sampled invariants, classifies from the later participant watermark, and normalizes independent participant-admin context. A dependency-injected workflow owns one deadline and exact request order; a thin runner creates and disposes the normal client.

**Tech Stack:** TypeScript ESM, Vitest, public Canton TypeScript SDK, generated protobuf-ts `ledgerApiV2` and `comDigitalasset`, authenticated local Canton 3.5.7/3.5.8 participants.

---

## Preconditions

- Read `docs/superpowers/specs/2026-08-02-pruning-preflight-example-design.md`, examples 95 and 96, `examples/shared/localnet.ts`, and `examples/shared/update-stream-lifecycle.ts`; the design wins on conflict.
- Preserve the user-owned `package.json` version hunk and four untracked July plans. Use `apply_patch` for every edit; all shell commands start with `rtk`; direct Vitest uses `rtk proxy npx vitest`.
- Work on `main` as authorized. Do not modify `src/`, generated protobuf code, public exports, `cn-quickstart`, the DAR, localnet startup, or package contents. No SDK extraction is in scope.
- TDD is mandatory: execute each RED command before implementation and its corresponding GREEN command afterward. Run `rtk npm run examples:check` after each implementation task.
- The production program must never call pruning or a schedule mutation, submit a command, allocate/read a party, upload/read a DAR, query an update, or select behavior by participant version.

## Files

- Create: `examples/shared/pruning-preflight.ts` — pure exact decimal parsing, sampled invariants, three-way classification, and read-only context normalization.
- Create: `tests/unit/examples/pruning-preflight.test.ts` — pure decision, malformed data, and oneof tests.
- Create: `examples/shared/pruning-preflight-workflow.ts` — one-deadline, generated-request, ordered read-only workflow and bounded logging.
- Create: `tests/unit/examples/pruning-preflight-workflow.test.ts` — request ordering, deadlines, no mutation/retry, logs, and error/disposal tests.
- Create: `examples/97-pruning-preflight.ts` — thin standalone executable.
- Modify: `tests/unit/examples/application-example-sources.test.ts` — AST/source contracts for example 97.
- Modify: `package.json` and `README.md` — exact script and operator documentation only.

### Task 1: Build pure preflight assertions

**Files:** Create `examples/shared/pruning-preflight.ts`, `tests/unit/examples/pruning-preflight.test.ts`

- [ ] Write failing tests for `parseRequiredPositiveExampleOffset(environment)`: absent, empty, whitespace, `0`, signed, decimal, negative, and leading-zero values fail; canonical `1` and a value beyond `Number.MAX_SAFE_INTEGER` return the unchanged text plus exact `BigInt`.
- [ ] Write failing tests for response parsing: only `0` or canonical positive decimal strings are accepted. Require `BigInt`, not `Number`, by exercising adjacent values beyond the safe-integer boundary.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/pruning-preflight.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Implement `parseRequiredPositiveExampleOffset`, a private canonical non-negative parser, and a typed snapshot normalizer. Keep the environment error explicit: `SDK_EXAMPLE_OFFSET must be a positive decimal integer.`
- [ ] Add failing tests for these and only these sampled invariants: each all-divulged watermark is at or before its participant watermark; both before watermarks are at or before the later-read ledger end; and both before watermarks are no greater than their corresponding after watermark. Cover every violation and a valid race where later participant watermark exceeds the saved ledger end.
- [ ] Implement the invariant checker. Do not require later watermarks to be `<= ledgerEnd`, and do not compare raw decimal strings.
- [ ] Add failing tests for exactly three classification kinds: `alreadyPruned` when `target <= after.participant` (including equality and a target beyond the saved ledger end), `beyondLedgerEnd` otherwise when target is above the saved end, and `notObservedPruned` otherwise. Require the final result to include separately named before/after participant and all-divulged watermarks, saved ledger end, target, and the non-queryability caveat for `notObservedPruned`.
- [ ] Implement the priority-ordered `classifyPruningPreflight` union. It must use only the later participant watermark for `alreadyPruned`; all-divulged data must not affect the result.
- [ ] Add failing tests for context normalization: absent schedule/participant schedule, configured schedule, `pruneInternallyOnly`, safe-pruning `safePruningOffset`, `noSafePruningOffset`, empty oneof, and malformed/noncanonical safe offset. Assert changing any context cannot change an already-calculated classification.
- [ ] Implement bounded context normalization without exposing cron or duration values. Validate a present safe offset with the same canonical non-negative parser, but do not compare it to target, ledger end, or participant watermarks.
- [ ] Run GREEN: `rtk proxy npx vitest run tests/unit/examples/pruning-preflight.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check` and `rtk git diff --check`.
- [ ] Commit only Task 1 files: `git add examples/shared/pruning-preflight.ts tests/unit/examples/pruning-preflight.test.ts && git commit -m "feat: add pruning preflight assertions"`.

### Task 2: Implement the ordered read-only workflow and runner

**Files:** Create `examples/shared/pruning-preflight-workflow.ts`, `tests/unit/examples/pruning-preflight-workflow.test.ts`, `examples/97-pruning-preflight.ts`

- [ ] Write failing dependency-injected workflow tests with state-service responses, pruning-service context responses, a clock/deadline factory, environment, and logger. Assert the one `OperationDeadline` is created first, then the required environment target is parsed, and every call receives a fresh request-options object from that same deadline.
- [ ] In RED tests, assert exact authoritative call order with generated factories and no interleaving: `GetLatestPrunedOffsetsRequest.create()`, `GetLedgerEndRequest.create()`, then `GetLatestPrunedOffsetsRequest.create()`. Verify an error short-circuits all later reads.
- [ ] Add RED tests proving only after the trio succeeds the workflow calls `GetScheduleRequest.create()`, `GetParticipantScheduleRequest.create()`, and `GetSafePruningOffsetRequest.create({ beforeOrAt, ledgerEnd: savedLedgerEndText })`, each with fresh options. Inject a deterministic current `Date`, assert exact seconds/nanos, reject a malformed clock before the safe-pruning call, and ensure commitment state remains absent.
- [ ] Add RED tests for one result log sequence containing only target, before/after participant watermark, before/after all-divulged watermark, saved ledger end, classification, the explicit `notObservedPruned is not proven queryable` notice when applicable, schedule configured booleans, participant `pruneInternallyOnly` when present, and safe oneof kind/validated offset when present. Assert logger calls never receive raw responses, credentials, endpoints, cron, duration, or full errors.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/pruning-preflight-workflow.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Implement `runPruningPreflightWorkflowAsync` with a strict `Pick<CantonClient, "stateService" | "pruningService">` dependency or equivalent injected public-client shape plus an injected current-clock dependency. Convert only a valid current `Date` into exact protobuf Timestamp seconds/nanos for `beforeOrAt` and send it with the saved ledger end, leaving commitment state absent. Import generated requests only from `@distrohelena/canton-typescript-sdk/protobuf`; call no mutator, update service, fixture helper, party helper, or compatibility/version helper. Do not retry, sleep, poll, catch-and-classify errors, or create a second deadline.
- [ ] Implement the thin runner through `runExampleAsync`, `createExampleClient`, and `runClientWorkflowWithDisposalAsync`. It creates no party or durable state.
- [ ] Add RED tests for runner/workflow primary-error preservation and exact-once client disposal; implement with the existing disposal helper rather than a new lifecycle mechanism. The live proof must use the same timestamp-plus-ledger-end request shape without a participant-version branch.
- [ ] Run GREEN: `rtk proxy npx vitest run tests/unit/examples/pruning-preflight-workflow.test.ts tests/unit/examples/pruning-preflight.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check` and `rtk git diff --check`.
- [ ] Commit only Task 2 files: `git add examples/shared/pruning-preflight-workflow.ts tests/unit/examples/pruning-preflight-workflow.test.ts examples/97-pruning-preflight.ts && git commit -m "feat: add pruning preflight example"`.

### Task 3: Lock source contracts and document execution

**Files:** Modify `tests/unit/examples/application-example-sources.test.ts`, `package.json`, `README.md`

- [ ] Write failing AST/source-contract tests for example 97 requiring `OperationDeadline`, `SDK_EXAMPLE_OFFSET`, `BigInt`, exactly two `getLatestPrunedOffsetsAsync` calls around one `getLedgerEndAsync`, fresh `createRequestOptions`, generated ledger and participant-admin request factories, `getScheduleAsync`, `getParticipantScheduleAsync`, `getSafePruningOffsetAsync`, oneof handling, `runClientWorkflowWithDisposalAsync`, and the literal non-queryability caveat.
- [ ] Add negative source assertions forbidding version/release/container branches, JSON transport, `Number(` offset conversion, `PruneRequest`, schedule setters/clearers, update/command/contract/party services, fixture/DAR helpers, retry/sleep/polling, and raw response logging. Match capability identifiers narrowly so harmless prose and type names do not create false positives.
- [ ] Run RED: `rtk proxy npx vitest run tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Add `example:workflow:pruning-preflight` as `npm run build && node --loader ts-node/esm examples/97-pruning-preflight.ts`, preserving the user-owned package version change. In README document required canonical positive `SDK_EXAMPLE_OFFSET`, normal endpoint/auth/timeout variables plus participant-admin credential, no mutation/durable state, exact classification semantics, separate all-divulged/schedule/safe context, `notObservedPruned` caveat, and unchanged 3.5.7/3.5.8 support.
- [ ] Run GREEN: `rtk proxy npx vitest run tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check` and `rtk git diff --check`.
- [ ] Commit only Task 3 files: `git add tests/unit/examples/application-example-sources.test.ts package.json README.md && git commit -m "docs: document pruning preflight example"`. Before committing, verify the staged `package.json` diff excludes its pre-existing version hunk.

### Task 4: Prove both participant paths without mutation

**Files:** No tracked source changes; keep sanitized evidence only under ignored `.superpowers/sdd/`.

- [ ] Run focused unit proof:
  `rtk proxy npx vitest run tests/unit/examples/pruning-preflight.test.ts tests/unit/examples/pruning-preflight-workflow.test.ts tests/unit/examples/application-example-sources.test.ts tests/unit/services/state-service-client.test.ts tests/unit/grpc/grpc-batch1-read-services.test.ts tests/unit/grpc/grpc-batch5-read-services.test.ts --maxWorkers=1 --testTimeout=15000`
- [ ] Run `rtk npm run examples:check`, a clean sequential `rtk npm run build`, `rtk npm test`, `rtk npm run test:live`, changed-TypeScript ESLint, `rtk npm run verify:pack`, `rtk npm pack --dry-run`, and `rtk git diff --check`. If full lint is run, report its existing baseline separately rather than claiming it clean.
- [ ] For each authenticated sidecar, run the package script twice with no mutation: a default-target case in which the private harness derives the current positive ledger end and passes it explicitly as `SDK_EXAMPLE_OFFSET`, and an explicit-target case in which it passes a different positive canonical decimal (normally that snapshot plus one). Do this for 3.5.7 and 3.5.8; child-scope refreshed credentials and never print them.
- [ ] Record eight sanitized rows: release/path, source commit/common path, target class, target, before/ledger-end/after participant and all-divulged values, classification, schedule presence, participant internal-only flag when present, and safe oneof kind/offset when present. Do not record endpoints, tokens, headers, parties, raw protobufs, cron/durations, raw errors, or state-changing effects.
- [ ] Final scope check: only the planned example/tests/docs files are committed; user dirt remains untouched; both versions executed the same source path; no participant data, schedule, topology, contract, package, or ledger state was changed.
