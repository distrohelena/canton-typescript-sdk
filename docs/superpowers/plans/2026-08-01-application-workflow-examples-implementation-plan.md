# Application Workflow Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four standalone TypeScript examples that teach atomic commands, idempotent retries, stream resumption, and stale-contract handling through both successful and expected-failure paths on Canton 3.5.7 and 3.5.8.

**Architecture:** Extend `SubmitCommandRequest` with validated caller-controlled command IDs and deduplication periods, map them without silent loss, and build the examples on focused shared deadline, ACS, failure-classification, and compatibility helpers. Start with one common participant path; introduce a narrow compatibility entry only if final-tree live evidence proves a 3.5.7/3.5.8 difference.

**Tech Stack:** TypeScript, Node.js ESM, Vitest, ESLint, protobuf-ts, Canton Ledger API v2, gRPC and JSON transports, CN Quickstart Participant 3.5.7, isolated Canton Participant 3.5.8 sidecar.

---

## Execution constraints

- Work on the user-authorized `main` branch. Do not create a worktree unless the
  user changes that instruction.
- Prefix every shell command with `rtk`.
- Use `apply_patch` for source and documentation edits.
- Preserve the user-owned `package.json` version change and these unrelated
  untracked files:
  - `docs/superpowers/plans/2026-07-31-decentralized-party-example-proof-plan.md`
  - `docs/superpowers/plans/2026-07-31-localnet-participant-358-sidecar-plan.md`
  - `docs/superpowers/plans/2026-07-31-localnet-readiness-wait-implementation-plan.md`
  - `docs/superpowers/plans/2026-07-31-typescript-sdk-examples-implementation-plan.md`
- Stage `package.json` by hunk or exact content only; never include the user's
  version line in a task commit.
- Confirm this implementation plan is committed before Task 1 begins. It is a
  planning-owned file, not an allowed untracked exception during execution.
- Never print or commit bearer tokens. Refresh the 3.5.8 token with the existing
  Docker-free `--refresh-token` mode.
- Do not modify CN Quickstart or introduce participant-version branches before
  live evidence demonstrates a semantic difference.
- Each task follows RED -> GREEN -> focused verification -> narrow commit.

## File map

### Public SDK

- Create `src/core/types/command-deduplication-period.ts`: public union and
  shared validation/mapping-neutral predicates.
- Modify `src/core/types/requests/submit-command-request.ts`: optional
  `commandId` and `deduplicationPeriod` properties and constructor validation.
- Modify `src/index.ts`: public type export.
- Create `src/transports/grpc/mappers/command-deduplication-mapper.ts`: normal
  and interactive protobuf oneof mapping.
- Modify `src/transports/grpc/mappers/commands-mapper.ts`: preserve caller
  command ID and normal deduplication period.
- Modify `src/transports/grpc/mappers/interactive-command-mapper.ts`: preserve
  command ID through prepare and deduplication through execute.
- Modify `src/transports/grpc/grpc-transport.ts`: use one resolved command ID in
  both direct interactive signing and detached prepare/execute.
- Modify `src/transports/json/mappers/commands-mapper.ts`: preserve explicit
  command ID and reject unsupported deduplication before HTTP I/O.

### Shared examples

- Modify `examples/shared/application-fixture.ts`: atomic command builder,
  caller-controlled create/replace builders, exact Message payload reader, and
  deadline-aware DAR/party setup.
- Modify `examples/shared/ledger-requests.ts`: paginated run-scoped ACS
  collection and active/absent assertions.
- Create `examples/shared/workflow-errors.ts`: structured expected-failure
  classification.
- Create `examples/shared/workflow-compatibility.ts`: exact participant version
  reading, release-core parsing, and the single observed-difference boundary.
- Create `examples/shared/workflow-deadline.ts`: one absolute deadline, idle
  sub-budget, and remaining-time calculation.
- Modify `examples/shared/update-stream-lifecycle.ts`: bounded idle probe and
  resumable matching without cleanup masking.

