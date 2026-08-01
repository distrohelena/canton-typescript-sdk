# SDK Application Examples Design

## Goal

Extend the existing standalone TypeScript example suite beyond connection,
authentication, and party creation with six runnable examples covering a
typical Canton application lifecycle: package deployment, command submission,
ledger reads, update streaming, user inspection, and topology inspection.

The examples target an already-running localnet, follow the existing
`SDK_EXAMPLE_*` configuration contract, use public package entry points, and
keep each script focused on one developer task.

## Current state

The repository currently provides:

- client initialization, TLS, and JWT authentication;
- hosted-party allocation;
- Ed25519 external-party allocation; and
- Ed25519 decentralized-party creation and hosting proof.

The public SDK also exposes package management, command submission, active
contract queries, update streaming, user management reads, and topology reads,
but none of those workflows has a standalone example.

## Chosen approach

Add one balanced batch of six examples rather than either an application-only
batch or a service-by-service catalog. The balanced batch gives a new SDK user
one end-to-end application path while adding two useful administrative reads.
It deliberately defers externally signed commands and multi-participant hosting
to a later advanced batch because those workflows require substantially more
key and localnet setup.

## Example DAR provenance

Reuse the normal DAR built by the local Canton Explorer checkout:

```text
Source checkout: /home/helena/dev/daml/canton-explorer
Source package:  debug-playground
Checkout HEAD:   750b28dd0ce4674e4368c12a6da1b5b5cbb00f88
Package commit:  abde077 (Add DAML debugger playground package)
Build SDK:       3.5.2
Artifact:        debug-playground/.daml/dist/
                 canton-explorer-debug-playground-0.1.0.dar
SHA-256:         307cf7c52ac2770d1d1a2c5e1ec56a78ab7c70e7809c0cfb419abadb93cc6e29
License:         Apache-2.0
```

Import that exact normal DAR into
`examples/assets/canton-explorer-debug-playground-0.1.0.dar`. Do not use the
larger `*-debug.dar`; source maps are unrelated to these examples. Record the
source path, checkout and package commits, hash, and rebuild command in
`examples/assets/README.md`. Implementation must verify the copied artifact's
hash before committing it.

The main package exposes `DebugPlayground:Message`, whose create arguments are
`sender`, `recipient`, and `text`. Its non-consuming `Echo` choice returns the
text, and its consuming `ReplaceText` choice accepts `replacement` and creates a
new `Message`. These small values make it suitable for raw Ledger API examples
without generated application bindings.

The examples remain repository examples. This batch does not add `examples/`
or the DAR to the npm package's `files` list.

## Shared application fixture

Add `examples/shared/application-fixture.ts` with narrowly scoped helpers:

- load the bundled DAR by `import.meta.url`;
- parse its main package ID with the public `/daml-lf` entry point;
- upload it idempotently through `packageManagementService`;
- allocate a unique hosted party when a caller did not provide
  `SDK_EXAMPLE_PARTY`;
- build the fully qualified
  `<package-id>:DebugPlayground:Message` template ID; and
- build `SubmitCommandRequest` values for `Message` create and `ReplaceText`
  operations.

The helper may centralize setup, but it must not hide the SDK call being taught
by a script. Each example should show its primary request factory and service
method directly.

Upload is idempotent: an already-known package is success. Hosted-party
allocation and contract creation are durable localnet changes, so scripts that
perform them print the same explicit warning pattern as the existing party
examples.

## New examples

### `40-dar-upload.ts`

Load the bundled DAR, derive its main package ID, list packages before upload,
upload through `packageManagementService.uploadDarFileAsync`, and list packages
afterward. Print the main package ID and whether this invocation newly exposed
it or found it already installed.

This example teaches generated request factories, binary DAR upload, package
identity, and idempotent localnet setup.

### `50-create-and-exercise.ts`

Ensure the DAR is installed, resolve or allocate an actor party, create a
`DebugPlayground:Message`, obtain the created contract ID from the transaction
response, then exercise the consuming `ReplaceText` choice. Print the original
and replacement contract IDs.

Use `commandService.submitAndWaitForTransactionAsync` so the example proves how
to recover event and contract IDs rather than relying on a sleep or a separate
database. Use explicit `actAs` and `readAs` values and public SDK command/value
types. Do not exercise the non-consuming `Echo` choice here: the current public
`SubmitCommandRequest` does not expose transaction formatting, and Canton's
default `ACS_DELTA` transaction omits its exercised event and return value.
Exposing `LEDGER_EFFECTS` command responses is SDK work outside this examples
batch.

