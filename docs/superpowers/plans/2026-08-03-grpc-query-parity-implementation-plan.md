# gRPC Typed Query Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every typed `QueryClient` delegate and operation behave the same under `QuerySource.grpc` and `QuerySource.pqs`, while retaining `$queryRaw` as PQS-only and adding explicit active-contract snapshot caching.

**Architecture:** Normalize public query arguments into one transport-neutral AST. Keep PQS as a parameterized SQL executor, add a gRPC snapshot/data-provider layer that materializes the eight logical relations, and execute the same AST over immutable in-memory rows. Active-contract caching is an explicit, scoped prewarm operation; history is always read on demand and rejected when pruning makes it incomplete.

**Tech Stack:** TypeScript 5.9 strict mode, NodeNext ESM, Vitest, `@protobuf-ts`, Ledger API v2 State/Update/Package services, existing DAML-LF decoding, PostgreSQL `pg`, existing `QueryCacheStore`.

**Spec:** `docs/superpowers/specs/2026-08-03-grpc-query-parity-design.md`

---

## File structure

### Canonical query core

- Create `src/query/canonical/query-schema.ts` — source-neutral relation names, fields, edge metadata, unique keys, and scalar capabilities.
- Create `src/query/canonical/query-ast.ts` — validated AST types for predicates, projections, includes, ordering, grouping, and aggregates.
- Create `src/query/canonical/query-normalizer.ts` — runtime validation and normalization from public query arguments to the AST.
- Create `src/query/canonical/query-dataset.ts` — immutable row-set, public unique-key, and private-edge contracts.
- Create `src/query/canonical/in-memory-query-evaluator.ts` — AST evaluation and result shaping over a `QueryDataset`.
- Create `tests/unit/query/query-conformance-fixture.ts` — shared eight-relation fixture and table-driven expected queries.
- Create `tests/unit/query/query-normalizer.test.ts` and `tests/unit/query/in-memory-query-evaluator.test.ts`.

### PQS adapter

- Modify `src/query/pqs/pqs-schema-profile.ts` — retain only physical table/column mapping and import canonical relation metadata.
- Modify `src/query/pqs/pqs-sql-compiler.ts` — compile normalized contract AST.
- Modify `src/query/pqs/pqs-relational-sql-compiler.ts` — compile normalized physical-relation AST.
- Modify `src/query/pqs/pqs-query-client.ts` — normalize once before compiler/executor calls and preserve existing error wrapping/result mapping.
- Create `tests/unit/query/pqs-query-conformance.test.ts` — run the shared conformance cases through PQS SQL compilation and result shaping.
- Modify existing PQS query tests to prove SQL and results did not regress.

### gRPC data adapter

- Create `src/query/errors/query-snapshot-incomplete-error.ts` — public incomplete-history error.
- Create `src/query/grpc/grpc-query-snapshot-reader.ts` — ledger-end/pruning checks, bounded update traversal, and stable ACS traversal.
- Create `src/query/grpc/grpc-query-value-mapper.ts` — generated Ledger API value/record conversion to PQS-compatible JSON values.
- Create `src/query/grpc/grpc-relation-mapper.ts` — contracts, transactions, events, exercises, and key registry.
- Create `src/query/grpc/grpc-package-relation-reader.ts` — Package Service plus DAML-LF package/type/choice rows.
- Create `src/query/grpc/grpc-contract-cache.ts` — explicit ACS prewarm, read, invalidation, TTL metadata, and in-flight deduplication.
- Replace `src/query/grpc/grpc-contract-query-client.ts` with `src/query/grpc/grpc-query-client.ts` — complete `QueryClient` implementation using the canonical evaluator.
- Add focused unit tests for each component.

### Public facade, verification, and docs

- Modify `src/query/query-client.ts`, `src/query/canton-manager-options.ts`, `src/query/canton-manager.ts`, and `src/index.ts` for cache methods, result types, error export, and all required gRPC services.
- Modify `tests/unit/query/canton-manager.test.ts`, `tests/unit/query/query-public-contracts.test.ts`, and package-shape tests.
- Create `tests/live/runtime/live-query-manager-factory.ts`, `tests/live/runtime/live-query-pruning-fixture.ts`, `tests/live/specs/live-query-parity.test.ts`, and `tests/live/specs/live-query-pruning.test.ts`.
- Modify `README.md` and `scripts/verify-npm-pack.mjs` if the package verifier requires explicit new root-export assertions.

