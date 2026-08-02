# Command Completion Correlation Example Design

## Goal

Add standalone example 94 to demonstrate the race-free way to correlate a
caller-controlled command with its Ledger API completion, while proving the
same behavior on Canton 3.5.7 and 3.5.8. This is example-only workflow code, not
yet a general SDK completion-waiting API.

## Decisions

- Add `examples/94-command-completion-correlation.ts` and the package command
  `example:workflow:command-completion`.
- Add the command and explanation to the Workflow examples section of `README.md`.
- Keep a narrowly scoped `waitForCommandCompletionAsync` in
  `examples/shared/command-completion-correlation.ts` if extraction makes the
  example readable. Do not export it from `src/index.ts` or publish it as SDK
  API until at least one independent consumer establishes a reusable contract.
- Use `OperationDeadline` across setup, submission, and the completion-stream
  lifecycle. Do not add an idle probe or translate an in-flight stream deadline
  error.
- The normal example proves a successful completion. A rejected-command
  completion proof is conditional on actual Ledger API behavior, not assumed
  from an RPC error or matched by message text.

## Workflow

The example creates the deadline at the start of its workflow, then uses fresh
`deadline.createRequestOptions()` for every unary setup RPC: fixture/DAR
visibility and upload, party resolution, participant-status compatibility read,
and `stateService.getLedgerEndAsync`. It retains the existing explicit-party
behavior: `SDK_EXAMPLE_PARTY` uses that party; otherwise the existing fallback
allocation warning applies. It retains the current localnet endpoint, TLS, and
credential rules and never print tokens or refreshed sidecar credentials.

After obtaining a nonempty ledger-end offset, create this generated request:

```ts
ledgerApiV2.GetCompletionsRequest.create({
    parties: [actor.party],
    beginExclusive: savedLedgerEndOffset,
})
```

Obtain `client.commandCompletionService.getCompletionsAsync(request,
deadline.createRequestOptions())`, take its async iterator, and call `next()`
before submitting the command. That first `next()` is the lazy stream's actual
start; it must be retained and awaited after submission, not delayed until after
the submission returns. This order ensures the stream begins from the exact saved
exclusive offset before the command can produce a completion.

Generate a unique `runId` with `randomBytes`, then use a unique,
caller-controlled `commandId` (for example
`completion-correlation-${runId}`) in `buildCreateMessageRequest`. Submit through
the existing `submitAndWaitForTransactionAsync` with a fresh deadline request
option. The created Message marker may also include the run ID so a human can
inspect durable ledger state, but matching is by exact command ID.

Read the already-started result and subsequent iterator reads until a matching
completion arrives. Ignore `offsetCheckpoint` responses and completion records
whose `commandId` differs. Never reject ordinary unrelated activity; other users
and examples may share the participant. If the stream ends before a match, fail
with a structural error. If deadline expiry occurs before starting a request,
`OperationDeadline` yields `TimeoutError`; if the submitted unary call or
already-started stream reaches its transport deadline, leave the original
transport error untouched.

For the exact completion, assert:

- it is a `completion` oneof and `completion.commandId === commandId`;
- its success status is structurally successful: record the live representation
  and accept only the Ledger API's success encoding (an absent optional status or
  explicit `status.code === 0`); any present nonzero code is rejected without
  inspecting `status.message`;
- `updateId` is nonempty;
- the returned `actAs` has exactly the submitted actor as a set (order is not
  significant, because the generated API documents no ordering guarantee);
- `submitAndWaitForTransactionAsync` returned a nonempty `transactionId`, and
  `completion.updateId === response.transactionId` when these values represent
  the same transaction as they do on the present gRPC path.

If a compatible server proves a different but legitimate identifier relation,
document it in the matrix and correlate through `UpdateService.getUpdateById` or
`getUpdateByOffset` only when an existing public method supplies the required
identifier. Do not fabricate a new lookup API for this example. The primary
successful path must correlate as strongly as the currently returned transaction
identifier permits.

The iterator is closed with `return?.()` after the match or failure and the
client is disposed exactly once. Reuse/adapt the existing
`cleanupWithoutMaskingAsync` and client-disposal lifecycle so a submission,
stream, assertion, or timeout failure remains the primary error; cleanup errors
surface only when there was no primary failure.

## Example-only helper boundary

If a shared helper is used, it accepts the prepared iterator, its already-issued
first `next()` promise, exact command ID, submitted transaction identifier, and
expected actor. It owns checkpoint/unrelated-completion filtering, structural
success validation, update-ID correlation, and iterator cleanup. It must not
know DAR details, party allocation, environment variables, or Message payload
policy. The top-level example owns setup, command construction/submission,
logging, and client disposal.

Do not make this helper an SDK service method or a root export. A general API
would need product decisions not demonstrated by one example: identity/user
filtering, stream ownership, cancellation, response normalization, transaction
lookup capabilities, retries, and what to do with rejected completions.

