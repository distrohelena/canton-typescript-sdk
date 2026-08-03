# Read-only Pruning Preflight Example Design

## Goal

Add `examples/97-pruning-preflight.ts`: a standalone, gRPC-only, read-only
preflight which classifies one operator-supplied absolute offset against the
participant's latest observed pruning watermark and a ledger-end snapshot. It
must pass unchanged against the local 3.5.7 participant and the isolated 3.5.8
participant. This example is a safety preflight for a *later* consumer action;
it neither performs nor authorizes pruning, and it does not prove that an
offset that has not yet been observed as pruned remains queryable.

`SDK_EXAMPLE_OFFSET` is required. Its value is a canonical positive decimal:
`^[1-9][0-9]*$`. The example parses every offset with `BigInt`, never with
`Number`, so int64-sized values retain their exact ordering. There is no
implicit target, ledger-end fallback, party, DAR, command submission, update
lookup, or version-dependent branch.

The implementation uses only public gRPC SDK clients and generated protobuf-ts
factories. It does not add an SDK helper: the decision is an example policy
(operator environment, sampled watermark, and deliberately cautious wording),
not a generally reusable client primitive.

## Public surface audit

The public surface is sufficient without a new SDK export:

- `client.stateService.getLatestPrunedOffsetsAsync(
  ledgerApiV2.GetLatestPrunedOffsetsRequest.create(), options)` returns
  `participantPrunedUpToInclusive` and
  `allDivulgedContractsPrunedUpToInclusive`.
- `client.stateService.getLedgerEndAsync(
  ledgerApiV2.GetLedgerEndRequest.create(), options)` returns the absolute
  ledger end.
- `client.pruningService.getScheduleAsync(
  comDigitalasset.canton.admin.pruning.v30.GetScheduleRequest.create(),
  options)` and `getParticipantScheduleAsync(...)` are public, read-only
  participant-admin calls.
- `client.pruningService.getSafePruningOffsetAsync(
  comDigitalasset.canton.admin.participant.v30.GetSafePruningOffsetRequest.create({
  beforeOrAt,
  ledgerEnd,
  }), options)` exposes an explicit generated oneof.

The normal example client already exports independently configurable ledger and
participant-admin endpoints and per-surface credentials. Thus the optional
context reads are cleanly available in both local stacks. They remain context,
not inputs to or evidence for the classification: the safe-pruning response is
about a candidate administrative pruning decision, while schedule responses
are configuration. None can establish whether this participant has already
pruned the requested ledger offset.

## Authoritative sampling and classification

The workflow creates exactly one `OperationDeadline` as its first action. All
calls receive a fresh `deadline.createRequestOptions()`; no helper makes a
second relative timeout. After parsing the required target, the authoritative
state reads occur in exactly this order, with no schedule or safe-pruning call
interleaved:

1. `GetLatestPrunedOffsets` (`before`)
2. `GetLedgerEnd` (`ledgerEnd`)
3. `GetLatestPrunedOffsets` (`after`)

Every response offset uses canonical non-negative decimal syntax
`^(?:0|[1-9][0-9]*)$` before `BigInt` conversion. Reject whitespace, signs,
decimals, negative values, leading zeroes other than `0`, missing values, and
non-strings. Enforce only invariants the ordered observations establish:

- `before.allDivulged <= before.participant` and
  `after.allDivulged <= after.participant`;
- both before watermarks are `<= ledgerEnd` (the ledger end was read after
  them);
- `before.participant <= after.participant` and
  `before.allDivulged <= after.allDivulged`.

Do **not** require the later watermarks to be at or before the saved ledger
end: the ledger can advance between steps 2 and 3. Do **not** compare a safe
pruning candidate to the participant watermark, ledger end, or target.

The classification intentionally uses the *later participant watermark* first:

| Condition | Result | Meaning |
| --- | --- | --- |
| `target <= after.participant` | `alreadyPruned` | The inclusive participant watermark proves the target was already pruned when the later read completed. |
| otherwise, `target > ledgerEnd` | `beyondLedgerEnd` | The target was beyond the saved snapshot. A subsequent ledger advance could change that fact. |
| otherwise | `notObservedPruned` | The target was at or below the saved ledger end and was not covered by the later participant watermark. It is explicitly **not proven queryable**: pruning can race after that read and other query preconditions may still fail. |

