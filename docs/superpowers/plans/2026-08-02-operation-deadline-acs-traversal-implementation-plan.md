# Operation Deadline and Bounded ACS Traversal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a monotonic operation-wide timeout and safe, lazy, bounded raw ACS-page traversal, then move examples 60 and 90--93 onto those SDK APIs.

**Architecture:** `OperationDeadline` owns a single stateful absolute deadline and creates a fresh `RequestOptions` at each dispatch. `StateServiceClient` owns generic paging and validates snapshot/token/bound invariants while yielding unmodified generated responses; examples retain only fixture-specific filtering and assertions. `GrpcContractQueryClient` is deliberately not changed: its current query API cannot express a caller-selected total budget or page/contract bounds, so choosing hidden defaults would change public query behavior.

**Tech Stack:** TypeScript (strict), Vitest, protobuf-ts generated Ledger API v2 messages, gRPC/JSON transports, npm, ESLint.

---

## Delivery rules and file map

Work directly on `main` only after confirming the extraction design is the supplied `docs/superpowers/specs/2026-08-02-operation-deadline-acs-traversal-design.md`. Preserve the pre-existing modified `package.json` and the four untracked `2026-07-31` plan files: never reset, restore, stage, or include them in any commit. All shell commands below are deliberately `rtk`-prefixed; direct Vitest invocations use `rtk proxy npx vitest`.

| Path | Action | Responsibility |
| --- | --- | --- |
| `src/core/types/operation-deadline.ts` | Create | Validated monotonic total budget and fresh request options. |
| `src/core/types/active-contracts-traversal-options.ts` | Create | Validated, frozen caller-selected traversal limits. |
| `src/core/errors/active-contracts-traversal-error.ts` | Create | Coded SDK invariant/bound failure. |
| `src/services/state/state-service-client.ts` | Modify | Lazy raw gRPC-page iterator and all page invariants. |
| `src/index.ts` | Modify | Root exports for all three new public types. |
| `tests/unit/core/types/operation-deadline.test.ts` | Create | Deadline validation, monotonicity, expiration and fresh options. |
| `tests/unit/core/types/active-contracts-traversal-options.test.ts` | Create | Frozen options and coded error contracts. |
| `tests/unit/services/state-service-client.test.ts` | Modify | Fake-transport traversal behavior/invariants/laziness. |
| `tests/unit/json/json-batch1-read-services.test.ts` | Modify | Real JSON transport reaches its existing `NotSupportedError` only on first iteration. |
| `tests/unit/public/protobuf-exports.test.ts` | Modify | Package-root/public-export smoke coverage. |
| `examples/60-query-active-contracts.ts` | Modify | One operation deadline and early-break raw traversal. |
| `examples/90-atomic-create-and-exercise.ts` | Modify | New deadline/options and fixture-only ACS filtering. |
| `examples/shared/{application-fixture,ledger-requests,idempotent-command-retry-workflow,resume-update-stream-workflow,archive-and-stale-contract-workflow}.ts` | Modify | Fresh deadline request options; Message-only raw-page processing. |
| `examples/91-idempotent-command-retry.ts`, `examples/92-resume-update-stream.ts`, `examples/93-archive-and-stale-contract.ts` | Modify as required | Preserve existing wrapper/disposal behavior while adopting migrated helpers. |
| `examples/shared/workflow-deadline.ts` | Delete | Remove private deadline/idle policy. |
| `tests/unit/examples/{workflow-deadline,ledger-requests,idempotent-command-retry,resume-update-stream-workflow,archive-and-stale-contract-workflow,application-fixture,application-example-sources}.test.ts` | Modify/delete | Remove old helper assertions and prove the SDK boundary/example behavior. |
| `README.md` | Modify | gRPC-only lazy page traversal/public deadline and updated support text. |

At each implementation-task boundary, provide the supplied spec and changed-file diff to the externally arranged quality reviewer; do not create a second review orchestrator or independently dispatch reviewers. Only commit after that checkpoint has no blocking issue. Use `rtk git status --short` before each `git add` and add the enumerated files only.

### Task 1: Establish the operation-deadline public primitive (TDD)