### Programs and documentation

- Create `examples/90-atomic-create-and-exercise.ts`.
- Create `examples/91-idempotent-command-retry.ts`.
- Create `examples/92-resume-update-stream.ts`.
- Create `examples/93-archive-and-stale-contract.ts`.
- Modify `tests/unit/examples/application-example-sources.test.ts`.
- Modify `package.json` scripts only.
- Modify `README.md`.

## Task 1: Public command identity and deduplication types

**Files:**
- Create: `src/core/types/command-deduplication-period.ts`
- Modify: `src/core/types/requests/submit-command-request.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/types/request-validation.test.ts`

- [ ] **Step 1: Add failing request-validation tests**

Add tests proving explicit values are retained and invalid wire values fail:

```ts
const request = new SubmitCommandRequest({
    applicationId: "workflow-examples",
    actAs: ["Alice"],
    command,
    commandId: "retry-command-1",
    deduplicationPeriod: { kind: "duration", seconds: 30 },
});

expect(request.commandId).toBe("retry-command-1");
expect(request.deduplicationPeriod).toEqual({ kind: "duration", seconds: 30 });
```

Cover command IDs `""`, 256 characters, and illegal `.`; duration `0`, `-1`,
fractional, `NaN`, and unsafe integer; offsets `""`, `"00"`, `"+1"`, `"-1"`,
non-digits, and `9223372036854775808`. Prove `"0"` and
`"9223372036854775807"` are accepted.

Bypass TypeScript deliberately with `as unknown as CommandDeduplicationPeriod`
and prove constructor-time `ValidationError` for `{ kind: "unknown" }`,
`{ kind: "duration" }`, duration with string `seconds`, `{ kind: "offset" }`,
offset with non-string `offset`, `null`, arrays, strings, and numbers. These RED
tests prove malformed runtime input is rejected before any request reaches a
transport, not merely excluded by the TypeScript union.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
rtk npx vitest run tests/unit/types/request-validation.test.ts
```

Expected: FAIL because `SubmitCommandRequest` does not expose or validate the
new controls.

- [ ] **Step 3: Add the public union and validators**

Implement:

```ts
export type CommandDeduplicationPeriod =
    | { readonly kind: "duration"; readonly seconds: number }
    | { readonly kind: "offset"; readonly offset: string };

