# Command Completion Correlation Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use @superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add standalone example 94 that starts a completion stream before submission and structurally correlates the exact successful completion without publishing a new SDK wait API.

**Architecture:** This is deliberately example-only code layered on the completed `OperationDeadline` extraction. The top-level example owns setup, required user configuration, command construction/submission and client disposal; a narrow shared helper owns an already-started iterator, filtering, structural validation, and cleanup/primary-error precedence. No container/version branch or token introspection is permitted.

**Tech Stack:** TypeScript (strict), Vitest, Node `randomBytes`, existing protobuf-ts Ledger API v2 messages, existing gRPC `CommandCompletionServiceClient`, npm.

---

## Prerequisite, boundaries, and file map

**Hard gate:** do not begin production edits until every task and final verification in `docs/superpowers/plans/2026-08-02-operation-deadline-acs-traversal-implementation-plan.md` is complete on `main`. Confirm with `rtk git log --oneline --all` and run its focused deadline/traversal tests. Preserve the existing modified `package.json` and four untracked `2026-07-31` plans throughout; stage only named files. All commands are `rtk` prefixed; direct Vitest commands use `rtk proxy npx vitest`.

| Path | Action | Responsibility |
| --- | --- | --- |
| `examples/94-command-completion-correlation.ts` | Create | Standalone setup, saved ledger end, pre-submit stream start, submit/logging/disposal. |
| `examples/shared/command-completion-correlation.ts` | Create | Example-only iterator matcher, structural checks, cleanup and primary-error precedence. |
| `examples/shared/application-fixture.ts` | Modify | Permit `buildCreateMessageRequest` to explicitly carry required `userId`. |
| `tests/unit/examples/command-completion-correlation.test.ts` | Create | Generated-message matcher/lifecycle and top-level configuration/order tests. |
| `tests/unit/examples/application-fixture.test.ts` | Modify | Explicit request user ID is represented in `SubmitCommandRequest`. |
| `tests/unit/examples/application-example-sources.test.ts` | Modify | Semantic source/script/docs contracts, never local-variable-name regexes. |
| `package.json` | Modify | `example:workflow:command-completion` script following the workflow pattern. |
| `README.md` | Modify | Workflow command, required identity, live matrix/outcome, corrected service map. |

The helper must remain under `examples/shared`, must not be exported from `src/index.ts`, and must not know DARs, environment variables, bearer tokens, fixture text, or party allocation. The existing `commandCompletionService.getCompletionsAsync` is gRPC-only and already lazy; do not create an SDK method or normalize/rewrite in-flight stream errors.

At each task boundary, hand the supplied completion design plus changed-file diff to the externally arranged quality reviewer. Do not recruit/dispatch a parallel review workflow; commit only after that checkpoint has no blocking finding.

### Task 1: Make command construction carry an explicit user ID (TDD)

**Files:**
- Modify: `examples/shared/application-fixture.ts`
- Modify: `tests/unit/examples/application-fixture.test.ts`