---

## Task 1: Define and normalize the canonical query model

**Files:**
- Create: `src/query/canonical/query-schema.ts`
- Create: `src/query/canonical/query-ast.ts`
- Create: `src/query/canonical/query-normalizer.ts`
- Test: `tests/unit/query/query-normalizer.test.ts`
- Modify: `src/query/pqs/pqs-schema-profile.ts`

- [ ] **Step 1: Write failing schema and normalization tests**

Add table-driven tests for all eight relations. Assert that normalization:

- accepts every currently typed predicate, include, projection, ordering, aggregate, and group key;
- canonicalizes `active: true` to an equality predicate;
- canonicalizes party arrays by sorting and deduplicating;
- adds the declared stable final ordering key when needed;
- marks a contract plan `activeOnly` only when every logical branch proves `active = true`;
- rejects unknown fields, invalid operators, empty/multi-field order entries, negative pages, empty selections, illegal relation quantifiers, and unbounded to-many includes before I/O.

Use a concrete first assertion:

```ts
const query = normalizeFindMany("contracts", {
    parties: ["Bob", "Alice", "Alice"],
    where: {
        active: true,
        exercises: { some: { witnesses: { has: "Alice" } } },
    },
    orderBy: [{ createdAt: "desc" }],
    include: { exercises: { take: 25 } },
});

expect(query).toMatchObject({
    relation: "contracts",
    parties: ["Alice", "Bob"],
    activeOnly: true,
    orderBy: [
        { path: ["createdAt"], direction: "desc" },
        { path: ["contractId"], direction: "asc" },
    ],
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `rtk npm run test -- tests/unit/query/query-normalizer.test.ts`

Expected: FAIL because `src/query/canonical/query-normalizer.ts` does not exist.

- [ ] **Step 3: Implement the canonical schema, AST, and normalizer**

Define one source-neutral relation union:

```ts
export type QueryRelation =
    | "contracts"
    | "contractTypes"
    | "events"
    | "exercises"
    | "exerciseTypes"
    | "packages"
    | "transactions"
    | "watermark";
```

Move logical metadata now embedded in `pqsRelationMetadata` and
`pqsRelationEdges` into `query-schema.ts`. Keep physical names such as
`__contracts`, `tpe_pk`, and `created_at_ix` in `PqsSchemaProfileV1` only.

Use explicit AST discriminants, not unvalidated `Record<string, unknown>` after
normalization:

```ts
export type QueryPredicate =
    | { readonly kind: "and" | "or"; readonly children: readonly QueryPredicate[] }
    | { readonly kind: "not"; readonly child: QueryPredicate }
    | { readonly kind: "scalar"; readonly path: readonly string[]; readonly operator: ScalarOperator; readonly value: unknown }
    | { readonly kind: "relation"; readonly edge: string; readonly quantifier: "one" | "some" | "none" | "every"; readonly predicate: QueryPredicate };

export interface NormalizedFindManyQuery {
    readonly kind: "findMany";
    readonly relation: QueryRelation;
    readonly parties?: readonly string[];
    readonly predicate?: QueryPredicate;
    readonly select?: NormalizedSelection;
    readonly includes: readonly NormalizedInclude[];
    readonly orderBy: readonly NormalizedOrder[];
    readonly skip: number;
    readonly take?: number;
    readonly activeOnly: boolean;
}
```

Export operation-specific normalizers for `findMany`, `findUnique`, `count`,
`aggregate`, and `groupBy`. Reuse existing `assertQueryPageArgs` and
`assertQueryOrderBy` only as temporary delegates; the canonical normalizer must
own the final runtime validation contract.

- [ ] **Step 4: Run focused and existing model tests and verify GREEN**

Run: `rtk npm run test -- tests/unit/query/query-normalizer.test.ts tests/unit/query/model-types.test.ts tests/unit/query/query-delegate.test.ts tests/unit/query/pqs-schema-profile.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the canonical model**

```bash
rtk git add src/query/canonical src/query/pqs/pqs-schema-profile.ts tests/unit/query/query-normalizer.test.ts
rtk git commit -m "refactor: define canonical typed query model"
```