**Files:**
- Create: `src/core/types/operation-deadline.ts`
- Create: `tests/unit/core/types/operation-deadline.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing public-contract tests before source.** Cover: `new OperationDeadline({ timeoutMs: 100, now })` samples `now` exactly once; first `remainingTimeoutMs()` returns a positive safe integer; a backward clock never increases the previously returned amount; an expired budget remains expired after rollback; each `createRequestOptions()` is a distinct `RequestOptions` with the current remainder; invalid/non-safe/nonpositive timeout, invalid clock samples, and `startedAt + timeoutMs` overflow all throw `ValidationError`; expiry throws the existing `TimeoutError`.

  ```ts
  const now = vi.fn().mockReturnValueOnce(1_000).mockReturnValueOnce(1_025);
  const deadline = new OperationDeadline({ timeoutMs: 100, now });
  expect(deadline.createRequestOptions()).toMatchObject({ timeoutMs: 75 });
  expect(deadline.createRequestOptions()).not.toBe(deadline.createRequestOptions());
  ```

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/core/types/operation-deadline.test.ts --maxWorkers=1`. Expected: FAIL because `OperationDeadline` is not exported/implemented.

- [ ] **Step 3: Apply the minimal implementation.** Use `apply_patch` to add this exact public shape:

  ```ts
  export class OperationDeadline {
      public constructor(init: { timeoutMs: number; now?: () => number });
      public remainingTimeoutMs(): number;
      public createRequestOptions(): RequestOptions;
  }
  ```

  Validate with `Number.isSafeInteger`; throw `new ValidationError(...)`, never `RangeError`. Capture `endsAtMs` from one constructor clock sample. On every later sample compute `Math.max(0, endsAtMs - safeNow())`, retain `Math.min(previousRemaining, computedRemaining)`, and throw `new TimeoutError(...)` at zero. `createRequestOptions()` must call `remainingTimeoutMs()` once and construct a new `RequestOptions({ timeoutMs })`. Add its root export beside `RequestOptions`/errors.

- [ ] **Step 4: Prove GREEN and refactor safely.** Run: `rtk proxy npx vitest run tests/unit/core/types/operation-deadline.test.ts --maxWorkers=1`. Expected: PASS. Extract only a private safe-integer clock validator if it removes duplication; rerun the same command and confirm PASS.

- [ ] **Step 5: Review and isolate the commit.** External quality checkpoint, then `rtk git add src/core/types/operation-deadline.ts src/index.ts tests/unit/core/types/operation-deadline.test.ts && rtk git commit -m "feat: add operation deadline"`.

### Task 2: Add immutable traversal configuration and a coded error (TDD)

**Files:**
- Create: `src/core/types/active-contracts-traversal-options.ts`
- Create: `src/core/errors/active-contracts-traversal-error.ts`
- Create: `tests/unit/core/types/active-contracts-traversal-options.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing tests.** Construct options using a real deadline and assert `Object.isFrozen(options)`, identity preservation of `deadline`, and immutable positive safe `maxPages`/`maxContracts`. Assert a missing/non-deadline value and zero, negative, fractional, `NaN`, or unsafe bounds produce `ValidationError`. Instantiate the error for each permitted code and assert it is a `CantonError`, exposes exactly that union code, and has a diagnostic message without tests branching on prose.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/core/types/active-contracts-traversal-options.test.ts --maxWorkers=1`. Expected: FAIL for absent exports/classes.

- [ ] **Step 3: Apply minimal source with `apply_patch`.** Implement

  ```ts
  export class ActiveContractsTraversalOptions {
      public readonly deadline: OperationDeadline;
      public readonly maxPages: number;
      public readonly maxContracts: number;
      public constructor(init: { deadline: OperationDeadline; maxPages: number; maxContracts: number }) {
          // validate; assign; Object.freeze(this)
      }
  }
  export class ActiveContractsTraversalError extends CantonError {
      public readonly code: "active-at-offset-mismatch" | "missing-active-at-offset" |
          "repeated-page-token" | "max-pages-exceeded" | "max-contracts-exceeded";
  }
  ```

  Use `instanceof OperationDeadline`, `ValidationError`, and `Object.freeze(this)`. Keep errors for invariant/bound failures only; no wrapping helper for transport, `NotSupportedError`, or timeout failures. Export both at package root.

