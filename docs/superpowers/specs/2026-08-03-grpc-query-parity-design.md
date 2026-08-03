# gRPC Typed Query Parity Design

## Goal

Make every typed `QueryClient` delegate behave the same when `CantonManager`
uses `QuerySource.grpc` or `QuerySource.pqs`. Callers must be able to switch the
query source setting without changing filters, selections, includes, ordering,
pagination, aggregates, grouping, or result handling.

The only deliberate capability difference is `$queryRaw`, which remains a
PostgreSQL/PQS operation. Typed gRPC queries must no longer fail with
`QueryCapabilityError`.

## Scope

This design covers all typed operations on the eight existing relations:

- `contracts`
- `contractTypes`
- `events`
- `exercises`
- `exerciseTypes`
- `packages`
- `transactions`
- `watermark`

For each delegate it covers `findMany`, `findUnique` where present, `count`,
`aggregate`, and `groupBy`, including the relational features added by the PQS
query expansion.

It also adds an explicit cache lifecycle for active gRPC contracts. The cache
does not store update history or any non-contract relation.

## Non-goals

- Interpreting PostgreSQL SQL over gRPC or adding a gRPC `$queryRaw` dialect.
- Running a background update subscription or maintaining a live local index.
- Hiding participant visibility differences between a PQS index and a Ledger
  API connection.
- Returning PQS database sequence values from gRPC. gRPC supplies stable,
  deterministic snapshot-local equivalents for storage-internal keys.
- Returning silently partial history after Ledger API pruning.

## Public compatibility contract

`QueryClient` remains the public read API. Existing typed query argument and
result types remain source-independent. The selected `querySource` is the only
setting that chooses the executor.

The following must therefore have identical meaning under both sources:

- scalar, ordered, pattern, array-membership, JSON-path, logical, and relation
  predicates;
- scalar and JSON projections;
- to-one and bounded to-many includes at every supported nesting depth;
- multi-field ordering and the same stable final tie-breaker;
- `skip` and `take` ordering;
- `count`, `min`, `max`, and `sum` null and empty-set behavior;
- grouping by scalar, array, JSON, and UTC time-bucket keys;
- `findUnique` uniqueness validation and missing-row behavior;
- runtime validation of untyped JavaScript input.

The two sources execute over their own participant-visible data. Exact query
parity does not imply that independently configured PQS and gRPC participants
observe contracts for the same parties.

## Architecture

### Canonical query model

Move query grammar, relation metadata, validation, and normalization out of the
PQS implementation into a transport-neutral query model. Public arguments are
normalized once into a canonical AST before either backend performs I/O.

The canonical model owns:

- relation names, scalar fields, unique keys, numeric fields, JSON fields,
  array fields, date fields, and relation edges;
- legal predicates, selections, includes, group keys, aggregates, and time
  buckets per relation;
- validation and canonicalization of logical expressions, page arguments,
  order clauses, projection aliases, and relation cardinality;
- stable-ordering rules and the result-shaping contract.

PQS-specific table names and column names remain in a separate physical schema
profile. The PQS compiler consumes the canonical AST and the physical profile
to produce parameterized PostgreSQL.

The gRPC executor consumes the same AST and evaluates it over a materialized,
immutable relation dataset. It must not contain per-operation capability
branches or duplicate a second query grammar.

### Components

The implementation is divided into focused units:

1. A query normalizer validates public arguments and emits canonical AST nodes.
2. The existing PQS compiler is adapted to compile those AST nodes.
3. A gRPC snapshot reader selects an immutable ledger offset and reads the data
   required by the query.
4. A gRPC relation mapper converts generated Ledger API and DAML-LF package
   values into the eight canonical row sets.
5. An in-memory relational evaluator applies the canonical AST and shapes the
   public result.
6. An active-contract cache coordinator owns explicit prewarming, lookup,
   expiry, invalidation, and concurrent-read deduplication.

The in-memory evaluator is independent of gRPC protobuf types. This keeps query
semantics testable without a participant and keeps protobuf mapping isolated.

## Consistent gRPC snapshots

Every gRPC query selects one upper-bound ledger offset before reading relation
data. All ACS and update-history calls made for that query are pinned to that
offset.

When an active-contract cache entry is used, its `activeAtOffset` becomes the
query's upper bound. Any on-demand history needed for a relational predicate or
include is read only through that offset. This produces a stale-by-choice but
internally consistent answer.

Without a usable cache entry, the executor reads the current ledger end first.
It requests ACS at that offset for active-contract-only work and requests
ledger-effects update pages from ledger begin through that offset for history.
Pagination must preserve the same update format, boundaries, and page tokens.

A request from ledger begin that crosses the participant pruning boundary must
fail. A pruning rejection, a discontinuity in required page coverage, or a
response that cannot establish the requested upper bound becomes
`QuerySnapshotIncompleteError`. The executor never drops the missing prefix and
never returns partial aggregates, groups, histories, or includes.

History is read on demand and discarded after the query. This design does not
subscribe to updates and does not assume that this SDK instance submitted the
commands that produced them.