## Task 2: Make PQS consume the canonical AST without changing behavior

**Files:**
- Modify: `src/query/pqs/pqs-sql-compiler.ts`
- Modify: `src/query/pqs/pqs-relational-sql-compiler.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Test: `tests/unit/query/pqs-sql-compiler.test.ts`
- Test: `tests/unit/query/pqs-relational-sql-compiler.test.ts`
- Test: `tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 1: Add failing PQS normalization-boundary tests**

Add tests proving that malformed runtime input fails before the fake executor is
called, while representative existing queries compile to the same SQL/value
pairs. Include contracts with nested exercise predicates and packages with
multi-field ordering.

```ts
const query = vi.fn();
const client = new PqsQueryClient({ query }, new PqsSchemaProfileV1());

await expect(client.packages.findMany({
    where: { unknown: { equals: "x" } },
} as never)).rejects.toThrow("unknown is not a field of packages");
expect(query).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the PQS tests and verify RED**

Run: `rtk npm run test -- tests/unit/query/pqs-sql-compiler.test.ts tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

Expected: FAIL because the client and compilers still own separate runtime grammars.

- [ ] **Step 3: Adapt the PQS compilers and client**

Normalize once at each public delegate entrypoint. Pass only canonical AST nodes
to the two SQL compilers. Preserve parameter binding, physical join selection,
read-only `$queryRaw`, `PqsQueryError`, and current public row mapping.

Keep the compiler split between logical contracts and physical relations for
now; do not combine the two large files during this behavior-preserving step.
Delete duplicated validation from `PqsQueryClient` only after its equivalent
canonical test is green.

- [ ] **Step 4: Run the full query-unit regression set and verify GREEN**

Run: `rtk npm run test -- tests/unit/query`

Expected: PASS, including unchanged SQL/value assertions.

- [ ] **Step 5: Commit the PQS adapter migration**

```bash
rtk git add src/query/pqs tests/unit/query/pqs-sql-compiler.test.ts tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts
rtk git commit -m "refactor: compile PQS queries from canonical AST"
```

## Task 3: Implement the in-memory relational evaluator

**Files:**
- Create: `src/query/canonical/query-dataset.ts`
- Create: `src/query/canonical/in-memory-query-evaluator.ts`
- Create: `tests/unit/query/query-conformance-fixture.ts`
- Create: `tests/unit/query/in-memory-query-evaluator.test.ts`
- Create: `tests/unit/query/pqs-query-conformance.test.ts`

- [ ] **Step 1: Write the failing conformance corpus**

Create one immutable fixture containing rows and edges for all eight relations:
two packages, two templates, three contracts including one archived contract,
three transactions, created/exercised events, consuming and non-consuming
exercises, and a watermark.

Table-drive cases for:

- scalar, range, `like`/`ilike`, null, array membership, and JSON predicates;
- nested `and`/`or`/`not` plus relation `some`/`none`/`every`;
- scalar and typed JSON projections;
- nested includes with bounded to-many pages;
- stable ordering, null ordering, skip/take;
- count/min/max/sum with empty and null values;
- scalar, array, JSON, and UTC hour/day/week/month grouping.

Give each case canonical input, expected public output, expected parameterized
PQS SQL/value assertions, and fake physical rows where PQS result shaping is
involved. Run the same exported cases through both the in-memory evaluator and
a `PqsQueryClient` backed by a recording fake executor. This makes the corpus a
two-sided contract immediately; reuse it again later in gRPC and live parity
tests.

- [ ] **Step 2: Run the evaluator test and verify RED**

Run: `rtk npm run test -- tests/unit/query/in-memory-query-evaluator.test.ts tests/unit/query/pqs-query-conformance.test.ts`

Expected: FAIL because `InMemoryQueryEvaluator` and the shared PQS conformance
harness do not exist.

- [ ] **Step 3: Implement the evaluator in canonical phases**

Expose one operation dispatcher:

```ts
export class InMemoryQueryEvaluator {
    public execute(
        dataset: QueryDataset,
        query: NormalizedQuery,
    ): unknown {
        switch (query.kind) {
            case "findMany": return this.findMany(dataset, query);
            case "findUnique": return this.findUnique(dataset, query);
            case "count": return this.count(dataset, query);
            case "aggregate": return this.aggregate(dataset, query);
            case "groupBy": return this.groupBy(dataset, query);
        }
    }
}
```