- [ ] **Step 4: Prove GREEN/refactor.** Run the same focused command. Expected: PASS. Add no mutable setters or idle/polling policy; rerun after any message/helper cleanup.

- [ ] **Step 5: Review and commit only this slice.** `rtk git add src/core/types/active-contracts-traversal-options.ts src/core/errors/active-contracts-traversal-error.ts src/index.ts tests/unit/core/types/active-contracts-traversal-options.test.ts && rtk git commit -m "feat: add bounded ACS traversal options"`.

### Task 3: Implement the lazy raw-page happy path and JSON rejection (TDD)

**Files:**
- Modify: `src/services/state/state-service-client.ts`
- Modify: `tests/unit/services/state-service-client.test.ts`
- Modify: `tests/unit/json/json-batch1-read-services.test.ts`

- [ ] **Step 1: Add failing state-client tests first.** With a fake `getActiveContractsPageAsync`, prove merely constructing `getActiveContractsPagesAsync(request, options)` invokes neither validation nor transport; first `next()` invokes exactly one page call with a fresh deadline option; yielded value is the exact generated `GetActiveContractsPageResponse` object; first request preserves `eventFormat`, `maxPageSize`, and allowed explicit `activeAtOffset`; terminal empty/absent token stops. In the JSON suite instantiate/use the real JSON transport path, construct the iterable successfully, and assert first iteration rejects the unchanged `NotSupportedError` (not a fallback stream/collection).

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/services/state-service-client.test.ts tests/unit/json/json-batch1-read-services.test.ts --maxWorkers=1`. Expected: FAIL because the method does not exist.

- [ ] **Step 3: Apply the smallest lazy generator.** Import generated types as `ledgerApiV2` or equivalent type aliases and add:

  ```ts
  public getActiveContractsPagesAsync(
      request: GetActiveContractsPageRequest,
      options: ActiveContractsTraversalOptions,
  ): AsyncIterable<GetActiveContractsPageResponse> {
      return this.getActiveContractsPagesLazy(request, options);
  }
  ```

  Make the private `async *` generator do all validation only upon `next()`, call the existing `this.transport.getActiveContractsPageAsync(...)`, and `yield response` unchanged. Do not add a JSON implementation, mapper, collector, retry, or catch/rethrow; routing through the existing transport makes first iteration reach the real JSON rejection.

- [ ] **Step 4: Prove GREEN/refactor.** Rerun Step 2 command. Expected: PASS, with no transport call before iteration. Retain a minimal private generator rather than changing `ITransport`.

- [ ] **Step 5: Review and isolated commit.** `rtk git add src/services/state/state-service-client.ts tests/unit/services/state-service-client.test.ts tests/unit/json/json-batch1-read-services.test.ts && rtk git commit -m "feat: add lazy ACS page traversal"`.

### Task 4: Enforce every ACS traversal invariant and bound (TDD)

**Files:**
- Modify: `src/services/state/state-service-client.ts`
- Modify: `tests/unit/services/state-service-client.test.ts`

- [ ] **Step 1: Add failing table-driven fake-transport tests before changing the generator.** Test all of the following independently: present/nonempty initial `pageToken` is a `ValidationError` only at first `next()` and performs no call; explicit initial `activeAtOffset` must exactly match the first nonempty response offset; omitted offset locks the first nonempty response offset; missing/empty later-or-first response offset is `missing-active-at-offset`; changed offset is `active-at-offset-mismatch`; byte-identical distinct `Uint8Array` continuation tokens are rejected as `repeated-page-token`; a nonterminal response derives exactly `{ activeAtOffset: locked, eventFormat: original.eventFormat, maxPageSize: original.maxPageSize, pageToken }`; a second page never carries an unrelated initial token; page `maxPages + 1` fails before dispatch; cumulative contracts beyond `maxContracts` fails before yield; each actual call receives a distinct, shrinking `deadline.createRequestOptions()`; breaking `for await` after one response never calls page two; fake `NotSupportedError`, `TimeoutError`, and arbitrary transport error escape by identity.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/services/state-service-client.test.ts --maxWorkers=1`. Expected: FAIL assertions for snapshot/token/bound/laziness semantics.