- [ ] **Step 1: Write a failing builder test.** Add a `buildCreateMessageRequest` test with `userId: "ledger-api-user"` and assert the resulting `SubmitCommandRequest` contains exactly that user field in the generated submission payload; preserve every existing caller which does not provide it. Add a test that the example-specific caller will be able to distinguish a blank/missing input before it builds/submits (validation itself belongs to Task 3).
- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/examples/application-fixture.test.ts --maxWorkers=1`. Expected: FAIL because builder input/request lacks the asserted user ID.
- [ ] **Step 3: Apply minimal source.** With `apply_patch`, extend only `buildCreateMessageRequest`:

  ```ts
  export function buildCreateMessageRequest(init: {
      party: string; templateId: ExampleTemplateId; text: string;
      commandId?: string; userId?: string;
      deduplicationPeriod?: CommandDeduplicationPeriod;
  }): SubmitCommandRequest {
      return new SubmitCommandRequest({ /* existing fields */, userId: init.userId });
  }
  ```

  Do not add a default user, token lookup, or global validation here: existing examples retain their behavior and example 94 supplies/validates its exact required value.
- [ ] **Step 4: Prove GREEN/refactor.** Rerun Step 2. Expected: PASS; retain existing builder tests for command ID/deduplication.
- [ ] **Step 5: Review and isolated commit.** `rtk git add examples/shared/application-fixture.ts tests/unit/examples/application-fixture.test.ts && rtk git commit -m "feat: allow examples to submit explicit user IDs"`.

### Task 2: Implement the example-only completion matcher and lifecycle (TDD)

**Files:**
- Create: `examples/shared/command-completion-correlation.ts`
- Create: `tests/unit/examples/command-completion-correlation.test.ts`
- Reuse unchanged: `examples/shared/update-stream-lifecycle.ts` (`submitAndMatchUpdateAsync` and its tested cleanup ownership)

- [ ] **Step 1: Write failing generated-message/fake-iterator tests before source.** Build actual `ledgerApiV2.CompletionStreamResponse`/`Completion` shapes and a controllable async iterator. Cover: checkpoint ignored; unrelated command ID ignored; an exact command ID is accepted only if `completion.userId === expectedUserId`, success is absent status or `status.code === 0`, nonempty `updateId`, `actAs` equals the submitted actor as an unordered set, and `updateId === submittedTransactionId`; reject an empty submitted transaction ID before matching, present nonzero status structurally (not message text), missing update ID, wrong user, wrong actor, wrong update ID, stream end, and no completion oneof. Test pre-dispatch `TimeoutError` as unchanged input and post-dispatch transport error by identity.

  Also test the precise wrapper lifecycle: it receives an already-issued `firstNextPromise` plus `submitAsync`, immediately attaches `void firstNextPromise.catch(() => undefined)` before it calls `submitAsync`, invokes the existing `submitAndMatchUpdateAsync` once, and passes `cancelAsync: () => undefined` so that existing helper's final `iterator.return?.()` is the one and only stream close. Prove a successful submission followed by a concurrently failed first read surfaces the original first-read rejection; a submission failure remains primary when first-read and `return()` fail concurrently; `return?.()` is called exactly once after match/failure; cleanup failure surfaces only if no primary failure exists.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/examples/command-completion-correlation.test.ts --maxWorkers=1`. Expected: FAIL because the helper and matcher do not exist.

- [ ] **Step 3: Apply the narrow helper with `apply_patch`.** Export only from the example file a shape equivalent to:

  ```ts
  export async function submitAndWaitForCommandCompletionAsync(init: {
      iterator: AsyncIterator<ledgerApiV2.CompletionStreamResponse>;
      firstNextPromise: Promise<IteratorResult<ledgerApiV2.CompletionStreamResponse>>;
      submitAsync: () => Promise<SubmitCommandTransactionResponse>;
      commandId: string;
      expectedActor: string;
      expectedUserId: string;
  }): Promise<ledgerApiV2.Completion>;
  ```

  Implement that wrapper by directly invoking `submitAndMatchUpdateAsync({ iterator, firstNextPromise, submitAsync: async () => { const submitted = await init.submitAsync(); if (!submitted.transactionId.trim()) throw new Error("Submitted transaction ID must be non-empty."); return submitted; }, cancelAsync: () => undefined, match })`. Its `match(response, submitted)` ignores `offsetCheckpoint` and different command IDs, but for an exact ID structurally requires `completion.userId === expectedUserId`, absent status or `status.code === 0`, nonempty `updateId`, an unordered `actAs` set containing exactly `expectedActor`, and `completion.updateId === submitted.transactionId`; then returns the completion. A same-ID malformed/non-success completion throws a structural error. `submitAndMatchUpdateAsync` attaches the observer before submission and owns the sole final `iterator.return?.()`; the no-op cancellation avoids double cleanup. Do not catch/relabel `TimeoutError`, `GrpcTransportError`, or any stream/submission error, and do not expose this helper through `src/index.ts`.

- [ ] **Step 4: Prove GREEN/refactor.** Run Step 2 again. Expected: PASS. Refactor generated-message guards into small private predicates only; never expose the helper through `src/index.ts`.

- [ ] **Step 5: Review and commit.** `rtk git add examples/shared/command-completion-correlation.ts tests/unit/examples/command-completion-correlation.test.ts && rtk git commit -m "feat: add example completion correlation matcher"`.

### Task 3: Add example 94's race-free workflow and required configuration (TDD)