Implement predicate evaluation first, then ordering/pagination, then
projection/includes, then aggregate/grouping. Use `BigInt` for numeric-string
min/max/sum and convert sums back to decimal strings. Use UTC boundaries for all
time buckets. Define null ordering to match emitted PostgreSQL ordering and add
the stable key before pagination. Preserve vacuous truth for `every` over an
empty relation.

- [ ] **Step 4: Run evaluator and property tests and verify GREEN**

Run: `rtk npm run test -- tests/unit/query/in-memory-query-evaluator.test.ts tests/unit/query/pqs-query-conformance.test.ts`

Run: `rtk npm run test:property`

Expected: PASS.

- [ ] **Step 5: Commit the evaluator**

```bash
rtk git add src/query/canonical/query-dataset.ts src/query/canonical/in-memory-query-evaluator.ts tests/unit/query/query-conformance-fixture.ts tests/unit/query/in-memory-query-evaluator.test.ts tests/unit/query/pqs-query-conformance.test.ts
rtk git commit -m "feat: add canonical in-memory query evaluator"
```

## Task 4: Read complete, immutable gRPC snapshots

**Files:**
- Create: `src/query/errors/query-snapshot-incomplete-error.ts`
- Create: `src/query/grpc/grpc-query-snapshot-reader.ts`
- Create: `tests/unit/query/grpc-query-snapshot-reader.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing snapshot and pruning tests**

Use fake `StateServiceClient` and `UpdateServiceClient` capabilities to prove:

- current reads call `getLedgerEndAsync({})` once;
- a non-zero `participantPrunedUpToInclusive` fails before `getUpdatesPageAsync`;
- every update page uses `beginOffsetExclusive: "0"`, the same
  `endOffsetInclusive`, `UpdateFormat` with wildcard `filtersForAnyParty`,
  `verbose: true`, and `TransactionShape.LEDGER_EFFECTS`;
- continuation requests preserve all fields and change only `pageToken`;
- repeated tokens or inconsistent page boundaries fail without returning rows;
- ACS pages preserve one `activeAtOffset` and event format.

```ts
await expect(reader.readHistoryAsync("42")).rejects.toMatchObject({
    name: "QuerySnapshotIncompleteError",
    beginExclusive: "0",
    endInclusive: "42",
});
expect(getUpdatesPageAsync).not.toHaveBeenCalled();
```

- [ ] **Step 2: Run the snapshot tests and verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-query-snapshot-reader.test.ts`

Expected: FAIL because the reader and error do not exist.

- [ ] **Step 3: Implement snapshot selection and traversals**

Define the reader capabilities narrowly with `Pick<StateServiceClient, ...>`
and `Pick<UpdateServiceClient, ...>`. Before full history, call
`getLatestPrunedOffsetsAsync({})`; do not rely on `GetUpdatesPageRequest` with a
zero lower bound because that API may silently start at the pruning offset.

Return immutable transport-level snapshots:

```ts
export interface GrpcHistorySnapshot {
    readonly endInclusive: string;
    readonly updates: readonly GetUpdateResponse[];
}

export interface GrpcActiveContractSnapshot {
    readonly activeAtOffset: string;
    readonly activeContracts: readonly GetActiveContractsResponse[];
}
```

Bound traversal with explicit maximum page/update limits supplied as internal
constants or constructor options, detect repeated tokens, and verify response
page coverage against the requested boundary. Wrap only incomplete-history
conditions in `QuerySnapshotIncompleteError`; preserve ordinary
`GrpcTransportError` for unrelated RPC failures.

- [ ] **Step 4: Run snapshot, state traversal, and public error tests**

