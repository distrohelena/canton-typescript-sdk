# Application Workflow and Retry Examples Design

## Purpose

Extend the standalone TypeScript SDK examples with production-oriented ledger
workflows. The new examples must teach both the successful operation and the
failure or recovery behavior that makes the operation safe in a real
application.

The same workflow implementation should run against Canton Participant 3.5.7
and the isolated Participant 3.5.8 sidecar. If live evidence proves that the
participants expose different valid behavior, the examples should show that
difference behind one narrow compatibility boundary and explain the preferred
multi-version handling.

## Goals

- Add four independently runnable TypeScript examples:
  - atomic create-and-exercise;
  - idempotent command retry and deduplication;
  - update-stream resume from a saved offset;
  - archival and stale-contract rejection.
- Demonstrate a successful path and a deliberate, asserted failure or recovery
  path in every example.
- Expose caller-controlled command IDs and deduplication periods through the
  public SDK request model.
- Preserve command fields through all transports that support them and reject
  unsupported combinations explicitly rather than silently dropping fields.
- Use structured error/status data instead of matching human-readable error
  strings.
- Bound all streams and network calls with deadlines and deterministic cleanup.
- Prove the final implementation live on exact Participant 3.5.7 and 3.5.8.

## Non-goals

- Adding another DAR or changing the Canton Explorer Debug Playground fixture.
- Adding reassignment, topology-writing, user-administration, or external
  signing examples in this batch.
- Hiding participant differences by limiting the examples to the lowest common
  denominator.
- Adding speculative version branches before live evidence demonstrates a
  difference.
- Building a general retry framework for arbitrary application operations.

## Public SDK API

`SubmitCommandRequest` will accept two optional caller controls:

```ts
commandId?: string;
deduplicationPeriod?:
  | { kind: "duration"; seconds: number }
  | { kind: "offset"; offset: string };
```

When `commandId` is absent, the SDK retains its current generated-UUID
behavior. When `deduplicationPeriod` is absent, the SDK leaves the period unset
and lets Canton apply its normal behavior.

Validation will require command IDs to be LedgerStrings: 1 through 255
characters matching `[A-Za-z0-9#:\-_/ ]+`. It will reject non-positive or
unsafe-integer duration seconds, malformed union values, and offsets that are
not canonical unsigned decimal `int64` strings in the inclusive range
`0..9223372036854775807` before transport I/O. The SDK intentionally exposes
only positive duration seconds even though the wire type can encode zero. It
defines the union as a public transport-independent type; the examples do not
expose generated protobuf duration types.

The normal gRPC command mapper will forward both controls into `Commands`.
Interactive prepare will use the caller's command ID when present, and
interactive execute will forward the deduplication period. Normal submission
accepts offset `0` as participant begin, but interactive execute requires a
positive offset. The interactive pipeline therefore rejects offset `0` with a
`ValidationError` before calling its transport. The JSON mapper must first be
checked against the supported JSON Ledger API request schema. It will either
forward the fields faithfully or reject an unsupported deduplication option
with `TransportError` before HTTP I/O. It must never replace a caller-provided
command ID or silently ignore deduplication.

Mapper tests will cover the generated default, explicit command ID, duration,
offset, validation failures, normal submission, transaction submission, and
interactive prepare/execute. JSON tests will document either parity or the
explicit rejection contract.

## Example Programs

### `90-atomic-create-and-exercise.ts`

The example resolves or allocates its actor, loads and uploads the pinned DAR,
and builds a `CreateAndExerciseCommand` for
`DebugPlayground:Message.ReplaceText`.

It first submits a separate request with an intentionally unknown choice and
asserts a structured ledger rejection. It then submits the valid atomic
command and proves that the response contains the archive of the transiently
created contract and the creation of the replacement contract. A paginated ACS
query must find the replacement with the exact expected text.

The invalid and valid requests use different command IDs so the negative path
cannot poison the successful path through deduplication.

### `91-idempotent-command-retry.ts`

The example creates a unique run marker and a deterministic command ID, then
submits a `Message` create with an explicit duration-based deduplication period.
It repeats the exact same request as a simulated retry.

The first submission must succeed. The second must be classified as a known
deduplication outcome rather than another creation. The example then paginates
the active-contract snapshot and proves that exactly one `Message` with the run
marker exists.

The example prints the command ID, first update/transaction identifier, retry
classification, participant version, and selected compatibility path. It does
not claim that a duplicate returns the original response; a structured
duplicate rejection is a valid safe-retry outcome.

### `92-resume-update-stream.ts`

The example creates a pre-offset contract with a unique marker, reads and saves
the ledger end, and opens an update stream beginning exclusively after that
offset. It computes one absolute deadline at startup. The idle probe receives
`min(2_000 ms, floor(SDK_EXAMPLE_TIMEOUT_MS / 4))`, with a minimum of 1 ms, as
its sub-budget. With no post-offset target submitted yet, that probe must time
out and dispose of the stream cleanly without consuming a fresh overall
timeout.

