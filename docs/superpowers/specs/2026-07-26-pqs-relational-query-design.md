# PQS Relational Query Design

## Goal

Make the eight built-in PQS relations a typed relational query surface capable
of expressing Explorer reads without falling back to `$queryRaw`. The surface
covers relation composition, joined and custom projections, JSON extraction,
grouping, time buckets, multi-field ordering, and aggregate calculations.
`$queryRaw` remains a read-only emergency escape hatch for PostgreSQL features
that the typed API does not yet model.

The supported relations are `contracts`, `contractTypes`, `events`,
`exercises`, `exerciseTypes`, `packages`, `transactions`, and `watermark`.
This version deliberately does not expose caller-registered relations or
arbitrary SQL joins.

## Relation profile

`PqsSchemaProfileV1` owns a fixed, versioned relation graph. In addition to the
existing physical column metadata, the graph declares every allowed edge:

- source and target relation;
- source and target key fields;
- cardinality (`one` or `many`);
- nullability;
- fields usable for JSON extraction and time bucketing.

The graph is fixed as follows. Reverse edges are present wherever the listed
forward edge has a `many` inverse; `watermark` has no edges.

| Source | Edge | Target | Key pair | Cardinality |
| --- | --- | --- | --- | --- |
| `contracts` | `contractType` | `contractTypes` | `tpe_pk → pk` | one |
| `contracts` | `createdTransaction` | `transactions` | `created_at_ix → ix` | one |
| `contracts` | `archivedTransaction` | `transactions` | `archived_at_ix → ix` | zero-or-one |
| `contracts` | `exercises` | `exercises` | `contract_id ← contract_id` | many |
| `contractTypes` | `contracts` | `contracts` | `pk ← tpe_pk` | many |
| `contractTypes` | `exercises` | `exercises` | `pk ← contract_tpe_pk` | many |
| `events` | `transaction` | `transactions` | `tx_ix → ix` | one |
| `events` | `exercises` | `exercises` | `pk ← exercise_event_pk` | many |
| `exercises` | `exerciseType` | `exerciseTypes` | `tpe_pk → pk` | one |
| `exercises` | `contractType` | `contractTypes` | `contract_tpe_pk → pk` | one |
| `exercises` | `event` | `events` | `exercise_event_pk → pk` | zero-or-one |
| `exercises` | `transaction` | `transactions` | `exercised_at_ix → ix` | zero-or-one |
| `exercises` | `package` | `packages` | `package_pk → pk` | one |
| `exercises` | `contract` | `contracts` | `contract_id → contract_id` | one |
| `exerciseTypes` | `exercises` | `exercises` | `pk ← tpe_pk` | many |
| `packages` | `exercises` | `exercises` | `pk ← package_pk` | many |
| `transactions` | `events` | `events` | `ix ← tx_ix` | many |
| `transactions` | `createdContracts` | `contracts` | `ix ← created_at_ix` | many |
| `transactions` | `archivedContracts` | `contracts` | `ix ← archived_at_ix` | many |
| `transactions` | `exercises` | `exercises` | `ix ← exercised_at_ix` | many |

JSON-capable fields are `contracts.payload`, `exercises.argument`,
`exercises.result`, and `transactions.traceContext`. The sole v1 bucketable
field is `transactions.effectiveAt`; it can be reached through the listed
edges. Numeric aggregate fields remain those declared by the existing profile.
A relation name, edge name, column, or join condition can therefore never come
from application input.

## Public API

Every delegate retains `findMany`, `findUnique` where a stable key exists,
`count`, and `aggregate`. `findMany` gains:

- `include`: named profile edges, with nested `where`, `select`, `orderBy`,
  pagination, and further includes. To-many relations require an explicit
  bounded `take`; to-one includes do not.
- relation-aware `select`: scalar fields plus explicitly named scalar
  projections from related records and JSON paths. Nested selections retain
  their relation name rather than producing ambiguous column aliases.
- `orderBy`: one or more scalar or selected relation fields. A final stable
  primary-key tie-breaker is added whenever the requested order is not already
  stable. Relation-field ordering is limited to to-one paths. Ordering through
  a to-many edge is rejected rather than silently choosing an arbitrary child.