### `60-query-active-contracts.ts`

Ensure a known active `Message` exists, then call the gRPC
`stateService.getActiveContractsPageAsync` boundary with the generated
`eventFormat` request. Filter by the actor party and fully qualified template
ID. Decode and print the matching contract ID and payload.

This example must demonstrate the generated request boundary fixed by the
protobuf migration; it must not pass the high-level query DTO directly to
`StateServiceClient`.

### `61-stream-updates.ts`

Read the ledger end, start `updateService.getUpdatesAsync` from that offset,
submit a new `Message`, and stop after observing the matching transaction. Use
the public `RequestOptions.timeoutMs` deadline so the standalone script cannot
hang. Dispose the iterator/client cleanly in `finally` and print the update ID,
offset, and created contract ID. The public stream API does not accept an
`AbortSignal`, so explicit iterator return is the cancellation mechanism when a
match is observed before the deadline.

The stream must start before command submission so the example teaches correct
race-free sequencing.

### `70-user-rights.ts`

Perform a read-only user-management walkthrough for
`SDK_EXAMPLE_USER_ID` (default `ledger-api-user`): get the user, list its rights,
and show it in a paginated user listing. Print each right in a human-readable
form.

The current SDK surface does not expose create-user, revoke-rights, or
delete-user operations. This example therefore stays read-only rather than
claiming reversible lifecycle behavior the SDK cannot provide. Adding those
operations is out of scope for this examples batch.

### `80-topology-inspection.ts`

Inspect `PartyToParticipant` state for `SDK_EXAMPLE_PARTY`. When the variable is
absent, allocate a uniquely named hosted party first so the script remains
standalone. Discover the healthy synchronizer, query the topology store with a
public SDK `ListPartyToParticipantRequest`, and print participant IDs,
permissions, thresholds, and serial/effective-state information for the party.

Warn when the fallback allocation creates durable topology state.

## Configuration and execution

Continue using the existing endpoint and authentication variables from
`examples/shared/localnet.ts`. Add only:

- `SDK_EXAMPLE_PARTY` for examples that may reuse an existing hosted party;
- `SDK_EXAMPLE_USER_ID` for the read-only user example; and
- `SDK_EXAMPLE_TIMEOUT_MS` for bounded polling/streaming, with a safe default.

Add npm scripts with stable names:

```text
example:dar:upload
example:contract:create-exercise
example:contract:query
example:updates:stream
example:user:rights
example:topology:party-hosting
```

README documentation should present the scripts in lifecycle order and state
which ones create durable localnet state.

## Error handling

- Missing endpoints, tokens, files, parties, or user IDs fail with actionable
  environment-variable guidance.
- DAR parsing validates the expected `DebugPlayground:Message` template before
  upload.
- Command examples fail if the create response lacks its created event or the
  replacement response lacks its archived and newly created event shapes.
- Query examples fail if the known contract is not observed within the bounded
  timeout.
- Update streaming always has a finite request deadline and distinguishes a
  deadline expiry from other transport/protocol errors.
- All clients and iterators are disposed in `finally` blocks.

## Testing and acceptance

Use test-driven development for shared parsing, request construction, response
extraction, update matching, and timeout behavior. Add focused unit tests under
`tests/unit/examples/` and keep the scripts thin.

Acceptance requires:

1. `npm run examples:check` passes.
2. Each new npm example script runs successfully against the existing Canton
   Participant 3.5.7 localnet.
3. The gRPC-compatible scripts also run against the isolated 3.5.8 participant
   where the operation is supported.
4. The DAR upload is idempotent on repeated runs.
5. Create/exercise prints real original and replacement contract IDs.
6. Active-contract query observes the created `Message` through generated
   `eventFormat`.
7. Update streaming terminates after the matching update and never hangs.
8. User-rights remains read-only and succeeds for `ledger-api-user`.
9. Topology inspection prints a valid `PartyToParticipant` result.
10. Relevant focused tests, build, type contract, changed-file ESLint, full
    unit/integration suite, and live suite pass.

The existing user-owned `package.json` version change and unrelated untracked
plan files must remain unstaged unless the user explicitly changes their
ownership or scope.