- [ ] **Step 3: Apply invariant code with `apply_patch`.** Before every dispatch check `pagesRead >= maxPages` and throw `new ActiveContractsTraversalError("max-pages-exceeded", ...)`; dispatch with `options.deadline.createRequestOptions()`; validate a trimmed nonempty `activeAtOffset` before yield; accumulate `response.activeContracts.length` and reject over-limit before yield. For a continuation, canonicalize token bytes (e.g. `Buffer.from(token).toString("base64")` or an explicit comma join) into a `Set<string>` before deriving the next generated request. Use the original `eventFormat` and `maxPageSize`, the locked offset, and only the continuation token. Do not catch RPC calls: already-dispatched `DEADLINE_EXCEEDED` and other transport errors must remain untouched.

- [ ] **Step 4: Prove GREEN then simplify only duplication.** Rerun Step 2. Expected: PASS. Rerun after extracting small private `requireSnapshotOffset`/token-key helpers if useful; do not change the public surface or add collect-all behavior.

- [ ] **Step 5: Review and commit.** `rtk git add src/services/state/state-service-client.ts tests/unit/services/state-service-client.test.ts && rtk git commit -m "feat: bound ACS page traversal"`.

### Task 5: Migrate example 60 and remove generic pagination helpers (TDD)

**Files:**
- Modify: `examples/60-query-active-contracts.ts`
- Modify: `examples/shared/ledger-requests.ts`
- Delete: `tests/unit/examples/ledger-requests.test.ts` tests that only exercise deleted generic pagination (retain/rewrite Message filtering/assertion coverage)
- Modify: `tests/unit/examples/ledger-requests.test.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: First write failing example tests/source contracts.** Prove `findActiveMessage`/fixture assertions still work on raw page entries, but neither `findActiveMessageAcrossPagesAsync` nor `collectActiveMessagesAcrossPagesAsync` is exported/referenced. Add semantic source checks (imports/public method call, `OperationDeadline`, `ActiveContractsTraversalOptions`, and `for await` with early `break`) without matching local variable names or exact formatting. Do not retain tests for the deleted generic helper/deadline policy.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1`. Expected: FAIL because old helpers remain and example 60 has not adopted the public API.

- [ ] **Step 3: Implement with `apply_patch`.** In 60 construct one `new OperationDeadline({ timeoutMs: exampleTimeoutMs() })` before fixture setup; pass `deadline.createRequestOptions()` to DAR, party, and command RPCs; traverse `client.stateService.getActiveContractsPagesAsync(request, new ActiveContractsTraversalOptions({ deadline, maxPages: <documented conservative bound>, maxContracts: <bound> }))`; inspect Message contracts through `findActiveMessage` and break on the exact contract. Delete both generic page-loop functions and their private timeout error from `ledger-requests.ts`; do not recreate generic pagination in examples.

- [ ] **Step 4: Prove GREEN/refactor.** Rerun Step 2 and `rtk npm run examples:check`. Expected: PASS. Keep only Message filtering/payload assertions in `ledger-requests.ts`.

- [ ] **Step 5: Review and commit.** `rtk git add examples/60-query-active-contracts.ts examples/shared/ledger-requests.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts && rtk git commit -m "refactor: use SDK ACS traversal in query example"`.

### Task 6: Migrate workflow setup and examples 90--93, including 92's local idle sub-budget (TDD)