Run: `rtk npm run test -- tests/unit/query/grpc-query-snapshot-reader.test.ts tests/unit/services/state-service-client.test.ts tests/unit/query/query-public-contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit snapshot reading and the public error**

```bash
rtk git add src/query/errors/query-snapshot-incomplete-error.ts src/query/grpc/grpc-query-snapshot-reader.ts src/index.ts tests/unit/query/grpc-query-snapshot-reader.test.ts tests/unit/query/query-public-contracts.test.ts
rtk git commit -m "feat: read complete bounded gRPC query snapshots"
```

## Task 5: Materialize contract, transaction, event, and exercise rows

**Files:**
- Create: `src/query/grpc/grpc-query-value-mapper.ts`
- Create: `src/query/grpc/grpc-relation-mapper.ts`
- Create: `tests/unit/query/grpc-query-value-mapper.test.ts`
- Create: `tests/unit/query/grpc-relation-mapper.test.ts`

- [ ] **Step 1: Write failing protobuf-value and relation-mapping tests**

Build generated `Transaction`, `CreatedEvent`, and `ExercisedEvent` fixtures with
verbose labels. Assert:

- DAML records, variants, enums, optionals, lists, text maps, gen maps, dates,
  timestamps, numerics, parties, unit, and nested values become the same
  JSON-compatible shapes consumed by PQS JSON predicates;
- each transaction and visible created/exercised event creates the documented
  row;
- consuming exercise sets the target contract's archive offset/time;
- non-consuming exercise leaves it active;
- event types are `created` and `exercised`;
- `redactionId` is `null`;
- input-order permutations yield the same numeric-string key assignment and all
  edges resolve within the resulting dataset.

- [ ] **Step 2: Run mapper tests and verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-query-value-mapper.test.ts tests/unit/query/grpc-relation-mapper.test.ts`

Expected: FAIL because the mappers do not exist.

- [ ] **Step 3: Implement value conversion and the core relation mapper**

Convert protobuf values exhaustively on `value.sum.oneofKind`. Reject unlabeled
or partially labeled records when they cannot be represented with PQS field
names; ACS/update requests already set `verbose: true`, so this is a malformed
response rather than a query capability limitation.

Create a deterministic, collision-free positive-decimal identity codec shared
with PQS. Use transaction offsets for transaction `ix`; derive event,
package, contract-type, and exercise-type keys from stable semantic identities.
Keep PQS physical keys and gRPC relation keys private to edges rather than
exposing them in typed rows.

Materialize contracts from create events and close them on consuming exercises.
Set `createdAt` from `CreatedEvent.createdAt` and `archivedAt` from the
containing transaction. Freeze rows and row arrays before returning
`QueryDataset` fragments.

- [ ] **Step 4: Run focused mappers and DAML value regressions**

Run: `rtk npm run test -- tests/unit/query/grpc-query-value-mapper.test.ts tests/unit/query/grpc-relation-mapper.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the core relation mapper**

```bash
rtk git add src/query/grpc/grpc-query-value-mapper.ts src/query/grpc/grpc-relation-mapper.ts tests/unit/query/grpc-query-value-mapper.test.ts tests/unit/query/grpc-relation-mapper.test.ts
rtk git commit -m "feat: map gRPC ledger history to query relations"
```

## Task 6: Materialize package, type, and watermark rows

**Files:**
- Create: `src/query/grpc/grpc-package-relation-reader.ts`
- Create: `tests/unit/query/grpc-package-relation-reader.test.ts`
- Modify: `src/query/grpc/grpc-relation-mapper.ts`
- Test: `tests/unit/query/grpc-relation-mapper.test.ts`

- [ ] **Step 1: Write failing package/type/watermark tests**

Fake `listPackagesAsync({})` and `getPackageAsync({ packageId })`. Use a real LF2
package payload fixture to assert package name/version, modules, templates,
choices, consuming flags, FQNs, and aliases. Assert direct package collection
queries load all listed packages, while a contract/history plan loads only the
referenced package IDs.

Assert watermark `{ singleton: true, ix: end, offset: end, instanceId }` and
deterministic type/package keys across package response orderings.

- [ ] **Step 2: Run package relation tests and verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-package-relation-reader.test.ts tests/unit/query/grpc-relation-mapper.test.ts`

Expected: FAIL because package/type materialization is absent.

- [ ] **Step 3: Implement Package Service and DAML-LF mapping**

For each `GetPackageResponse`, rebuild the DAML-LF archive envelope from
`hashFunction`, `archivePayload`, and `hash`, then call the existing
`DamlLfPackageLoader`. Walk `DamlLfPackage.modules`, template definitions, and
choices to create package, contract-type, and exercise-type rows.