## Rejected-command investigation and strict compatibility outcome

The generated `Completion` contract says it can represent successful or failed
commands (`status`, `updateId`, `actAs`, and `offset` are available), but that
does not prove that the particular submit-and-wait path emits a rejected
completion visible to this caller. Investigate before adding a negative proof:

1. On each authenticated participant, save ledger end, start the matching
   completion stream first, submit a deliberately invalid command with a fresh
   unique command ID, and retain the RPC error structurally (gRPC code and
   decoded status only).
2. Continue the already-started stream through a bounded `OperationDeadline`;
   record whether an exact-command completion arrives, whether its status is
   present/nonzero, whether `updateId` is empty, its `actAs` set, and its offset.
   Never use status-message prose as evidence.
3. Repeat on Participant 3.5.7 and on the isolated 3.5.8 sidecar using the
   documented protected child-shell credential refresh flow. Capture authenticated
   full participant version and parse the release core using the existing
   `workflow-compatibility` convention.

There are only two acceptable outcomes. If both releases demonstrate the same
rejected completion semantics, add a negative assertion to example 94 using
exact command ID, structured nonzero status, empty/non-success update ID as
actually observed, and actor correlation—never error text. If either release
does not provide a visible rejected completion or their semantics differ,
document the observed difference in README/live evidence and ship the safest
common implementation: the successful-correlation proof only. Do not branch by
container tag, endpoint, or version string merely to force the negative case.

## Tests and documentation

Add focused unit tests for the example-only matcher/lifecycle with generated
completion messages and a fake async iterator. Cover the exact order: saved
ledger end, first `next()` issued before submit, checkpoint ignored, unrelated
completion ignored, exact match accepted, nonzero status rejected structurally,
missing update ID rejected, unordered `actAs` accepted as a set, wrong actor or
wrong update ID rejected, stream end, pre-dispatch `TimeoutError`, untouched
post-dispatch transport error, iterator cleanup, and primary-failure precedence.

Update `tests/unit/examples/application-example-sources.test.ts` for source
shape only where it adds durable value; avoid brittle tests that prescribe local
variable names. Update `tsconfig.examples.json` coverage if needed, retain the
existing `examples:check` command, and add the package script following the
existing `npm run build && node --loader ts-node/esm ...` pattern. README must
say that the command is standalone, creates durable Message state, honors the
same `SDK_EXAMPLE_*` endpoint/auth/TLS/party/timeout variables, starts its
completion stream from saved exclusive ledger end before submission, and is
proved through the live matrix below. Correct the stale API-support entry that
calls `commandCompletionService` a placeholder: document its existing
gRPC-only `getCompletionsAsync(...)` stream without implying that a public
wait-for-completion helper exists.

## Live proof matrix

Before documenting success, run the unchanged example implementation against
both environments and record only non-sensitive evidence:

| Environment | Required evidence | Expected common result |
| --- | --- | --- |
| Authenticated Participant 3.5.7 | authenticated full version/release core, saved offset, unique command ID, completion kind, success-status representation, nonempty update ID, actor-set result, submitted transaction ID correlation | exact successful completion with common path |
| Isolated authenticated Participant 3.5.8 | same fields, with sidecar credential refreshed privately if needed | same implementation and common path, unless evidence establishes a narrow documented difference |

Both rows must use the same source and no version branch unless live structural
evidence requires a narrowly scoped branch. The final README claim must state
whether the negative rejected-command proof was established on both versions or
was intentionally omitted, and why.

## Alternatives and trade-offs

- Starting a completion stream after submission is shorter but leaves a race in
  which the relevant completion can be missed; saved offset plus first `next()`
  before submit closes that gap.
- Matching payload text or gRPC/status messages is easy to read but unsafe under
  unrelated activity and version wording changes; exact command ID and generated
  structural fields are stable correlation data.
- Publishing `waitForCommandCompletionAsync` now would make one example look
  cleaner but prematurely freezes cancellation, timeout, identity, and failure
  semantics. An example/shared helper preserves reuse evidence without SDK debt.
- Forcing a rejected-command assertion without live evidence could turn an API
  visibility difference into a false portability claim; a success-only common
  proof is more valuable than a speculative negative test.

## Success criteria

- `npm run example:workflow:command-completion` runs standalone and uses a
  unique caller-controlled command ID.
- Its completion stream is actually started from the exact saved exclusive
  ledger-end offset before submission; checkpoints and unrelated completions do
  not affect the result.
- The exact completion proves structural success, nonempty update ID, expected
  `actAs`, and the strongest available transaction correlation, with a single
  `OperationDeadline` across the workflow and no cleanup masking primary errors.
- The example helper remains example-only, and the README/live matrix proves the
  unchanged common implementation on 3.5.7 and 3.5.8 or clearly documents the
  evidence-backed narrow difference. A rejected completion is asserted only when
  both actual Ledger API implementations demonstrate it.
