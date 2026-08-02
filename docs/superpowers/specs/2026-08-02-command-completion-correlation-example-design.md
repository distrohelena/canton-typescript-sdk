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
- Require `SDK_EXAMPLE_USER_ID`; example 94 has no implicit user-ID fallback.
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
credential rules. Require `SDK_EXAMPLE_USER_ID`, reject a missing, empty, or
whitespace-only value before any RPC, and retain that exact value as the declared
submission and authenticated user. Set it explicitly on `SubmitCommandRequest`.
When bearer authentication is enabled, the configured value is an operator
precondition and must name the same Ledger API user as the bearer token's user/
subject. The example must not decode or inspect the token to discover or verify
that identity and must never log token contents or refreshed sidecar credentials.
Instead, an observed `completion.userId` mismatch is a structural correlation
failure; authentication/authorization errors from a wrongly declared user remain
their original structured transport errors.

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
option. Pass the required `SDK_EXAMPLE_USER_ID` through
`buildCreateMessageRequest` into its `SubmitCommandRequest` explicitly; update
that builder's input type as needed so the example cannot accidentally rely on
an omitted user ID. The created Message marker may also include the run ID so a
human can inspect durable ledger state, but matching is by exact command ID and
declared user ID.

Read the already-started result and subsequent iterator reads until a matching
completion arrives. Ignore `offsetCheckpoint` responses and completion records
whose `commandId` differs. Never reject ordinary unrelated activity; other users
and examples may share the participant. If the stream ends before a match, fail
with a structural error. If deadline expiry occurs before starting a request,
`OperationDeadline` yields `TimeoutError`; if the submitted unary call or
already-started stream reaches its transport deadline, leave the original
transport error untouched.

Immediately after issuing the first `next()` and before awaiting submission,
attach a non-transforming rejection observer to the original promise:

```ts
const firstNextPromise = iterator.next();
void firstNextPromise.catch(() => undefined);
const submitted = await submitAsync();
```

Retain `firstNextPromise` itself, rather than its caught derivative, and await
that original promise when beginning correlation after a successful submission.
This prevents an unhandled rejection if the stream fails while submission is in
flight without swallowing or rewriting the stream error. If submission fails,
its error is primary and cleanup must not mask it; the observer handles any
concurrent stream rejection. If submission succeeds and the first stream read
failed meanwhile, awaiting the original promise surfaces that unchanged stream
failure as the primary correlation failure.

For the exact completion, assert:

- it is a `completion` oneof and `completion.commandId === commandId`;
- `completion.userId === expectedUserId` exactly;
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
expected actor and user ID. It owns checkpoint/unrelated-completion filtering,
structural success validation, exact user-ID and update-ID correlation, and
iterator cleanup. It must not know DAR details, party allocation, environment
variables, bearer-token contents, or Message payload policy. The top-level
example owns setup, required user-ID validation, command construction/submission,
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
   present/nonzero, whether `updateId` is empty, its exact `userId`, its `actAs`
   set, and its offset. Never use status-message prose or token contents as
   evidence.
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
missing update ID rejected, unordered `actAs` accepted as a set, wrong actor,
wrong user, or wrong update ID rejected, stream end, pre-dispatch `TimeoutError`,
and untouched post-dispatch transport error. Explicitly test that the immediate
observer is attached before submission, a stream failure during a successful
submission is later surfaced from the original first-read promise, and a
submission failure remains primary if a stream and cleanup failure occur
concurrently. Cover iterator cleanup and primary-failure precedence. Add
configuration tests that a missing/blank `SDK_EXAMPLE_USER_ID` fails before any
RPC and that the exact supplied value is forwarded into `SubmitCommandRequest`;
no test may decode or inspect a bearer token.

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
wait-for-completion helper exists. State that `SDK_EXAMPLE_USER_ID` is required
(it does not default), must be nonempty, is the explicitly submitted/authenticated
user, and is matched exactly—without inspecting or logging token contents. State
the bearer-auth precondition that this declared value must equal the token's
Ledger API user/subject.

## Live proof matrix

Before documenting success, run the unchanged example implementation against
both environments and record only non-sensitive evidence:

| Environment | Required evidence | Expected common result |
| --- | --- | --- |
| Authenticated Participant 3.5.7 | invoke with `SDK_EXAMPLE_USER_ID=ledger-api-user`; capture authenticated full version/release core, saved offset, unique command ID, explicitly submitted/matched user ID, completion kind, success-status representation, nonempty update ID, actor-set result, submitted transaction ID correlation | exact successful completion with common path |
| Isolated authenticated Participant 3.5.8 | invoke with `SDK_EXAMPLE_USER_ID=ledger-api-user`; capture the same fields, with sidecar credential refreshed privately if needed | same implementation and common path, unless evidence establishes a narrow documented difference |

Both rows must use the same source and no version branch unless live structural
evidence requires a narrowly scoped branch. The final README claim must state
whether the negative rejected-command proof was established on both versions or
was intentionally omitted, and why.

For a custom 3.5.8 sidecar, do not assume `ledger-api-user`: when
`PARTICIPANT_358_SOURCE_AUTH_SUBJECT` and/or
`PARTICIPANT_358_LEDGER_USER_ID` are customized, they must designate the same
provisioned Ledger API user and `SDK_EXAMPLE_USER_ID` must be set to that exact
name for both the submission and matrix run. This is configuration validation,
not token introspection; a disagreement is a structural setup failure and must
be corrected before treating the run as evidence.

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
  unique caller-controlled command ID plus an explicit nonempty
  `SDK_EXAMPLE_USER_ID`; it has no user-ID fallback.
- Its completion stream is actually started from the exact saved exclusive
  ledger-end offset before submission; checkpoints and unrelated completions do
  not affect the result.
- The exact completion proves structural success, exact expected `userId`,
  nonempty update ID, expected `actAs`, and the strongest available transaction
  correlation, with a single `OperationDeadline` across the workflow and no
  cleanup masking primary errors. The declared user is explicitly submitted and,
  under bearer auth, configured to equal the token's Ledger API user/subject
  without token inspection; any observed completion-user mismatch fails
  structurally.
- The example helper remains example-only, and the README/live matrix proves the
  unchanged common implementation on 3.5.7 and 3.5.8 or clearly documents the
  evidence-backed narrow difference. A rejected completion is asserted only when
  both actual Ledger API implementations demonstrate it.