Use one package promise per package ID within a query so repeated templates do
not refetch payloads. Do not persist packages in `QueryCacheStore`; this
deduplication is query-local only. Feed all identities into the shared key
registry before row construction.

- [ ] **Step 4: Run package, DAML-LF, and relation mapper tests**

Run: `rtk npm run test -- tests/unit/query/grpc-package-relation-reader.test.ts tests/unit/query/grpc-relation-mapper.test.ts tests/unit/daml-lf/lf-2-model-mapper.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit package/type materialization**

```bash
rtk git add src/query/grpc/grpc-package-relation-reader.ts src/query/grpc/grpc-relation-mapper.ts tests/unit/query/grpc-package-relation-reader.test.ts tests/unit/query/grpc-relation-mapper.test.ts
rtk git commit -m "feat: map gRPC packages and types to query relations"
```

## Task 7: Add the explicit active-contract cache lifecycle

**Files:**
- Create: `src/query/grpc/grpc-contract-cache.ts`
- Create: `tests/unit/query/grpc-contract-cache.test.ts`
- Modify: `src/query/query-client.ts`
- Modify: `src/query/canton-manager-options.ts`
- Modify: `src/query/canton-manager.ts`
- Modify: `src/query/grpc/grpc-contract-query-client.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Modify: `tests/unit/query/query-public-contracts.test.ts`
- Modify: `tests/unit/query/grpc-contract-query-client.test.ts`
- Modify: `tests/unit/query/canton-manager.test.ts`

- [ ] **Step 1: Write failing cache API and coordinator tests**

Extend `QueryClient` with:

```ts
export interface ContractCacheArgs {
    readonly parties?: readonly string[];
}

export type ContractCacheResult =
    | { readonly source: QuerySource.grpc; readonly cached: true; readonly activeAtOffset: string; readonly contractCount: number; readonly expiresAt: Date }
    | { readonly source: QuerySource.pqs; readonly cached: false };

cacheContracts(args?: ContractCacheArgs): Promise<ContractCacheResult>;
invalidateContractsCache(args?: ContractCacheArgs): Promise<void>;
```

Test explicit prewarm, complete-page write, no write on failure, TTL metadata,
manual invalidation, endpoint isolation, sorted/deduplicated party scope,
all-party scope, and one ACS traversal for concurrent identical calls. Assert a
PQS client returns `{ source: QuerySource.pqs, cached: false }` and performs no
database call. Assert `CantonManager` rejects a non-positive TTL at runtime,
constructs the cache only for a configured gRPC cache, and exposes both methods
through the currently shipped `GrpcContractQueryClient` before its Task 8
replacement.

- [ ] **Step 2: Run cache tests and verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-contract-cache.test.ts tests/unit/query/query-public-contracts.test.ts tests/unit/query/pqs-query-client.test.ts tests/unit/query/grpc-contract-query-client.test.ts tests/unit/query/canton-manager.test.ts`

Expected: FAIL because cache lifecycle methods and coordinator do not exist.

- [ ] **Step 3: Implement the coordinator and public types**

Store a versioned payload rather than a bare row array:

```ts
interface CachedContractSnapshot {
    readonly version: 1;
    readonly endpointScope: string;
    readonly parties: readonly string[] | undefined;
    readonly activeAtOffset: string;
    readonly expiresAtEpochMs: number;
    readonly contracts: readonly ContractRow[];
}
```

The coordinator owns the in-flight promise map. Write only after all pages map
successfully. A lookup validates version, scope, parties, and expiry even when a
custom store does not eagerly expire entries. Ordinary reads never call
`setAsync`. `invalidateContractsCache` deletes only the exact canonical key.

Keep the structural cache option type in `CantonManagerOptions`, but perform
`ttlMs > 0` runtime validation in the `CantonManager` constructor. Build the
`GrpcContractCache` there and pass it to the current
`GrpcContractQueryClient`. Add cache lifecycle methods to that existing client
as a temporary compatibility bridge so implementing the expanded `QueryClient`
interface does not break compilation before Task 8 replaces the class. Calling
gRPC `cacheContracts` without cache configuration throws `ValidationError`
before ACS I/O.

- [ ] **Step 4: Run cache and query-unit tests and verify GREEN**

Run: `rtk npm run test -- tests/unit/query/grpc-contract-cache.test.ts tests/unit/query/query-public-contracts.test.ts tests/unit/query/pqs-query-client.test.ts tests/unit/query/grpc-contract-query-client.test.ts tests/unit/query/canton-manager.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit explicit caching**