**Files:**
- Modify: `examples/90-atomic-create-and-exercise.ts`
- Modify: `examples/shared/application-fixture.ts`
- Modify: `examples/shared/idempotent-command-retry-workflow.ts`
- Modify: `examples/shared/resume-update-stream-workflow.ts`
- Modify: `examples/shared/archive-and-stale-contract-workflow.ts`
- Modify: `examples/91-idempotent-command-retry.ts`, `examples/92-resume-update-stream.ts`, `examples/93-archive-and-stale-contract.ts` as dependency signatures require
- Delete: `examples/shared/workflow-deadline.ts`, `tests/unit/examples/workflow-deadline.test.ts`
- Modify: `tests/unit/examples/application-fixture.test.ts`, `tests/unit/examples/idempotent-command-retry.test.ts`, `tests/unit/examples/resume-update-stream-workflow.test.ts`, `tests/unit/examples/archive-and-stale-contract-workflow.test.ts`, `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add failing tests before migration.** Replace mock `remainingTimeoutMs` callbacks with a controllable real `OperationDeadline`/options boundary and assert every fixture setup/party/status/submission/page request gets a fresh option from one shared deadline. Assert 90/91/93 scan raw pages through the client and preserve only fixture-specific predicates/exact assertions. For 92 specifically prove, immediately before deliberately idle stream creation, it evaluates exactly:

  ```ts
  const idleTimeoutMs = Math.max(1, Math.min(2_000, Math.floor(deadline.remainingTimeoutMs() / 4)));
  new RequestOptions({ timeoutMs: idleTimeoutMs });
  ```

  and that the resumed stream uses `deadline.createRequestOptions()`; prove no `idleProbeMs`/public idle method remains.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/examples/application-fixture.test.ts tests/unit/examples/idempotent-command-retry.test.ts tests/unit/examples/resume-update-stream-workflow.test.ts tests/unit/examples/archive-and-stale-contract-workflow.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1`. Expected: FAIL until all four workflows share the public deadline and old helper is removed.

- [ ] **Step 3: Apply minimal migration.** Use `OperationDeadline` at the start of each workflow, adapt fixture/party/compatibility helpers to accept a boundary that calls `deadline.createRequestOptions()` rather than a raw remaining-number callback, and use `ActiveContractsTraversalOptions` with explicit safe bounds at every ACS scan. Consume raw page responses locally, accumulating only the fixture's matching Messages. Dispatch ordinary update streams with one fresh deadline option. Retain the current disposal/primary-error lifecycle; do not add an SDK idle API. Delete the old helper/test and remove all imports/references.

- [ ] **Step 4: Prove GREEN and non-regression.** Rerun Step 2, then `rtk npm run examples:check`. Expected: PASS; `rtk rg -n "workflow-deadline|createWorkflowDeadline|remainingMs\(|idleProbeMs|findActiveMessageAcrossPagesAsync|collectActiveMessagesAcrossPagesAsync" examples tests` should return no live references (exclude historical docs only).

- [ ] **Step 5: Review and isolated commit.** Delete the helper/test with `apply_patch`, then run `rtk git add examples/90-atomic-create-and-exercise.ts examples/91-idempotent-command-retry.ts examples/92-resume-update-stream.ts examples/93-archive-and-stale-contract.ts examples/shared/application-fixture.ts examples/shared/idempotent-command-retry-workflow.ts examples/shared/resume-update-stream-workflow.ts examples/shared/archive-and-stale-contract-workflow.ts examples/shared/ledger-requests.ts tests/unit/examples/application-fixture.test.ts tests/unit/examples/idempotent-command-retry.test.ts tests/unit/examples/resume-update-stream-workflow.test.ts tests/unit/examples/archive-and-stale-contract-workflow.test.ts tests/unit/examples/application-example-sources.test.ts examples/shared/workflow-deadline.ts tests/unit/examples/workflow-deadline.test.ts && rtk git commit -m "refactor: share SDK operation deadlines in workflows"`.

### Task 7: Finish public docs/export checks and package verification

**Files:**
- Modify: `README.md`
- Modify: `tests/unit/public/protobuf-exports.test.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts` only for non-brittle public/doc contracts

