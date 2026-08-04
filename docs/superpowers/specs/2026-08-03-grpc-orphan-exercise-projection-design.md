# gRPC Orphan Exercise Projection Design

## Problem

Ledger history projected to limited parties is not necessarily closed under
contract creation visibility. A party can see exercise events for a contract
without seeing its create event. `mapGrpcQueryRelationFragment` currently treats
that valid projection as corrupt and throws when its in-memory contract map has
no target.

Pruning completeness is a separate concern already enforced before mapping by
`GrpcQuerySnapshotReader`; the relation mapper must faithfully materialize the
projected events it receives.

## Design

The exercised-event loop will always validate the event template and emit the
transaction, event, exercise, package, and type-identity rows. When a real
contract row exists, `contractTpePk` continues to use its creation template,
preserving upgraded-template behavior. When no contract row exists,
`contractTpePk` uses the exercise event's template identity.

Only real create/ACS contract rows participate in lifecycle state. An exercise
against an already archived known contract remains contradictory and throws. A
consuming orphan exercise emits an exercise row but creates no contract row,
records no inferred archive, and creates no hidden lifecycle state. Multiple
orphan exercises therefore materialize independently.

## Tests

Replace the old assertion that an unknown contract rejects with a regression
using a consuming orphan exercise. Assert one transaction, one event, one
exercise, zero contracts, and `contractTpePk` equal to the contract-type identity
derived from the exercise template. Existing tests continue to prove that known
targets use their creation identity across upgrades and that contradictory known
lifecycle data is rejected.

Run the focused relation mapper, gRPC query client, and related query suites,
then focused ESLint, the TypeScript ESM/CJS build, and diff checks. The controller
owns the subsequent live parity rerun.