```bash
rtk git add src/query/grpc/grpc-contract-cache.ts src/query/grpc/grpc-contract-query-client.ts src/query/query-client.ts src/query/canton-manager-options.ts src/query/canton-manager.ts src/query/pqs/pqs-query-client.ts tests/unit/query/grpc-contract-cache.test.ts tests/unit/query/query-public-contracts.test.ts tests/unit/query/grpc-contract-query-client.test.ts tests/unit/query/canton-manager.test.ts tests/unit/query/pqs-query-client.test.ts
rtk git commit -m "feat: add explicit active contract cache lifecycle"
```

## Task 8: Replace capability errors with the complete gRPC query client

**Files:**
- Create: `src/query/grpc/grpc-query-client.ts`
- Delete: `src/query/grpc/grpc-contract-query-client.ts`
- Modify: `src/query/canton-manager.ts`
- Modify: `src/query/canton-manager-options.ts`
- Modify: `src/index.ts`
- Replace: `tests/unit/query/grpc-contract-query-client.test.ts`
- Create: `tests/unit/query/grpc-query-client.test.ts`
- Modify: `tests/unit/query/canton-manager.test.ts`

- [ ] **Step 1: Write failing full-delegate gRPC tests**

Instantiate the client with fake state, update, and package capabilities. Reuse
every case from `query-conformance-fixture.ts` and assert all eight delegates
support their complete operation sets without `QueryCapabilityError`.

Add plan-selection assertions:

- active-only contract query with a valid cache reads no ACS/history;
- active-only cache miss reads ACS but does not write cache;
- unconstrained/inactive contract query reads history;
- active base rows with historical includes pin history to the cache offset;
- transaction/event/exercise queries read history but never cache it;
- package/type queries use Package Service;
- `$queryRaw` remains the only gRPC `QueryCapabilityError`.

- [ ] **Step 2: Run the gRPC client tests and verify RED**

Run: `rtk npm run test -- tests/unit/query/grpc-query-client.test.ts tests/unit/query/canton-manager.test.ts`

Expected: FAIL because `GrpcQueryClient` and manager wiring do not exist.

- [ ] **Step 3: Implement `GrpcQueryClient` and manager wiring**

Each delegate method must perform the same three operations:

```ts
const normalized = normalizeOperation(relation, operation, args);
const dataset = await dataProvider.readDatasetAsync(normalized);
return evaluator.execute(dataset, normalized) as PublicResult;
```

Keep source planning in one `GrpcQueryDataProvider` path rather than inside
delegates. Determine the minimum complete relation closure from the normalized
AST. Use cached ACS only for a proven active-only base plan; read current ACS on
an active-only miss; use bounded history whenever archived/all contracts or
historical relations are required; resolve packages/types only when the closure
needs them.

Pass `this.grpc.stateService`, `this.grpc.updateService`, and
`this.grpc.packageService` from `CantonManager`. Permit `options.pqs` when gRPC
is selected, but require it when PQS is selected. Keep the gRPC transport check
and disposal behavior unchanged.

- [ ] **Step 4: Run all query tests, build, and lint**

Run: `rtk npm run test -- tests/unit/query`

Run: `rtk npm run build`

Run: `rtk npm run lint`

Expected: PASS. `rtk rg -n "QueryCapabilityError" src/query/grpc` should show only the `$queryRaw` path.

- [ ] **Step 5: Commit the complete gRPC client**

```bash
rtk git add src/query/grpc src/query/canton-manager.ts src/query/canton-manager-options.ts src/index.ts tests/unit/query
rtk git commit -m "feat: provide full typed query parity over gRPC"
```

## Task 9: Prove cross-source parity and document the public behavior

**Files:**
- Create: `tests/live/runtime/live-query-manager-factory.ts`
- Create: `tests/live/runtime/live-query-pruning-fixture.ts`
- Create: `tests/live/specs/live-query-parity.test.ts`
- Create: `tests/live/specs/live-query-pruning.test.ts`
- Modify: `README.md`
- Modify: `scripts/verify-npm-pack.mjs`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Add failing package-shape and live parity tests**