**Files:**
- Create: `examples/94-command-completion-correlation.ts`
- Modify: `tests/unit/examples/command-completion-correlation.test.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add failing workflow tests before the example.** Via dependency injection or extracted pure configuration/order functions, prove missing, empty, and whitespace-only `SDK_EXAMPLE_USER_ID` fail before any RPC/client operation, but a nonblank raw value such as `" ledger-api-user "` is retained without trimming and is forwarded/matched byte-for-byte in `buildCreateMessageRequest`/`SubmitCommandRequest`. Prove the order is: create one `OperationDeadline`; fixture/DAR, party, authenticated participant-status compatibility, and ledger-end unary calls each receive fresh deadline options; save a nonempty ledger-end offset; call `getCompletionsAsync(GetCompletionsRequest.create({ parties: [actor.party], beginExclusive: savedOffset }), deadline.createRequestOptions())`; obtain iterator, issue its first `next()`, then pass that promise and a fresh-option `submitAsync` to the Task-2 wrapper. Include source-shape checks only for durable ordering/API calls, not variable names.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/examples/command-completion-correlation.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1`. Expected: FAIL because example 94/config/order do not exist.

- [ ] **Step 3: Implement the top-level with `apply_patch`.** Follow current workflow client/disposal and compatibility conventions. Require:

  ```ts
  const expectedUserId = process.env.SDK_EXAMPLE_USER_ID;
  if (expectedUserId === undefined || expectedUserId.trim().length === 0) {
      throw new Error("SDK_EXAMPLE_USER_ID is required and must not be empty.");
  }
  const stream = client.commandCompletionService.getCompletionsAsync(
      ledgerApiV2.GetCompletionsRequest.create({ parties: [actor.party], beginExclusive: savedLedgerEndOffset }),
      deadline.createRequestOptions(),
  );
  const iterator = stream[Symbol.asyncIterator]();
  const firstNextPromise = iterator.next();
  const completion = await submitAndWaitForCommandCompletionAsync({
      iterator, firstNextPromise, commandId, expectedActor: actor.party, expectedUserId,
      submitAsync: () => client.commandService.submitAndWaitForTransactionAsync(request, deadline.createRequestOptions()),
  });
  ```

  The wrapper, not the top-level, attaches the immediate observer before submission and owns iterator close; do not issue a second `return()`. It validates a nonempty returned `transactionId` immediately after successful submission, then matches the exact untrimmed `expectedUserId`; use the run ID only as durable Message marker/log-safe correlation context, never for matching. Preserve default-party allocation warning and `SDK_EXAMPLE_PARTY` explicit-party behavior. Never decode/print a bearer token or attempt to infer identity: an authorization error remains unchanged and a mismatched completion user is a structural helper failure.

- [ ] **Step 4: Prove GREEN/refactor.** Rerun Step 2, then `rtk npm run examples:check`. Expected: PASS. Confirm source contains no root export/reference to the helper and no `userId ?? "ledger-api-user"` fallback.

- [ ] **Step 5: Review and commit.** `rtk git add examples/94-command-completion-correlation.ts examples/shared/command-completion-correlation.ts tests/unit/examples/command-completion-correlation.test.ts tests/unit/examples/application-example-sources.test.ts && rtk git commit -m "feat: add command completion correlation example"`.

### Task 4: Wire package script, README, and public support documentation (TDD)

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add failing semantic tests.** Assert package script exact behavior is `npm run build && node --loader ts-node/esm examples/94-command-completion-correlation.ts`; assert README lists command in workflow examples and states: standalone/durable Message state; all normal `SDK_EXAMPLE_*` endpoint/auth/TLS/party/timeout variables apply; `SDK_EXAMPLE_USER_ID` is mandatory, rejects only absent/blank input, and otherwise is preserved untrimmed then exactly submitted and matched; bearer auth requires configured declared user equal token Ledger API user/subject but never token inspection; saved exclusive offset and first stream read precede submission; no public wait helper exists. Assert service map says `commandCompletionService.getCompletionsAsync(...)` is existing gRPC-only streaming API, not a placeholder. Do not inspect variable names with regex.

- [ ] **Step 2: Prove RED.** Run: `rtk proxy npx vitest run tests/unit/examples/application-example-sources.test.ts --maxWorkers=1`. Expected: FAIL until script/docs/support map are updated.