## Relation materialization

### Contracts

Active-only queries use the ACS at the selected offset. Queries that can include
archived contracts replay ledger-effects history through that offset and join
create and consuming exercise/archive information by contract ID.

Contract rows map:

- contract ID, template identifier, create arguments, witnesses, and create
  time from `CreatedEvent`;
- `packageId` according to the existing logical PQS contract mapping, using the
  creation/representative package information exposed by the event;
- created and archived event offsets from their originating updates;
- archive time from the archiving transaction's effective time;
- `active` from the absence of an archive through the snapshot boundary.

An active-contract cache may answer only a query that the normalizer proves is
restricted to active contracts. An unconstrained `contracts.findMany`, an
inactive query, or any operation whose correct base row set includes archived
contracts must read history.

### Transactions and events

Each ledger-effects `Transaction` produces one transaction row. Ledger offset
is the canonical transaction `ix` because it is a participant-local,
monotonically ordered numeric string available from gRPC. Other fields map from
`updateId`, `effectiveAt`, `workflowId`, `synchronizerId`, `traceContext`,
transaction hash, and paid traffic cost.

Each visible created or exercised event produces an event row. Event type uses
the current PQS values (`created` and `exercised`). Event identity and ordering
come from transaction offset plus node ID. A stable numeric `pk` is assigned
after canonical sorting, and `txIx` points to the transaction offset.

### Exercises and exercise types

Each `ExercisedEvent` produces an exercise row. Choice argument, exercise
result, controllers/acting parties, witnesses, consuming flag, last descendant
node ID, target contract, template, and transaction linkage map directly from
the generated event and its transaction.

`redactionId` has no Ledger API equivalent and maps to `null`. Exercise-type
rows are deduplicated by canonical template identity plus choice and consuming
flag. Their keys are deterministic snapshot-local numeric strings.

### Contract types and packages

Contract types are deduplicated by canonical package/template identity. Module,
entity, template FQN, package name, aliases, and payload type are derived using
the same logical rules as the PQS profile.

Package queries use Package Service package IDs and package payloads. Existing
DAML-LF decoding supplies package name, version, modules, templates, choices,
and upgrade/reference metadata needed for package, contract-type,
exercise-type, and alias rows. The mapper fetches only packages needed by a
contract/history query; a direct package or type collection query lists and
resolves the complete participant-visible package set.

Package and type `pk` values are deterministic numeric strings assigned after
sorting their canonical identities. Every foreign key uses the same assigned
value within the snapshot.

### Watermark

The watermark is a singleton row for the selected snapshot. Its `ix` and
`offset` use the selected ledger offset. `instanceId` is a deterministic value
derived from the gRPC ledger endpoint/cache scope because the PQS database
instance identifier has no Ledger API equivalent.

### Deterministic storage-key rules

All synthetic storage keys must:

- be numeric strings so existing ordered filters and numeric aggregates retain
  their type contract;
- be assigned only after canonical sorting;
- be stable for identical visible data at the same snapshot offset;
- use one key registry shared by all row mappers for referential consistency;
- never be presented as a PQS database primary key.

Adding data in a later snapshot may change snapshot-local ordinals. Callers that
need durable identity must use ledger-domain keys such as contract ID, package
ID, transaction update ID, offset, and canonical template identity.

## In-memory query execution

The evaluator processes a canonical query in this order:

1. Validate and normalize arguments before snapshot I/O.
2. Select and materialize the minimum complete relation graph needed by the
   normalized query.
3. Apply scalar, JSON, logical, and relation predicates.
4. Apply grouping and aggregates, or stable ordering followed by `skip` and
   `take` for row queries.
5. Apply scalar/JSON projection and recursively materialize requested includes.
6. Return immutable public rows with the same absent, `undefined`, `null`, and
   empty-array behavior as PQS.

Relation `every` retains vacuous truth for an empty related collection. String
`like` and `ilike`, JSON scalar coercions, UTC date buckets, null ordering,
array grouping, aggregate precision, and stable tie-breaking must be specified
once in the canonical model and covered by cross-source conformance tests.

## Explicit active-contract cache

Caching remains opt-in through the existing `CantonManagerOptions.cache`
configuration:

```ts
const manager = new CantonManager({
    grpc,
    querySource,
    pqs,
    cache: { store: new MemoryQueryCache(), ttlMs: 60_000 },
});

await manager.query.cacheContracts({ parties: [alice, bob] });
```

`QueryClient` gains:

```ts
cacheContracts(args?: {
    readonly parties?: readonly string[];
}): Promise<ContractCacheResult>;

invalidateContractsCache(args?: {
    readonly parties?: readonly string[];
}): Promise<void>;
```

`ContractCacheResult` is a source-discriminated union:

```ts
type ContractCacheResult =
    | {
        readonly source: QuerySource.grpc;
        readonly cached: true;
        readonly activeAtOffset: string;
        readonly contractCount: number;
        readonly expiresAt: Date;
      }
    | {
        readonly source: QuerySource.pqs;
        readonly cached: false;
      };
```