Extend package tests to import `QuerySnapshotIncompleteError`,
`ContractCacheResult`, and cache lifecycle methods from the packed root module.

Create a live factory that accepts one gRPC client configuration plus the PQS
connection string/schema environment settings and returns two `CantonManager`
instances with the same participant visibility. Seed the existing live DAR and
contracts, then run identical functions against both managers for:

- active and archived contract lifecycle queries;
- nested contract/exercise/transaction includes;
- event and transaction filtering/order/pagination;
- package/type lookup;
- JSON payload projection and grouping;
- party activity grouping and numeric aggregates.

Compare every typed field directly, including canonical `pk`/`ix` values.
PQS physical keys and gRPC relation keys remain private implementation details.

Add a separate live pruning fixture that provisions its own data on the first
quickstart extra participant (`createLiveNodeTestEnvironment` with
`nodeIndex: 2`, the `EXTRA_PARTICIPANTS=1` endpoint). Before mutating anything,
compare its ledger endpoint with the primary and secondary endpoints and fail if
they are equal. Upload the live DAR to that participant, allocate a unique local
party, create and archive one `Main:Iou`, then read its ledger end.

In that test-only fixture, instantiate the generated Ledger API
`ParticipantPruningServiceClient` with `@protobuf-ts/grpc-transport`,
`createGrpcChannelCredentials`, and `buildGrpcCallOptionsAsync` using the
dedicated environment's ledger-admin auth. Prune through the archived
transaction's ledger-end offset, close the test transport in `finally`, and poll
`getLatestPrunedOffsetsAsync` until the participant reports that non-zero
offset. Do not add a public pruning API solely for this test and never prune the
shared parity participants.

The live test then runs a typed historical query against that same dedicated
participant and asserts it rejects with `QuerySnapshotIncompleteError` and
returns no partial rows. It must fail on missing setup or connectivity; it must
not skip.

- [ ] **Step 2: Run package checks and the focused live test and verify RED**

Run once for the query live suite: `rtk env EXTRA_PARTICIPANTS=1 bash node/start-local.sh`

Run: `rtk npm run build`

Run: `rtk npm run verify:pack`

Run: `rtk npm run test:live -- tests/live/specs/live-query-parity.test.ts`

Run: `rtk npm run test:live -- tests/live/specs/live-query-pruning.test.ts`

Expected: FAIL until exports, live fixtures, and documentation-facing behavior
are complete. If the localnet/PQS environment is not running, record the
environmental precondition and run the unit/build/package checks; do not weaken
or skip the live assertions.

- [ ] **Step 3: Update exports, README, and package verification**

Replace the README statement that gRPC exposes only an ACS subset. Show one
query function used with both source settings, an options object containing
both source configurations, explicit `cacheContracts`, invalidation, TTL,
snapshot staleness, participant visibility, canonical public keys, pruning failure,
and `$queryRaw` as PQS-only.

Make `verify-npm-pack` import the new value exports and compile the new type
exports from the packed artifact.

- [ ] **Step 4: Run complete verification**

Run: `rtk npm run test`

Run: `rtk npm run test:property`

Run: `rtk npm run build`

Run: `rtk npm run lint`

Run: `rtk npm run examples:check`

Run: `rtk npm run verify:pack`

Run: `rtk npm run test:live -- tests/live/specs/live-query-parity.test.ts`

Run: `rtk npm run test:live -- tests/live/specs/live-query-pruning.test.ts`

Run: `rtk git diff --check`

Expected: all commands PASS. The parity command and the self-provisioning
dedicated-participant pruning command must both pass before claiming complete
gRPC/PQS parity.

- [ ] **Step 5: Commit parity verification and documentation**

```bash
rtk git add tests/live tests/unit/smoke/package-shape.test.ts README.md scripts/verify-npm-pack.mjs
rtk git commit -m "test: verify gRPC and PQS query parity"
```

---

## Final implementation audit

Before handoff, run:

```bash
rtk rg -n "QueryCapabilityError" src/query/grpc
rtk git status --short
rtk git log -9 --oneline
```

The first command must report only gRPC `$queryRaw`. The worktree must contain
no unintended changes. Every acceptance criterion in
`docs/superpowers/specs/2026-08-03-grpc-query-parity-design.md` must have a
specific green test named above.