This priority is deliberate. A target that was beyond the saved ledger end but
is covered by the later watermark is reported `alreadyPruned`, because the
later inclusive participant observation is stronger for this preflight.

`allDivulgedContractsPrunedUpToInclusive` is logged and returned as an
independent secondary watermark. It is never substituted for the participant
watermark or used to alter the three-way classification.

## Read-only context

Only after the authoritative trio completes, make the three public
participant-admin reads with fresh deadline options:

1. schedule (`GetScheduleRequest.create()`),
2. participant schedule (`GetParticipantScheduleRequest.create()`), and
3. safe pruning (`GetSafePruningOffsetRequest.create({ beforeOrAt, ledgerEnd })`).

`beforeOrAt` is a current `google.protobuf.Timestamp` generated from an
injected clock. The helper requires a valid `Date` in the protobuf Timestamp
range and derives exact integral `seconds` and `nanos`; invalid clocks fail
before the safe-pruning call. The request deliberately leaves
`counterParticipantsCommitmentsState` absent. This same request shape is used
unchanged on both 3.5.7 and 3.5.8: both require the timestamp as well as the
saved ledger-end snapshot.

The helper normalizes these into bounded context:

- schedule configured/not configured;
- participant schedule configured/not configured and, when configured, its
  boolean `pruneInternallyOnly`;
- safe oneof kind: `safePruningOffset` with a canonical non-negative decimal
  offset, `noSafePruningOffset`, or a malformed/empty oneof failure.

It does not print raw protobuf objects, cron text, duration objects, headers,
credentials, endpoints, or errors. A valid schedule or safe candidate does not
make the target pruned, unpruned, permitted, or queryable. The implementation
never calls `Prune`, a schedule setter/clearer, a participant repair method,
or any other mutator.

## Structure and execution

The entry point remains thin: `runExampleAsync`, `createExampleClient`, and
`runClientWorkflowWithDisposalAsync` guarantee one client disposal without
masking a primary workflow error. `examples/shared/pruning-preflight.ts` owns
strict offset parsing, snapshot invariants, classification, and context-oneof
normalization. `examples/shared/pruning-preflight-workflow.ts` owns the single
deadline, generated requests, read order, and safe bounded log lines.

The script is named `example:workflow:pruning-preflight`; README text calls out
the required `SDK_EXAMPLE_OFFSET`, normal endpoint/auth/timeout variables, the
participant-admin credential requirement for context, no durable state, the
non-queryability caveat, and common 3.5.7/3.5.8 support.

## Testing and live proof

Unit tests first prove canonical positive target parsing; canonical
non-negative response parsing; `BigInt` ordering beyond JavaScript safe
integers; all monotonicity/range failures; inclusive precedence;
`beyondLedgerEnd`; and the cautious `notObservedPruned` label. Context tests
cover absent schedules, participant `pruneInternallyOnly`, each safe-pruning
oneof, invalid safe offsets, and prove context cannot alter classification.
Workflow tests prove exactly one deadline, fresh options, exact authoritative
call order, context only afterward, generated factories including the
validated injected current timestamp and absent commitment state, no retry,
bounded output, and disposal primary-error safety. Source contracts prohibit
version branches, JSON transport, mutations, update lookup, DAR, party
allocation, and raw numeric comparison.

Live evidence is an eight-row sanitized matrix: 3.5.7 and 3.5.8, each with a
default-target run and an independently selected explicit-target run. Both
rows still pass a required explicit `SDK_EXAMPLE_OFFSET`: “default target” is
the harness-selected current positive participant offset, while “explicit
target” is a separately supplied positive decimal (normally `ledgerEnd + 1`)
that exercises `beyondLedgerEnd`. This preserves the no-fallback program
contract while demonstrating both target classes. Each evidence row records
only release/path, source commit/common path, target class, target, sampled
watermarks, ledger end, classification, all-divulged watermark, and bounded
context kinds. It must exclude tokens, headers, endpoints, raw protobufs,
cron/durations, DAR data, party identifiers, and full error objects.