- [ ] **Step 3: Apply exact updates.** Use `apply_patch`; preserve any user `package.json` edits outside the one script addition. README must state only the common successful implementation as supported until the evidence task determines whether the negative proof is portable; do not promise a rejected-command assertion beforehand.

- [ ] **Step 4: Prove GREEN/refactor.** Rerun Step 2 and `rtk npm run examples:check`. Expected: PASS.

- [ ] **Step 5: Review and commit.** First inspect `rtk git diff -- package.json`; then `rtk git add README.md tests/unit/examples/application-example-sources.test.ts` and use `rtk git add -p package.json` to stage only the new script hunk. Commit: `rtk git commit -m "docs: document completion correlation workflow"`. Do not accidentally stage the user's unrelated package change.

### Task 5: Investigate rejected completions on authenticated 3.5.7 (evidence, then conditional TDD)

**Files:**
- Create ignored evidence only: `.superpowers/sdd/2026-08-02-command-completion-correlation/rejected-357.md`
- Conditionally modify: `examples/94-command-completion-correlation.ts`, `examples/shared/command-completion-correlation.ts`, `tests/unit/examples/command-completion-correlation.test.ts`, `README.md`

- [ ] **Step 1: Safely collect structural evidence.** In a protected local child shell on authenticated Participant **3.5.7**, set `SDK_EXAMPLE_USER_ID=ledger-api-user` plus required credentials without echoing/export-dumping them. Save ledger end, start the matching completion stream first, submit one deliberately invalid fresh-command-ID command, retain only structured RPC code/decoded status, and continue the already-started stream within `OperationDeadline`. Record only full participant version/release core, command ID, whether exact completion arrived, status presence/code, update-ID emptiness, exact completion user ID, actAs set, and offset. Never record status prose, tokens, refreshed sidecar credentials, or environment dumps.

- [ ] **Step 2: Decide solely from data.** If a visible exact-command rejected completion occurs, write a failing test for its observed common structural shape (exact ID, nonzero status, actual update-ID condition, actor/user correlation) and prove RED with `rtk proxy npx vitest run tests/unit/examples/command-completion-correlation.test.ts --maxWorkers=1`. If no exact completion appears, do not add speculative production/test logic; record that success-only is required pending 3.5.8 comparison.

- [ ] **Step 3: Keep evidence ignored.** Verify `rtk git check-ignore -q .superpowers/sdd/2026-08-02-command-completion-correlation/rejected-357.md`, write the sanitized report, and run `rtk git status --short` to confirm no evidence/credential is staged.

### Task 6: Investigate rejected completions on isolated authenticated 3.5.8 and apply the strict common outcome

**Files:**
- Create ignored evidence only: `.superpowers/sdd/2026-08-02-command-completion-correlation/rejected-358.md`
- Conditionally modify: `examples/shared/command-completion-correlation.ts`, `tests/unit/examples/command-completion-correlation.test.ts`, `README.md`

- [ ] **Step 1: Repeat the same experiment on exact Participant 3.5.8.** Refresh the sidecar credential only through the documented protected child-shell flow. If `PARTICIPANT_358_SOURCE_AUTH_SUBJECT` or `PARTICIPANT_358_LEDGER_USER_ID` is customized, confirm configuration designates the same provisioned user and set `SDK_EXAMPLE_USER_ID` to that exact name; correct disagreement before treating it as evidence. Do not inspect the token. Capture the same structural fields as Task 5 and authenticated full version/release core using `workflow-compatibility` parsing.

- [ ] **Step 2: Apply the only permitted outcome.** If **both** versions show the same structured rejected completion semantics, complete the exact failing test selected in Task 5 and rerun `rtk proxy npx vitest run tests/unit/examples/command-completion-correlation.test.ts --maxWorkers=1` to preserve its expected RED failure before changing source; then add the minimal helper negative assertion, prove GREEN with the same command, update README to state the tested common negative proof, review, and commit it separately (`test: prove rejected command completions`). If either version has no visible completion or semantics differ, ship **only success correlation**; document the evidence-backed difference/omission in README and do not add a version/container-tag/endpoint branch. In that outcome add no speculative negative test. Commit documentation only if it changed.

