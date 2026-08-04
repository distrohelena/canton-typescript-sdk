# Live Query Exact Archive Offset Design

## Problem

The parity fixture currently reads the participant's global ledger end after
archiving its contract and stores that value as `archivedAtOffset`. Concurrent
writers can advance the global end beyond the last transaction visible to the
limited-party PQS ingestion user. PQS can then contain every fixture relation
while its watermark can never reach the unrelated global offset.

## Design

Add `archiveLiveIouAsync` beside the existing create helper. It submits the
fixture's `Archive` command with `submitAndWaitForTransactionAsync`, extracts
the exact generated `response.transaction.offset`, validates it as a canonical
positive decimal string with `/^[1-9]\d*$/`, and returns it. Missing
transactions and empty, zero, signed, or nonnumeric offsets fail immediately
with an explicit fixture error.

`seedLiveQueryParityFixtureAsync` uses this returned value directly as
`archivedAtOffset` and no longer reads the later global ledger end. The pruning
fixture is unchanged: pruning semantics still require its dedicated participant
ledger end after the archive.

## Tests

Offline unit tests mock the command service with a generated
`Transaction.create({ offset: "157" })`, assert the helper returns that exact
offset, and verify it used the transaction-returning submission method. A
parameterized malformed-response test covers missing transaction, empty, zero,
signed, and nonnumeric offsets. Focused tests, ESLint, the ESM/CJS build, diff
checks, and an explicit no-diff check for the pruning fixture complete the work;
the controller owns the live rerun.