It then creates a second, post-offset contract and opens a fresh stream from
the saved offset. Before every submission, stream read, or cleanup operation,
the helper computes `deadline - now` and passes that remaining duration through
`RequestOptions` or the stream lifecycle helper. The resumed stream may contain
unrelated updates, but it must not contain the pre-offset contract. It must
eventually observe the exact post-offset contract and return a non-empty update
ID and offset before the original overall deadline.

The shared lifecycle helper owns lazy-stream startup, timeout, cancellation,
pending-iterator rejection observation, and client disposal. Cleanup failures
must not replace the primary timeout or ledger error.

### `93-archive-and-stale-contract.ts`

The example creates a `Message`, exercises `ReplaceText`, and extracts the
archived original and created replacement IDs. It paginates ACS to prove that
the original is absent and the replacement is active with the exact expected
payload.

It then tries to exercise the archived original with a distinct command ID and
asserts the structured inactive/stale-contract rejection. The final output
reports both IDs and the normalized failure classification.

## Shared Example Components

The examples will extend the existing application fixture and ledger-request
helpers rather than duplicating transport setup or payload parsing. New shared
components may include:

- builders for create-and-exercise and caller-controlled command requests;
- paginated collection/counting of run-scoped active contracts;
- active/absent contract assertions;
- a structured ledger-failure classifier;
- participant version/capability reporting;
- a resumable bounded-update-stream helper.

Only stable, transport-independent behavior belongs in the public SDK. Workflow
assertions and compatibility presentation remain under `examples/shared` until
there is evidence that normal SDK consumers need them.

## Compatibility Strategy

The implementation starts with one shared path for 3.5.7 and 3.5.8. Each live
run records the exact participant version from the API and the structured
success/failure outcome.

If the versions differ, a single application-example compatibility module will
normalize only the observed semantic difference. Capability or response-shape
inspection is preferred. A participant-version check is allowed only when the
server exposes no usable capability signal.

The compatibility module will:

- name the capability being handled;
- list the observed structured outcomes for supported participants;
- print the detected participant version and selected path;
- reject unknown outcomes or unsupported versions clearly;
- contain no command construction, stream lifecycle, or business assertions.

Scattered version comparisons and duplicated `-357`/`-358` scripts are not
allowed. If no difference is observed, no version-specific branch is added.

## Error Handling

Expected negative paths must match stable structured data such as transport
error type, gRPC status code, JSON error code, or typed completion status.
Human-readable server descriptions may be printed for diagnostics but are not
assertion inputs.

Unexpected errors propagate through the existing top-level example runner.
Every client and stream is disposed in `finally`. Each example uses the common
`SDK_EXAMPLE_TIMEOUT_MS` deadline, and pagination or retry loops share one
absolute deadline rather than resetting time per request. Helpers accept either
that deadline or an explicit remaining budget; they do not create a new full
timeout after the idle probe.

Examples must reject empty IDs, offsets, payloads, and version strings. A
duplicate page token, changed ACS snapshot offset, ended stream, repeated
unexpected event, or cleanup path that masks a primary error is a hard failure.

## Tests

Unit and source-contract tests will cover:

- `SubmitCommandRequest` LedgerString, canonical `int64` offset, duration, and
  default validation;
- gRPC, JSON, transaction, and interactive mapper behavior;
- duration and offset deduplication mapping, including normal offset `0` and
  interactive pre-I/O rejection of offset `0`;
- atomic-response archive/create extraction;
- run-scoped ACS pagination and exact cardinality;
- structured duplicate, invalid-choice, and stale-contract classification;
- compatibility selection for every observed 3.5.7/3.5.8 outcome;
- idle-probe sub-budget, remaining-overall-budget propagation, resume offset,
  cancellation, and iterator cleanup;
- each script's advertised success, negative path, proof, and bounded cleanup.

Live acceptance will run the same final tree against exact Participant 3.5.7
and the isolated 3.5.8 sidecar:

1. Prove the API version.
2. Upload the pinned DAR and prove visibility.
3. Run all four scripts independently.
4. Where applicable, rerun with an explicitly supplied existing party.
5. Record success identifiers and structured expected-failure classifications.
6. If a 3.5.8 discovery changes code, rerun the complete 3.5.7 sequence on the
   final tree.

The 3.5.8 token will be refreshed through the documented Docker-free launcher
mode as needed. Token contents must never enter reports or commits.

## Documentation and Packaging

`package.json` will expose one `example:*` script per new program. The README
will explain the successful and negative paths, durable localnet effects,
command-deduplication semantics, stream offset exclusivity, and any proven
participant-version difference.

The examples and pinned DAR remain repository-only. `npm run verify:pack` and a
dry-run tarball audit must continue to exclude `examples/` and
`node/.generated/` while retaining the published launchers.

## Completion Criteria

- All four scripts are standalone, bounded, and independently runnable.
- Every script proves both its success path and its expected failure/recovery
  path.
- Caller-controlled command IDs and deduplication periods are public, validated,
  and never silently dropped.
- The final implementation passes focused tests, build, full tests, live tests,
  package verification, changed-line lint, and diff/leak audits.
- Exact 3.5.7 and 3.5.8 live evidence exists for the same final code, with any
  required difference isolated and documented.