- [ ] **Step 3: Preserve privacy.** Verify both evidence files are ignored, never `git add` `.superpowers`, and ensure all README statements are conditional evidence summaries rather than status-message quotations.

### Task 7: Live successful-correlation matrix in default and explicit-party modes

**Files:**
- Create ignored evidence only: `.superpowers/sdd/2026-08-02-command-completion-correlation/{success-357-default.md,success-357-explicit-party.md,success-358-default.md,success-358-explicit-party.md}`

- [ ] **Step 1: Run the unchanged final implementation on authenticated Participant 3.5.7.** Enter the documented protected/authenticated shell first; credentials are already scoped there and must not appear in commands, reports, or files. Run default-party mode with only `SDK_EXAMPLE_USER_ID=ledger-api-user rtk npm run example:workflow:command-completion`, then explicit-party mode with only `SDK_EXAMPLE_USER_ID=ledger-api-user SDK_EXAMPLE_PARTY=<pre-existing-party> rtk npm run example:workflow:command-completion`. Record only source commit, mode, full version/release core, saved offset, unique command ID, explicitly submitted/matched raw user ID, completion oneof kind, success status representation (absent or code 0), nonempty update ID, unordered actor-set result, and submitted transaction-ID correlation.

- [ ] **Step 2: Repeat exactly on isolated authenticated Participant 3.5.8.** Use the same source and two command forms in a private credential-refresh child shell if needed. If custom sidecar subject/user configuration applies, replace `ledger-api-user` in both forms with that exact provisioned Ledger API user. No source/version/tag branch is allowed merely to run this row.

- [ ] **Step 3: Sanitize and verify evidence.** Before writing each report, assert `rtk git check-ignore -q <report-path>`. Include neither bearer token text, environment dumps, sidecar credentials, nor status prose. `rtk git status --short` must show reports untracked-but-ignored and never staged.

### Task 8: Final verification, changed-file lint, pack/diff/security and handoff

**Files:** no source changes expected unless a verified finding requires a new focused TDD task/commit.

- [ ] **Step 1: Run all automated evidence.** Run `rtk proxy npx vitest run tests/unit/examples/application-fixture.test.ts tests/unit/examples/command-completion-correlation.test.ts tests/unit/examples/application-example-sources.test.ts tests/unit/examples/update-stream-lifecycle.test.ts --maxWorkers=1`; then `rtk npm run examples:check`, `rtk npm run build`, `rtk npm test`, and `rtk npm run test:live` when authenticated infrastructure is available.
- [ ] **Step 2: Lint only configured changed TypeScript files.** Run `rtk proxy npx eslint examples/94-command-completion-correlation.ts examples/shared/command-completion-correlation.ts examples/shared/application-fixture.ts tests/unit/examples/command-completion-correlation.test.ts tests/unit/examples/application-fixture.test.ts tests/unit/examples/application-example-sources.test.ts --max-warnings=0` (omit nonexistent/unchanged paths). Do not pass `README.md` to ESLint and do not claim package/Markdown lint; report this strictly as changed-TypeScript-file lint.
- [ ] **Step 3: Validate package/diff/security scope.** Run `rtk npm pack --dry-run` and inspect no `.superpowers`, `.env`, credentials, or unintended artifacts would publish; run `rtk git diff --check`, `rtk git diff --cached --check`, and `rtk git status --short`. Verify `package.json` has only this plan's script staged/committed while the user's original edit stays untouched. Do not stage ignored live evidence.
- [ ] **Step 4: External final review checkpoint.** Provide the design spec, dependent-extraction completion evidence, exact version/mode matrix summaries, conditional rejection outcome, verification outputs, and changed-file diff to the external quality/security review. Fix only concrete findings through a fresh test-first task and re-run its focused tests plus Steps 1--3. Do not duplicate orchestration.

## Completion criterion

The final tree has one common success-correlation implementation for 3.5.7 and 3.5.8, uses saved exclusive offset plus an actually-started `firstNextPromise` before submission, and matches exact command/user/actor/update/transaction fields without inspecting token or error-message prose. A rejected-command assertion exists only if both live investigations established the same structured behavior; otherwise README and ignored evidence explicitly state that it was intentionally omitted. No SDK public completion-wait API or version/tag branch is introduced.