- typed JSON predicates and projections. A JSON path is a non-empty readonly
  sequence of string keys; the compiler uses `#>` for JSON values and `#>>`
  for scalar text extraction. Comparison, presence, and typed scalar casts are
  explicit rather than inferred.

Every collection delegate gains `groupBy`:

```ts
query.events.groupBy({
  by: ["type", { transaction: { effectiveAt: { bucket: "day" } } }],
  where: { transaction: { effectiveAt: { gte: since } } },
  aggregate: { count: true },
  orderBy: [{ effectiveAt: "asc" }],
})
```

`by` supports scalar fields, an array field (which unnests one key per array
member), a profiled JSON scalar path, and a profiled time field bucketed by
hour, day, week, or month. A related field uses the same nested object shape as
`include` and is limited to a to-one path, for example
`{ transaction: { effectiveAt: { bucket: "day" } } }`. `aggregate` supports
count and the profile-declared numeric operations. Grouped output is a typed
row whose keys mirror the group entries and requested aggregates.

## SQL compilation and mapping

The compiler creates one root SQL query and profile-approved joins. To-one
includes use left joins. To-many includes are materialized with correlated
`jsonb_agg` subqueries, so a parent occurs once and parent pagination remains
correct. The row mapper recursively turns these JSON records into typed,
nested result objects while preserving existing bigint-string, timestamp,
binary, array, and JSON mappings.

All predicate operands, JSON paths, limits, offsets, and time bucket
boundaries are SQL parameters. The only emitted SQL identifiers and operators
are selected from the versioned profile and fixed compiler tables. Invalid
field paths, edges, aggregate fields, bucket fields, or unbounded to-many
includes fail before a database call.

## Explorer coverage

The following representative compositions define the required capabilities:

| Explorer use case | Required typed composition |
| --- | --- |
| Package list | `packages.findMany({ orderBy: [{ name: "asc" }, { version: "asc" }] })` |
| Contract detail | `contracts.findUnique({ include: { contractType: true, createdTransaction: true, archivedTransaction: true, exercises: { take: 100, include: { event: true, transaction: true } } } })` |
| Recent updates | `transactions.findMany({ include: { events: { take: 500, include: { exercises: { take: 100, include: { exerciseType: true, contract: true } } } } } })` |
| Party activity | `events.groupBy({ by: ["type", { transaction: { effectiveAt: { bucket: "day" } } }], where: { exercises: { some: { witnesses: { has: party } } } }, aggregate: { count: true } })` |
| Node summary | concurrent `contracts.aggregate`, `transactions.aggregate`, and `watermark.findUnique`; cross-relation result assembly is intentionally application orchestration |
| Traffic purchases | `transactions.findMany({ where: { paidTrafficCost: { gt: "0" } }, include: { events: { take: 500 }, exercises: { take: 500, include: { package: true } } } })` |
| Token balances, holders, transfers | `contracts.groupBy` on profiled JSON `payload` paths with `active` and template filters; include create/archive transactions and exercises for transfer history |
| Active parties | `contracts.groupBy` over witness-array membership/count semantics, with optional template and active filters |

The API therefore also defines relation predicates: a to-one edge accepts a
nested where expression; a to-many edge accepts `some`, `none`, or `every`.
These are needed for activity and token queries. Array grouping is explicitly
defined as `unnest`-then-group with the result key named by the requested array
field. Those are compositions of relation traversal, JSON extraction,
filtering, grouping, and aggregate operations; the SDK does not add token or
traffic domain helpers. Cross-node/global views remain orchestration above an
individual PQS connection.

## Delivery slices

1. Add the typed relation graph and general query AST, then migrate existing
   single-relation reads to the shared compiler without changing results.
2. Add to-one and bounded to-many `include`, nested filters, multi-field
   ordering, and nested/custom projection.
3. Add JSON predicates/projections, grouped aggregates, and time buckets.
4. Add representative typed Explorer queries and SQL/mapping tests for each
   Explorer category; document any remaining intentionally unsupported
   PostgreSQL primitive before `$queryRaw` is used.

## Verification

Unit tests prove type-level rejection of invalid edges and fields, deterministic
SQL and parameter order, pagination with joins, nested to-one/to-many mapping,
JSON extraction, multi-field ordering, grouping, bucket behavior, aggregate
behavior, and no database call on validation failure. The full query suite,
`tsc --noEmit`, and `git diff --check` are required for every coherent slice.