export const MAX_DEDUPLICATION_OFFSET = 9223372036854775807n;
export const LEDGER_STRING_PATTERN = /^[A-Za-z0-9#:\-_/ ]{1,255}$/u;
```

Use `^(0|[1-9][0-9]*)$` plus `BigInt` range checking for offsets. Store a
defensive frozen copy of the selected union in `SubmitCommandRequest`. Export
the public type from `src/index.ts`.

- [ ] **Step 4: Run focused tests and type-check**

Run:

```bash
rtk npx vitest run tests/unit/types/request-validation.test.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit Task 1**

```bash
rtk git add src/core/types/command-deduplication-period.ts src/core/types/requests/submit-command-request.ts src/index.ts tests/unit/types/request-validation.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add command deduplication controls"
```

## Task 2: gRPC normal, transaction, and interactive mapping

**Files:**
- Create: `src/transports/grpc/mappers/command-deduplication-mapper.ts`
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Modify: `src/transports/grpc/mappers/interactive-command-mapper.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Test: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Test: `tests/unit/grpc/grpc-interactive-command-mapper.test.ts`
- Test: `tests/unit/grpc/grpc-command-runtime.test.ts`

- [ ] **Step 1: Add failing normal-mapper tests**

Assert an explicit command ID replaces `expect.any(String)` and duration maps
to:

```ts
deduplicationPeriod: {
    oneofKind: "deduplicationDuration",
    deduplicationDuration: { seconds: "30", nanos: 0 },
}
```

Assert offset `"0"` maps to `deduplicationOffset` for both submit-and-wait and
submit-and-wait-for-transaction.

- [ ] **Step 2: Add failing interactive-mapper/runtime tests**

Prove prepare receives `request.commandId`, execute receives duration/positive
offset, direct signer submission uses the same command ID, and detached
prepare/execute retains the request controls. Prove interactive offset `"0"`
throws `ValidationError` before `executeSubmissionAndWaitAsync` is called.

- [ ] **Step 3: Run the three files and verify RED**

```bash
rtk npx vitest run tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts
```

Expected: FAIL because current mappers always generate UUIDs and leave
deduplication unset.

- [ ] **Step 4: Implement one protobuf mapper**

Create a helper shaped like:

```ts
export function mapGrpcDeduplicationPeriod(
    period: CommandDeduplicationPeriod | undefined,
    options: { readonly allowParticipantBegin: boolean },
): Commands["deduplicationPeriod"] {
    if (period === undefined) return { oneofKind: undefined };
    if (period.kind === "duration") {
        return {
            oneofKind: "deduplicationDuration",
            deduplicationDuration: { seconds: String(period.seconds), nanos: 0 },
        };
    }
    if (!options.allowParticipantBegin && period.offset === "0") {
        throw new ValidationError(
            "interactive command deduplication offsets must be positive",
        );
    }
    return {
        oneofKind: "deduplicationOffset",
        deduplicationOffset: period.offset,
    };
}
```

Normal submission passes `allowParticipantBegin: true`; interactive execute
passes `false`.

- [ ] **Step 5: Preserve one resolved command ID**

Use `request.commandId ?? randomUUID()` in the normal mapper and both gRPC
interactive entry points. Do not generate a second ID between prepare and
execute. Preserve the existing random behavior when absent.

- [ ] **Step 6: Run focused gRPC tests and build**

```bash
rtk npx vitest run tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit Task 2**

```bash
rtk git add src/transports/grpc/mappers/command-deduplication-mapper.ts src/transports/grpc/mappers/commands-mapper.ts src/transports/grpc/mappers/interactive-command-mapper.ts src/transports/grpc/grpc-transport.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: map command deduplication over grpc"
```

## Task 3: JSON command-ID preservation and explicit dedup rejection

**Files:**
- Modify: `src/transports/json/mappers/commands-mapper.ts`
- Test: `tests/unit/json/json-command-submission.test.ts`

The repository has no typed V2 `JsCommands` schema proving a deduplication
encoding. This task therefore preserves explicit command IDs but rejects
deduplication instead of inventing or silently dropping a JSON shape.

- [ ] **Step 1: Add failing JSON tests**

Assert `commandId: "retry-command-1"` is forwarded exactly. Assert duration
and offset requests throw `TransportError` with a stable message before the
HTTP mapper returns a payload. Retain a test that absent controls still produce
a UUID.

Also construct `JsonTransport` with a fake HTTP client whose `postAsync`
increments a counter. Call `transport.submitCommandAsync` with a deduplication
period, assert `TransportError`, and assert the counter remains `0`. This proves
the rejection happens before `/v2/commands/submit-and-wait` I/O, not merely in
an isolated mapper test.

- [ ] **Step 2: Run the test and verify RED**

```bash
rtk npx vitest run tests/unit/json/json-command-submission.test.ts
```

Expected: FAIL because JSON currently replaces explicit IDs and ignores the
period.

- [ ] **Step 3: Implement the boundary contract**

Return `request.commandId ?? randomUUID()`. At the top of the mapper, throw:

```ts
if (request.deduplicationPeriod !== undefined) {
    throw new TransportError(
        "command deduplication periods are not supported by the JSON transport",
    );
}
```

Do not change unrelated JSON command fields.

- [ ] **Step 4: Verify JSON and transport regression tests**

```bash
rtk npx vitest run tests/unit/json/json-command-submission.test.ts tests/unit/services/command-submission-pipeline.test.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
rtk git add src/transports/json/mappers/commands-mapper.ts tests/unit/json/json-command-submission.test.ts
rtk git diff --cached --check
rtk git commit -m "fix: preserve json command identities"
```

## Task 4: Atomic, ACS, version, and structured-failure helpers

**Files:**
- Modify: `examples/shared/application-fixture.ts`
- Modify: `examples/shared/ledger-requests.ts`
- Create: `examples/shared/workflow-errors.ts`
- Create: `examples/shared/workflow-compatibility.ts`
- Modify: `tests/unit/examples/application-fixture.test.ts`
- Modify: `tests/unit/examples/ledger-requests.test.ts`
- Create: `tests/unit/examples/workflow-errors.test.ts`
- Create: `tests/unit/examples/workflow-compatibility.test.ts`

- [ ] **Step 1: Add failing fixture tests**

Test builders for explicit command ID/deduplication and
`CreateAndExerciseCommand`. Test an extractor that requires one archived and
one created event and a Message text reader that accepts only a decoded `text`
field. Extend `ensureExampleDarUploadedAsync` and `resolveExamplePartyAsync`
tests with an injected `remainingTimeoutMs` callback. Assert it is invoked
immediately before each package list, DAR upload, second package list, or party
allocation, and that each service receives a fresh `RequestOptions` with the
returned remaining budget.

- [ ] **Step 2: Add failing paginated ACS tests**

Test collection by unique text marker across multiple stable-snapshot pages,
exactly-one assertion, absent-contract assertion, snapshot-offset mismatch,
repeated token, and shared-deadline expiry.

- [ ] **Step 3: Add failing structured-error tests**

Construct normalized `GrpcTransportError` fixtures and require classification
by `grpcCode`, status code, semantic operation, and selected compatibility
entry. Verify ordinary errors, unexpected codes, and missing structured status
are rethrown rather than accepted by message text.

- [ ] **Step 4: Add failing participant-version tests**

Use `ParticipantStatusResponse` fixtures to require an active status and a
non-empty `commonStatus.version`. Parse a release core with an anchored semantic
version prefix: accept full versions such as `3.5.8`, `3.5.8-SNAPSHOT`, and
`3.5.8+build.1` as release core `3.5.8`; reject `3.5.80`, missing patch
components, leading junk, and unsupported release cores. Test the common
compatibility selection and unknown observed outcome rejection. The participant
status read must accept `remainingTimeoutMs` and pass a fresh `RequestOptions`
to the admin service. Do not add a behavioral 3.5.7/3.5.8 branch yet.

- [ ] **Step 5: Run the focused files and verify RED**

```bash
rtk npx vitest run tests/unit/examples/application-fixture.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/workflow-errors.test.ts tests/unit/examples/workflow-compatibility.test.ts
```

Expected: FAIL because the helpers do not exist.

- [ ] **Step 6: Implement minimal shared helpers**

Keep version handling data-only:

```ts
export interface WorkflowCompatibility {
    readonly participantVersion: string;
    readonly path: "common" | string;
    readonly acceptedGrpcCodes: Readonly<Record<WorkflowFailureKind, readonly string[]>>;
}
```

Seed only the common structured codes required to make the tests explicit.
Live tasks may revise the table only with recorded evidence.

Make setup calls deadline-aware without breaking older examples:

```ts
interface RemainingBudget {
    readonly remainingTimeoutMs: () => number;
}
```

Accept this optional object in existing DAR/party helpers, call it separately
before every network request, and construct `new RequestOptions({ timeoutMs })`
for that request. All four new workflow scripts must provide it. The participant
version helper requires the callback because every new script reads the version.

- [ ] **Step 7: Verify helpers and examples type-check**

```bash
rtk npx vitest run tests/unit/examples/application-fixture.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/workflow-errors.test.ts tests/unit/examples/workflow-compatibility.test.ts
rtk npm run examples:check
```

Expected: PASS.

- [ ] **Step 8: Commit Task 4**

```bash
rtk git add examples/shared/application-fixture.ts examples/shared/ledger-requests.ts examples/shared/workflow-errors.ts examples/shared/workflow-compatibility.ts tests/unit/examples/application-fixture.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/workflow-errors.test.ts tests/unit/examples/workflow-compatibility.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add workflow example proof helpers"
```

## Task 5: Absolute deadline and resumable stream lifecycle

**Files:**
- Create: `examples/shared/workflow-deadline.ts`
- Modify: `examples/shared/update-stream-lifecycle.ts`
- Create: `tests/unit/examples/workflow-deadline.test.ts`
- Modify: `tests/unit/examples/update-stream-lifecycle.test.ts`

- [ ] **Step 1: Add failing absolute-deadline tests**

Use an injected clock to prove:

```ts
const deadline = createWorkflowDeadline({ timeoutMs: 8_000, now });
expect(deadline.idleProbeMs()).toBe(2_000);
expect(deadline.remainingMs()).toBe(8_000);
```

Advance the clock and prove remaining time decreases, never resets, and throws
the workflow timeout when exhausted. Cover a timeout below 8 seconds and the
minimum 1 ms idle slice.

- [ ] **Step 2: Add failing stream lifecycle tests**

Test an idle read that maps `DEADLINE_EXCEEDED` to the expected probe timeout,
calls iterator return/client cancellation once, and leaves the original
absolute deadline intact. Test a resumed stream that rejects a pre-offset
contract, skips unrelated updates, returns the post-offset match, observes a
pending first-read rejection, and never masks a primary error with cleanup.

- [ ] **Step 3: Run tests and verify RED**

```bash
rtk npx vitest run tests/unit/examples/workflow-deadline.test.ts tests/unit/examples/update-stream-lifecycle.test.ts
```

Expected: FAIL because deadline/resume helpers do not exist.

- [ ] **Step 4: Implement the deadline API**

Expose only:

```ts
interface WorkflowDeadline {
    readonly idleProbeMs: () => number;
    readonly remainingMs: () => number;
}
```

Compute the absolute end once. `idleProbeMs()` returns
`max(1, min(2_000, floor(timeoutMs / 4)))`, capped by current remaining time.
All later request options use `remainingMs()`.

- [ ] **Step 5: Implement idle probe and resumed matching**

Reuse `cleanupWithoutMaskingAsync` and `createClientDisposalLifecycle`. Keep
lazy `iterator.next()` startup explicit. Accept a `reject` callback that fails
if the pre-offset contract appears and a `match` callback for the target.

- [ ] **Step 6: Verify lifecycle tests and existing stream example**

```bash
rtk npx vitest run tests/unit/examples/workflow-deadline.test.ts tests/unit/examples/update-stream-lifecycle.test.ts tests/unit/examples/application-example-sources.test.ts
rtk npm run examples:check
```

Expected: PASS.

- [ ] **Step 7: Commit Task 5**

```bash
rtk git add examples/shared/workflow-deadline.ts examples/shared/update-stream-lifecycle.ts tests/unit/examples/workflow-deadline.test.ts tests/unit/examples/update-stream-lifecycle.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add resumable workflow deadlines"
```

## Task 6: Atomic create-and-exercise example

**Files:**
- Create: `examples/90-atomic-create-and-exercise.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add a failing source-contract test**

Require the script to upload the fixture, resolve the actor, read the exact
participant version, submit an invalid choice with its own command ID, classify
the structured rejection, submit a valid `CreateAndExerciseCommand`, extract
archive/create events, query the replacement, assert exact text, and dispose in
`finally`. Require one absolute deadline to be created before the first network
call and require DAR upload, party resolution, participant status, both command
submissions, and every ACS page to receive the current remaining budget.

- [ ] **Step 2: Run the source test and verify RED**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts
```

Expected: FAIL because the script is absent.

- [ ] **Step 3: Implement the standalone script**

Use unique LedgerString-safe IDs such as
`atomic-invalid-${runId}` and `atomic-valid-${runId}`. The negative request
must run first and must not share its ID with the valid request. Print actor,
participant version/path, normalized failure kind, archived transient ID,
replacement ID, and exact payload proof.

- [ ] **Step 4: Verify source contract and type-check**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts
rtk npm run examples:check
```

Expected: PASS.

- [ ] **Step 5: Commit Task 6**

```bash
rtk git add examples/90-atomic-create-and-exercise.ts tests/unit/examples/application-example-sources.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add atomic command example"
```

## Task 7: Idempotent command retry example

**Files:**
- Create: `examples/91-idempotent-command-retry.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add a failing source-contract test**

Require one request object with one explicit command ID and duration period to
be submitted twice. Require first success extraction, structured duplicate
classification, paginated ACS collection by unique text marker, and an exact
cardinality-one assertion. Reject implementations that merely compare error
message text or sleep. Require the absolute deadline to cover DAR upload, party
resolution, participant status, both submissions, and every ACS page.

- [ ] **Step 2: Run the source test and verify RED**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts
```

Expected: FAIL because the script is absent.

- [ ] **Step 3: Implement the retry script**

Build a marker and LedgerString-safe command ID from the same run ID. Submit
with `{ kind: "duration", seconds: 30 }`, retry the exact object, classify the
duplicate, and query all pages under the one workflow deadline. Print the
command ID, first transaction/update ID, duplicate classification, count `1`,
participant version, and compatibility path.

- [ ] **Step 4: Verify source contract and type-check**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/workflow-errors.test.ts
rtk npm run examples:check
```

Expected: PASS.

- [ ] **Step 5: Commit Task 7**

```bash
rtk git add examples/91-idempotent-command-retry.ts tests/unit/examples/application-example-sources.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add idempotent retry example"
```

## Task 8: Resumable update-stream example

**Files:**
- Create: `examples/92-resume-update-stream.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add a failing source-contract test**

Require the script to create the pre-offset contract, read ledger end, allocate
the idle sub-budget, open/read/cancel the idle stream, create the post-offset
contract using remaining time, reopen from the exact saved offset, reject any
pre-offset contract event, match the post-offset ID, and print non-empty update
ID/offset.
The source contract must also prove DAR upload, party resolution, and
participant-status reads receive the same deadline's current remaining budget.

- [ ] **Step 2: Run the source test and verify RED**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts
```

Expected: FAIL because the script is absent.

- [ ] **Step 3: Implement the resume script**

Create one absolute deadline before the first network call. Give the idle stream
only `idleProbeMs()`. After its expected timeout, pass `remainingMs()` to the
post-offset submission and resumed stream. Use unique pre/post text and contract
IDs so unrelated durable localnet updates cannot satisfy the proof.

- [ ] **Step 4: Verify lifecycle/source tests and type-check**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/examples/workflow-deadline.test.ts tests/unit/examples/update-stream-lifecycle.test.ts
rtk npm run examples:check
```

Expected: PASS.

- [ ] **Step 5: Commit Task 8**

```bash
rtk git add examples/92-resume-update-stream.ts tests/unit/examples/application-example-sources.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add resumable update example"
```

## Task 9: Archive and stale-contract example

**Files:**
- Create: `examples/93-archive-and-stale-contract.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`

- [ ] **Step 1: Add a failing source-contract test**

Require create, `ReplaceText`, exact original archive/replacement extraction,
paginated proof that original is absent and replacement is active with exact
text, a distinct-command-ID exercise of the archived contract, structured
stale-contract classification, and bounded cleanup.
Require the one absolute deadline to cover DAR upload, party resolution,
participant status, all command submissions, and all ACS pages.

- [ ] **Step 2: Run the source test and verify RED**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts
```

Expected: FAIL because the script is absent.

- [ ] **Step 3: Implement the stale-contract script**

Use the existing replacement extractor, new active/absent helpers, and the
shared compatibility classifier. Print original/replacement IDs, exact
replacement payload, stale failure classification, version, and path. Never
accept the stale exercise as a second success.

- [ ] **Step 4: Verify source/helper tests and type-check**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/examples/application-fixture.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/workflow-errors.test.ts
rtk npm run examples:check
```

Expected: PASS.

- [ ] **Step 5: Commit Task 9**

```bash
rtk git add examples/93-archive-and-stale-contract.ts tests/unit/examples/application-example-sources.test.ts
rtk git diff --cached --check
rtk git commit -m "feat: add stale contract example"
```

## Task 10: Scripts, README, and packaging contracts

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `tests/unit/examples/application-example-sources.test.ts`
- Test: `tests/unit/package/npm-pack-verification-script.test.ts`

- [ ] **Step 1: Add failing script/documentation contracts**

Require exact scripts:

```json
"example:workflow:atomic": "npm run build && node --loader ts-node/esm examples/90-atomic-create-and-exercise.ts",
"example:workflow:retry": "npm run build && node --loader ts-node/esm examples/91-idempotent-command-retry.ts",
"example:workflow:resume": "npm run build && node --loader ts-node/esm examples/92-resume-update-stream.ts",
"example:workflow:stale-contract": "npm run build && node --loader ts-node/esm examples/93-archive-and-stale-contract.ts"
```

Keep `package.json.files` exactly `dist`, `node`, `README.md`, and `LICENSE`.

- [ ] **Step 2: Run contracts and verify RED**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/package/npm-pack-verification-script.test.ts
```

Expected: FAIL because scripts/docs are absent.

- [ ] **Step 3: Patch scripts without staging the version line**

Add only the four scripts. Inspect the staged diff and ensure the user-owned
version change is not staged.

- [ ] **Step 4: Document behavior and compatibility policy**

Add a README workflow section with run commands, durable-state warnings,
success/failure proof, dedup semantics, saved-offset exclusivity, structured
errors, version/path output, 3.5.8 token refresh, and the rule that differences
are added only after live proof.

- [ ] **Step 5: Verify scripts, docs, type-check, and pack policy**

```bash
rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/package/npm-pack-verification-script.test.ts
rtk npm run examples:check
rtk npm run verify:pack
```

Expected: PASS; dry-run package contains neither `examples/` nor
`node/.generated/`.

- [ ] **Step 6: Commit Task 10 narrowly**

```bash
rtk git add README.md tests/unit/examples/application-example-sources.test.ts tests/unit/package/npm-pack-verification-script.test.ts
rtk git add -p package.json
rtk git diff --cached --check
rtk git diff --cached -- package.json
rtk git commit -m "docs: add workflow example walkthroughs"
```

## Task 11: Exact Participant 3.5.7 live acceptance

**Files:**
- Modify only if a proven defect requires a TDD fix.
- Record ignored evidence: `.superpowers/sdd/2026-08-01-application-workflow-examples/task-11-live-357-report.md`

- [ ] **Step 1: Run focused preflight**

```bash
rtk npm run build
rtk npm run examples:check
rtk npx vitest run tests/unit/types/request-validation.test.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/json/json-command-submission.test.ts tests/unit/examples
```

Expected: PASS.

- [ ] **Step 2: Prove the active 3.5.7 release through the authenticated API**

Record the full non-empty `commonStatus.version`, parse it with the tested
release-core helper, and require release core `3.5.7`. Accept a suffix or build
metadata without weakening the anchored `major.minor.patch` check. Do not infer
the version from a container tag or unauthenticated endpoint.

- [ ] **Step 3: Run all four scripts independently**

```bash
rtk npm run example:workflow:atomic
rtk npm run example:workflow:retry
rtk npm run example:workflow:resume
rtk npm run example:workflow:stale-contract
```

Capture only non-secret identifiers and structured status/code evidence. Each
script must prove its advertised success and expected failure/recovery path.

- [ ] **Step 4: Rerun with one explicit existing party**

Set `SDK_EXAMPLE_PARTY` to the actor created by the first run and rerun all four
scripts. Assert no fallback-allocation warning.

- [ ] **Step 5: Update compatibility data only if evidence requires it**

If a provisional structured code is wrong, first add a failing classifier test
using the observed normalized error, then update only
`workflow-compatibility.ts`. Rerun the complete 3.5.7 sequence on the new final
tree.

- [ ] **Step 6: Commit any TDD live fix narrowly**

Skip this step when no source change was required. Never commit the ignored
report.

## Task 12: Exact Participant 3.5.8 comparison and final reproof

**Files:**
- Modify: `examples/shared/workflow-compatibility.ts` only if an observed
  semantic difference requires it.
- Modify corresponding tests and README only with evidence.
- Record ignored evidence: `.superpowers/sdd/2026-08-01-application-workflow-examples/task-12-live-358-report.md`

- [ ] **Step 1: Verify the isolated sidecar without changing Quickstart**

Confirm the separate Compose project owns ports `8901/8902/8975`. Refresh the
token without printing it:

```bash
eval "$(canton-localnet-participant-358-start --refresh-token)"
```

- [ ] **Step 2: Prove authenticated 3.5.8 release core**

Use participant status or another authenticated admin call and require
the tested parser to return release core `3.5.8`; record the full returned
version including any suffix/build metadata.

- [ ] **Step 3: Run the unchanged four-script matrix**

Export the sidecar Ledger/Admin endpoints and run atomic, retry, resume, and
stale-contract scripts independently. Refresh the five-minute token when
needed. Record structured outcomes without token values.

- [ ] **Step 4: Prove explicit-party reuse**

Rerun all four with one supplied sidecar-hosted party and no fallback warning.

- [ ] **Step 5: Compare normalized outcomes**

If 3.5.7 and 3.5.8 behave identically, retain the common path and document that
fact. If they differ, add a failing compatibility test for both observed
outcomes, implement the smallest data-only selection, print the chosen path,
and explain the recommended multi-version handling in README.

- [ ] **Step 6: Reprove both versions after any change**

Any source change discovered on 3.5.8 invalidates earlier final-tree evidence.
Rerun the complete Task 11 and Task 12 matrices on the same final commit.

- [ ] **Step 7: Commit evidence-backed compatibility documentation**

Stage only source/tests/README changed by observed evidence. Never stage token
files, generated runtime files, or ignored reports.

## Task 13: Final verification and independent review

**Files:**
- No planned source changes.

- [ ] **Step 1: Run focused workflow tests**

```bash
rtk npx vitest run tests/unit/types/request-validation.test.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/unit/json/json-command-submission.test.ts tests/unit/examples tests/unit/package/npm-pack-verification-script.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run build, full tests, and live tests**

```bash
rtk npm run examples:check
rtk npm run build
rtk npm test
rtk npm run test:live
```

Expected: PASS, with only intentional skips.

- [ ] **Step 3: Audit lint accurately**

Run full lint and direct lint on every changed lintable file. The repository has
known baseline lint debt; require zero findings on changed lines and report the
baseline count separately.

- [ ] **Step 4: Verify package and fixture integrity**

```bash
rtk npm run verify:pack
rtk npm run test:participant-358-sidecar-script
rtk sha256sum examples/assets/canton-explorer-debug-playground-0.1.0.dar
```

Require SHA-256
`307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29`.
Run `npm pack --dry-run --json` and require zero `examples/` and zero
`node/.generated/` entries.

- [ ] **Step 5: Audit scope, secrets, and worktree**

```bash
rtk git diff --check
rtk git status --short
rtk git diff --cached --name-only
```

Audit the implementation range for bearer/JWT literals and CN Quickstart file
changes. Require only unrelated user-owned files that were present at execution
start to remain dirty. The current implementation plan must already be tracked
and committed, so it is never an allowed untracked exception here.

- [ ] **Step 6: Dispatch final independent code review**

Review the complete implementation against the approved design, both ignored
live reports, public transport contracts, bounded lifecycle behavior, package
safety, and user-owned worktree preservation. Fix every Critical or Important
issue through TDD and rerun affected live matrices.

- [ ] **Step 7: Re-run final verification after the last fix**

Completion claims must cite results from the final HEAD, not an intermediate
commit.