- [ ] **Step 1: Add failing checks.** Assert root imports construct `OperationDeadline`, `ActiveContractsTraversalOptions`, and `ActiveContractsTraversalError`; check README describes `getActiveContractsPagesAsync` as gRPC-only, lazy/raw/bounded and distinguishes JSON's existing `getActiveContractsAsync`. Do not use variable-name regexes.
- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/public/protobuf-exports.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1`. Expected: FAIL until exports/docs are aligned.
- [ ] **Step 3: Apply docs/source updates.** Explain a caller must select deadline/pages/contracts, no collect-all wrapper is supplied, and transport/after-dispatch errors propagate. Amend the support map from only `getActiveContractsPageAsync` to both gRPC-only page APIs. Do not change `GrpcContractQueryClient`; add a short code comment/test expectation only if necessary to prevent accidental scope expansion.
- [ ] **Step 4: Prove GREEN/refactor.** Rerun Step 2 and `rtk npm run build`. Expected: PASS.
- [ ] **Step 5: Review and commit.** `rtk git add README.md src/index.ts tests/unit/public/protobuf-exports.test.ts tests/unit/examples/application-example-sources.test.ts && rtk git commit -m "docs: describe bounded ACS traversal"`.

### Task 8: End-to-end verification, live matrix, pack and security handoff

**Files:**
- Create ignored evidence only: `.superpowers/sdd/2026-08-02-operation-deadline-acs-traversal/{live-357-default.md,live-357-explicit-party.md,live-358-default.md,live-358-explicit-party.md}`

- [ ] **Step 1: Run focused and whole-repository evidence.** Run `rtk proxy npx vitest run tests/unit/core/types/operation-deadline.test.ts tests/unit/core/types/active-contracts-traversal-options.test.ts tests/unit/services/state-service-client.test.ts tests/unit/json/json-batch1-read-services.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-fixture.test.ts tests/unit/examples/idempotent-command-retry.test.ts tests/unit/examples/resume-update-stream-workflow.test.ts tests/unit/examples/archive-and-stale-contract-workflow.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1`, then `rtk npm run examples:check`, `rtk npm run build`, `rtk npm test`, and `rtk npm run test:live` when the authenticated environment is available.
- [ ] **Step 2: Run unchanged-source live proofs in both modes.** On authenticated Participant **3.5.7**, run examples 60 and 90--93 once with default party allocation and once with `SDK_EXAMPLE_PARTY=<pre-existing-party>`; repeat unchanged source on isolated authenticated Participant **3.5.8** after the documented private child-shell credential refresh. Record participant full version/release core, selected common path, mode, unique IDs, page traversal/result assertions, and no secret data. Each ordinary shell invocation must have its environment scoped privately; never echo, print, write, or stage bearer tokens/sidecar credentials. Assert `rtk git check-ignore -q .superpowers/sdd/2026-08-02-operation-deadline-acs-traversal/live-357-default.md` before writing sanitized evidence.
- [ ] **Step 3: Pack/lint/diff/security evidence.** Run changed-file lint only (for example `rtk proxy npx eslint src/core/types/operation-deadline.ts src/core/types/active-contracts-traversal-options.ts src/core/errors/active-contracts-traversal-error.ts src/services/state/state-service-client.ts examples/60-query-active-contracts.ts examples/90-atomic-create-and-exercise.ts examples/shared/application-fixture.ts examples/shared/ledger-requests.ts examples/shared/idempotent-command-retry-workflow.ts examples/shared/resume-update-stream-workflow.ts examples/shared/archive-and-stale-contract-workflow.ts --max-warnings=0`); do not claim unrelated full-tree lint is clean. Run `rtk npm pack --dry-run`, inspect its file list for no `.env`, `.superpowers`, credentials, or unintended fixture output; run `rtk git diff --check` and `rtk git diff --cached --check`; inspect `rtk git status --short` to confirm only intentional commits plus the preserved user dirt/untracked plans. Do not stage evidence or `package.json`.
- [ ] **Step 4: Final external quality/security checkpoint.** Give the external reviewer the extraction spec, changed-file list, verification output, and sanitized evidence paths. Resolve blocking findings in a new focused TDD commit; rerun the affected RED/GREEN and final commands. This checkpoint is review only, not a request to duplicate the orchestrator.

## Expected task handoff

The next plan, `2026-08-02-command-completion-correlation-example-implementation-plan.md`, is blocked until Tasks 1--8 are complete and the extraction commits are present on `main`. It may consume only the root-exported public deadline and existing command-completion streaming service; it must not reopen this plan to modify `GrpcContractQueryClient`.