For gRPC, `cacheContracts` requires configured cache storage and a positive TTL,
reads every ACS page at one stable offset, writes the completed snapshot once,
and returns its metadata. Calls for the same canonical scope share one in-flight
read. A failed or incomplete read writes nothing.

Cache keys include the ledger endpoint/cache scope and the sorted, deduplicated
party set. Omitted parties means the existing all-hosted-party wildcard. An
entry from one party scope cannot serve another.

Ordinary query calls read a valid compatible entry but never populate or renew
one. Expired or invalidated entries are misses. Refresh is an explicit second
`cacheContracts` call. `invalidateContractsCache` removes only the exact scope.

Only active contract rows are cached. Update pages, archived contracts, events,
exercises, types, packages, transactions, watermark rows, relation graphs, and
query results are never stored by this cache.

Under PQS, both cache lifecycle methods are no-ops and `cacheContracts` returns
the PQS branch of `ContractCacheResult`. This preserves source-switchable caller
code without pretending that the SDK controls PostgreSQL caching.

## Error model

- Shared malformed query input throws the same SDK validation error before I/O
  under both sources.
- Incomplete gRPC history throws public `QuerySnapshotIncompleteError`, carrying
  the requested begin/end boundary and the underlying transport cause when one
  exists.
- Ledger API failures continue to use `GrpcTransportError`.
- PostgreSQL execution failures continue to use `PqsQueryError`.
- Typed query delegates never throw `QueryCapabilityError` merely because the
  selected source is gRPC.
- gRPC `$queryRaw` remains the sole query-surface use of
  `QueryCapabilityError`.
- Calling gRPC `cacheContracts` without configured cache storage/TTL throws an
  SDK validation error before ACS I/O.

## Testing strategy

### Canonical semantics

Build one table-driven conformance corpus for all eight relations. Each case
contains canonical fixture rows, public query arguments, and expected results.
Run it through the in-memory evaluator and use it to assert the PQS compiler's
parameterized SQL/result shaping.

The corpus covers:

- all scalar operators and logical nesting;
- relation `some`, `none`, `every`, and to-one predicates;
- nested to-one and bounded to-many includes;
- scalar and typed JSON projections;
- multi-field ordering, null ordering, stable ties, `skip`, and `take`;
- counts, numeric aggregates, empty inputs, and nulls;
- scalar, array, JSON, and UTC time-bucket grouping;
- `findUnique` on each declared unique key;
- unknown fields, invalid operators, unbounded includes, and malformed runtime
  JavaScript values.

### gRPC mapping and completeness

Focused mapper tests cover every public field and relation edge using generated
Ledger API messages and decoded DAML-LF packages. They verify deterministic
keys across input-order permutations and referential integrity across all row
sets.

Snapshot tests verify:

- one upper bound across ACS and history pages;
- all pagination requests preserve boundaries and formats;
- pruned or discontinuous history fails with
  `QuerySnapshotIncompleteError`;
- no partial rows or aggregates escape on failure;
- active-only plans avoid history, while archived/all-history plans do not.

### Cache behavior

Cache tests verify explicit prewarming, page completion before write, TTL
expiry, manual invalidation, endpoint and party isolation, canonical party
ordering, concurrent-call deduplication, no automatic writes on query misses,
and zero storage of history or non-contract rows.

### Cross-source and live verification

Add a query matrix that invokes the same public query functions through a PQS
manager and a gRPC manager connected to the same participant-visible localnet
state. Compare complete domain fields and result shapes; compare synthetic
storage fields against their deterministic mapping contract rather than PQS
database sequence values.

Live coverage includes representative nested explorer queries, grouped party
activity, transaction/event history, contract lifecycle, package/type lookup,
JSON payload grouping, and an explicit pruning failure scenario.

## Documentation and migration

Update the README to describe the query surface as source-independent rather
than describing gRPC as an ACS-only subset. Show identical query code with only
`querySource` changed, explicit `cacheContracts`, TTL/invalidation behavior,
participant visibility, snapshot staleness, synthetic storage keys, pruning
failure, and `$queryRaw` as the sole PQS-only operation.

This is an additive public API change except for removing typed gRPC capability
failures. Existing callers that configured automatic cache-on-first-query will
observe the intentional new rule: cache entries are created only by an explicit
`cacheContracts` call.

## Acceptance criteria

The work is complete when:

1. Every typed `QueryClient` operation is implemented for gRPC.
2. No typed gRPC delegate contains a `QueryCapabilityError` path.
3. The canonical conformance corpus passes for both executors.
4. gRPC relation mapping covers all public fields and edges.
5. Pruned/incomplete history fails explicitly without partial results.
6. Active-contract caching is explicit, scoped, point-in-time, and limited to
   active contract rows.
7. Switching only `querySource` preserves application query code and semantics.
8. Focused tests, the full test suite, build, lint, package verification, and
   live PQS/gRPC parity tests pass.
