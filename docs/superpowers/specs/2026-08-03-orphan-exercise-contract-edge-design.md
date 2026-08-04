# Orphan Exercise Contract Edge Design

## Problem

Projected history can legitimately contain an exercise whose contract creation
is not visible. The gRPC relation mapper now emits that exercise without a
fabricated contract, but `createQueryDataset` still rejects the otherwise
complete snapshot because the canonical `exercises.contract` to-one edge is
declared non-nullable.

PQS already represents the same missing target as SQL `NULL`, and its result
mapper returns `contract: null`. `ExerciseResult.contract` is already optional.

## Design

Change only `queryRelationEdges.exercises.contract.nullable` from `false` to
`true`. A complete dataset may then have no target for this to-one edge, and the
existing in-memory include shaper returns `null`, matching PQS behavior. The
edge remains complete: no `complete: false` marker is added, so traversal is a
known absent relationship rather than unavailable snapshot data. Public result
types remain unchanged.

Alternatives are rejected: marking the edge incomplete would make valid
includes throw, fabricating a contract would invent ledger facts, and adding a
gRPC-client special case would leave canonical and PQS semantics inconsistent.

## Test

Build a canonical dataset from the conformance fixture after removing the
contract targeted by one exercise. Assert dataset creation succeeds and an
in-memory `exercises` query with `include: { contract: true }` returns that
orphan exercise with `contract: null`. Before the schema change, the regression
must fail with `Dataset exercises.contract has no target`.

Run focused dataset/evaluator, gRPC relation/client, and full offline query tests,
then focused ESLint, the ESM/CJS build, and diff checks. The controller owns the
live rerun.
