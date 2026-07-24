# Canton Manager PQS Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `CantonManager` that uses gRPC for all writes and exposes a Prisma-like query API backed by either gRPC or a PQS PostgreSQL database.

**Architecture:** `CantonManager` owns the existing `CantonClient` and one `QueryClient` selected by `QuerySource`. The PQS implementation compiles typed model queries to safe, parameterized SQL using a versioned schema profile; the gRPC implementation reads a wildcard active-contract snapshot and evaluates the compatible contract query subset locally. A caller-supplied, opt-in cache can retain gRPC snapshots.

**Tech Stack:** TypeScript (strict, NodeNext), existing Ledger API gRPC clients, `pg` Pool, Vitest, `@types/pg`.

---

## File structure

- `src/query/canton-manager.ts` — lifecycle-owning façade exposing `grpc` and `query`.
- `src/query/canton-manager-options.ts` and `query-source.ts` — public construction and source-selection types.
- `src/query/query-client.ts` — source-neutral query root and delegate contracts.
- `src/query/model-types.ts` — model rows, Prisma-like arguments, projections, filters, ordering, and aggregate types.
- `src/query/cache/*` — opt-in cache store contract and memory implementation.
- `src/query/errors/*` — capability, profile, and redacted PQS errors.
- `src/query/pqs/*` — pool owner, schema validation/profile, SQL compiler, raw SQL policy, and PQS query client.
- `src/query/grpc/*` — wildcard ACS reader, local evaluator, and gRPC query client.
- `tests/unit/query/*` — isolated tests for each behavior above.
- `src/core/types/requests/get-active-contracts-page-request.ts` and `src/transports/grpc/mappers/contracts-mapper.ts` — existing ACS request/mapping extended with the Ledger API all-party wildcard.
- `src/index.ts`, `package.json`, `package-lock.json`, `README.md` — public API, dependency, and usage documentation.

### Task 1: Establish public source, errors, and cache contracts

**Files:**
- Create: `src/query/query-source.ts`
- Create: `src/query/canton-manager-options.ts`
- Create: `src/query/query-client.ts`
- Create: `src/query/cache/query-cache-store.ts`
- Create: `src/query/cache/memory-query-cache.ts`
- Create: `src/query/errors/query-capability-error.ts`
- Create: `src/query/errors/pqs-query-error.ts`
- Create: `src/query/errors/pqs-schema-profile-error.ts`
- Test: `tests/unit/query/query-public-contracts.test.ts`

- [ ] **Step 1: Write failing public-contract tests**

```ts
expect(QuerySource.pqs).toBe("pqs");
expect(new QueryCapabilityError(QuerySource.grpc, "query.$queryRaw")).toMatchObject({
    source: QuerySource.grpc,
    operation: "query.$queryRaw",
});
```

Test cache expiry with a fake clock and assert that a `PqsQueryError` includes
the PostgreSQL code and operation but never values or a connection string.

- [ ] **Step 2: Run the test to verify it fails**

Run: `rtk npm run test -- tests/unit/query/query-public-contracts.test.ts`

Expected: FAIL because the query public contracts do not exist.

- [ ] **Step 3: Implement minimal contracts**

Create `QuerySource` with literal values `grpc` and `pqs`; define manager/PQS
options, a generic async cache-store interface, and `MemoryQueryCache` using
expiry timestamps. Make all errors extend `CantonError`, preserve a safe
operation/source/code context, and never store raw parameter values.

- [ ] **Step 4: Run the focused test**

Run: `rtk npm run test -- tests/unit/query/query-public-contracts.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/query tests/unit/query
git commit -m "feat: add query source and cache contracts"
```

### Task 2: Define typed model and query arguments

**Files:**
- Create: `src/query/model-types.ts`
- Test: `tests/unit/query/model-types.test.ts`

- [ ] **Step 1: Write compile-time and runtime-shape tests**

Cover the public contract delegate API:

```ts
const args: ContractFindManyArgs = {
    parties: ["Alice", "Bob"], // optional; omit for all hosted parties
    where: { templateId: { equals: "pkg:Module:Template" }, active: true },
    orderBy: { createdEventOffset: "desc" },
    take: 25,
    select: { contractId: true, payload: true },
};
```

Also test invalid `take`/`skip` input is rejected by shared validation.

- [ ] **Step 2: Run the test to verify it fails**

Run: `rtk npm run test -- tests/unit/query/model-types.test.ts`

Expected: FAIL because model/query types and validators do not exist.

- [ ] **Step 3: Implement profile-v1 model types**

Define the v1 profile completely from the observed Canton Explorer PQS
database layout below. Convert PostgreSQL `bigint`/`int8range` values to
strings, `jsonb` to `unknown`, PostgreSQL arrays to `readonly string[]`,
`bytea` to `Uint8Array`, and user-defined enum values to strings:

| Delegate / relation | v1 physical fields |
| --- | --- |
| `contractTypes` / `__contract_tpe` | `pk`, `payloadType`, `aliases`, `packageName`, `moduleName`, `entityName`, `templateFqn` |
| `events` / `__events` | `pk`, `txIx`, `eventId`, `type` |
| `exercises` / `__exercises` | `tpePk`, `contractTpePk`, `exerciseEventPk`, `exercisedAtIx`, `contractId`, `argument`, `result`, `redactionId`, `packagePk`, `controllers`, `lastDescendantNodeId`, `witnesses` |
| `exerciseTypes` / `__exercise_tpe` | `pk`, `choice`, `consuming`, `aliases`, `packageName`, `moduleName`, `entityName`, `templateFqn`, `choiceFqn` |
| `packages` / `__packages` | `pk`, `name`, `version`, `id` |
| `transactions` / `__transactions` | `ix`, `offset`, `transactionId`, `effectiveAt`, `workflowId`, `domainId`, `traceContext`, `externalTransactionHash`, `paidTrafficCost` |
| `watermark` / `__watermark` | `singleton`, `ix`, `offset`, `instanceId` |

`contracts` is the logical view defined in the spec and reads `__contracts`
with `__contract_tpe` and `__transactions`; its physical source fields are
`tpe_pk`, `create_event_pk`, `created_at_ix`, `archive_event_pk`,
`archived_at_ix`, `life_ix`, `contract_id`, `payload`, `contract_key`,
`metadata`, `redaction_id`, `package_pk`, `signatories`, `observers`,
`witnesses`, `divulged_only`, `creation_package_id`, and `contract_key_hash`.
Add optional `parties?: readonly string[]` to all contract
read arguments. Omitted parties means the gRPC all-hosted-parties wildcard;
provided parties become a `filtersByParty` map. Provide generic `findMany`,
`findUnique`, `count`, and aggregate argument/result types; restrict filters,
sorts, and aggregates to per-delegate profile metadata. Preserve selection
inference so `select` narrows the result type.

Define the following exact delegate metadata in the same source file as the
v1 profile; every listed field is selectable, and no unlisted field is:

| Delegate | Unique lookup | Filterable and sortable fields | Aggregates |
| --- | --- | --- | --- |
| `contracts` | `contractId` | `contractId`, `templateId`, `packageId`, `active`, `createdEventOffset`, `createdAt`, `archivedEventOffset`, `archivedAt`; `witnesses` supports membership only | `count` only |
| `contractTypes` | `pk` | `pk`, `packageName`, `moduleName`, `entityName`, `templateFqn` | `count` only |
| `events` | `pk` | `pk`, `txIx`, `eventId`, `type` | `count` only |
| `exercises` | none | `tpePk`, `contractTpePk`, `exerciseEventPk`, `exercisedAtIx`, `contractId`, `redactionId`, `packagePk`, `lastDescendantNodeId`; `controllers`/`witnesses` support membership only | `count` only |
| `exerciseTypes` | `pk` | `pk`, `choice`, `consuming`, `packageName`, `moduleName`, `entityName`, `templateFqn`, `choiceFqn` | `count` only |
| `packages` | `pk` and `id` | `pk`, `name`, `version`, `id` | `count` only |
| `transactions` | `ix` and `offset` | `ix`, `offset`, `transactionId`, `effectiveAt`, `workflowId`, `domainId`, `paidTrafficCost` | `count` only |
| `watermark` | `singleton` | `singleton`, `ix`, `offset`, `instanceId` | `count` only |

`payloadType`, aliases, JSON, ranges, byte arrays, `contractKey`, metadata,
trace context, and other unlisted values are projection-only. This is the
intentional v1 boundary; callers use `$queryRaw` for database-specific JSON,
range, or aggregate predicates.

- [ ] **Step 4: Run the focused test**

Run: `rtk npm run test -- tests/unit/query/model-types.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/query/model-types.ts tests/unit/query/model-types.test.ts
git commit -m "feat: define typed query models"
```

### Task 3: Add the PQS driver, pool lifecycle, and schema-profile validation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/query/pqs/pqs-pool.ts`
- Create: `src/query/pqs/pqs-schema-profile.ts`
- Test: `tests/unit/query/pqs-schema-profile.test.ts`
- Test: `tests/unit/query/pqs-pool.test.ts`

- [ ] **Step 1: Write failing pool/profile tests**

Mock the `pg` pool and verify: schema defaults to `public`; unsafe identifiers
are rejected; all eight required relations and every exact v1 column listed in
Task 2 are checked through a parameterized `information_schema` query; missing fields produce
`PqsSchemaProfileError`; and `disposeAsync()` calls `pool.end()` exactly once.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rtk npm run test -- tests/unit/query/pqs-schema-profile.test.ts tests/unit/query/pqs-pool.test.ts`

Expected: FAIL because `pg` and PQS ownership/profile code are absent.

- [ ] **Step 3: Install and implement the minimum PQS infrastructure**

Run: `rtk npm install pg && rtk npm install --save-dev @types/pg`

Implement a pool owner that validates the selected v1 profile before query use,
quotes only profile-supplied identifiers, and ends the owned pool during
disposal. Use `Pool` injection in internal constructors so unit tests never
need a live database. Keep runtime SQL values parameterized.

- [ ] **Step 4: Run the focused tests**

Run: `rtk npm run test -- tests/unit/query/pqs-schema-profile.test.ts tests/unit/query/pqs-pool.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/query/errors/pqs-schema-profile-error.ts src/query/pqs tests/unit/query
git commit -m "feat: add PQS pool and schema profile"
```

### Task 4: Compile and execute typed PQS model queries

**Files:**
- Create: `src/query/pqs/pqs-sql-compiler.ts`
- Create: `src/query/pqs/pqs-query-client.ts`
- Test: `tests/unit/query/pqs-sql-compiler.test.ts`
- Test: `tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 1: Write failing compiler tests**

Assert generated SQL uses positional values and never interpolates filter
values. Cover contract projection, the `__contracts`/`__contract_tpe`/
`__transactions` joins, active/archive predicates, package-qualified template
IDs, witness membership, order/pagination, count, and aggregates. Add one
test per physical delegate to ensure it accepts only profile-declared fields.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rtk npm run test -- tests/unit/query/pqs-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

Expected: FAIL because no compiler/client exists.

- [ ] **Step 3: Implement profile-driven SQL compilation**

Use a small SQL fragment builder carrying `{ text, values }`. Compile all
typed delegates from profile metadata. Implement `contracts` as the documented
logical view with joins, map PQS snake_case data to camelCase model rows, and
return narrowed projection objects. Convert driver failures to `PqsQueryError`
without retaining values/connection details.

- [ ] **Step 4: Run the focused tests**

Run: `rtk npm run test -- tests/unit/query/pqs-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/query/pqs tests/unit/query/pqs-*.test.ts
git commit -m "feat: add typed PQS query client"
```

### Task 5: Add the read-only raw SQL escape hatch

**Files:**
- Create: `src/query/pqs/read-only-sql.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Test: `tests/unit/query/read-only-sql.test.ts`

- [ ] **Step 1: Write failing raw-SQL policy tests**

Test acceptance of one parameterized `SELECT`, `WITH` read query, `EXPLAIN`,
and `SHOW`; rejection of empty SQL, multiple statements, `INSERT`, `UPDATE`,
`DELETE`, DDL, and data-modifying CTEs; and forwarding `$1` values separately
to the mocked pool.

- [ ] **Step 2: Run the test to verify it fails**

Run: `rtk npm run test -- tests/unit/query/read-only-sql.test.ts`

Expected: FAIL because raw SQL validation is absent.

- [ ] **Step 3: Implement lexical read-only validation and `$queryRaw<T>`**

Build a conservative scanner that ignores quoted strings/comments before
checking the first statement token and semicolon count, then rejects known
mutation tokens anywhere in a `WITH` body. Keep database-role guidance in the
documentation; do not claim client-side checks replace a read-only role.

- [ ] **Step 4: Run the focused test**

Run: `rtk npm run test -- tests/unit/query/read-only-sql.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/query/pqs/read-only-sql.ts src/query/pqs/pqs-query-client.ts tests/unit/query/read-only-sql.test.ts
git commit -m "feat: add read-only PQS raw queries"
```

### Task 6: Add gRPC wildcard ACS querying and snapshot cache

**Files:**
- Modify: `src/core/types/requests/get-active-contracts-page-request.ts`
- Modify: `src/transports/grpc/mappers/contracts-mapper.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Create: `src/query/grpc/grpc-active-contract-reader.ts`
- Create: `src/query/grpc/grpc-contract-query-client.ts`
- Create: `tests/unit/grpc/grpc-contracts-mapper.test.ts`
- Test: `tests/unit/query/grpc-contract-query-client.test.ts`
- Test: `tests/unit/query/grpc-active-contract-reader.test.ts`

- [ ] **Step 1: Write failing gRPC query tests**

First add mapper and transport tests for the extended request type: legacy
`{ party }` input still emits one `filtersByParty` entry; new
`{ parties: ["Alice", "Bob"] }` emits both entries in one `filtersByParty`
map; `{ allParties: true }` emits `filtersForAnyParty` with the wildcard
filter; and an invalid request that sets more than one visibility mode is
rejected. JSON rejects the multi/all-party modes as unsupported. Then mock
`StateServiceClient.getActiveContractsPageAsync` for a paginated ACS. Assert
the adapter uses all-party mode by default, uses `filtersByParty` when
`ContractFindManyArgs.parties` is supplied, and holds `activeAtOffset` stable
across pages.
Test local contract filtering, package-qualified template IDs, ordering,
projection, pagination, count, unsupported historical fields, and a clear
`QueryCapabilityError` for each PQS-only delegate/raw SQL operation.

Add cache tests demonstrating one ACS fetch satisfies multiple query shapes,
TTL expiry causes a refetch, bypass skips reads/writes, and explicit
invalidation removes the snapshot.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rtk npm run test -- tests/unit/grpc/grpc-contracts-mapper.test.ts tests/unit/query/grpc-active-contract-reader.test.ts tests/unit/query/grpc-contract-query-client.test.ts`

Expected: FAIL because the gRPC adapter does not exist.

- [ ] **Step 3: Implement the gRPC adapter**

Extend `GetActiveContractsPageRequest` as a backwards-compatible tagged union:
the existing `{ party: string }` form remains valid and the new
`{ parties: readonly string[] }` and `{ allParties: true }` forms are mutually
exclusive. Update `mapGrpcQueryContractsRequest` to populate one
`filtersByParty` entry per party or `EventFormat.filtersForAnyParty` for the
wildcard. Update `GrpcTransport` to forward the selected visibility variant
unchanged; update `JsonTransport` to reject the new multi/all-party variants
before calling its legacy endpoint. `CantonManager` below only accepts a gRPC
`CantonClient`.

Create `EventFormat` with that all-hosted-party wildcard or per-party filters
when requested. Read all page tokens at one stable snapshot offset; map gRPC
created events to the approved narrow `ContractRow` subset; cache
the unprojected snapshot with source, endpoint identity, visibility scope, and
snapshot options in its key. Evaluate only the documented compatible contract
subset locally and reject unsupported PQS-only features explicitly.

The gRPC contract delegate supports filtering, ordering, and selection only
for `contractId` and package-qualified `templateId`; `active: true` is
implicit. Any selection, filter, or order involving `packageId`, `payload`,
parties, timestamps, offsets, archive fields, `active: false`, contract keys,
signatories, or observers rejects with `QueryCapabilityError`. Those richer
fields remain PQS-only in v1.

- [ ] **Step 4: Run the focused tests**

Run: `rtk npm run test -- tests/unit/grpc/grpc-contracts-mapper.test.ts tests/unit/query/grpc-active-contract-reader.test.ts tests/unit/query/grpc-contract-query-client.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests/get-active-contracts-page-request.ts src/transports/grpc/mappers/contracts-mapper.ts src/transports/grpc/grpc-transport.ts src/transports/json/json-transport.ts src/query/grpc tests/unit/grpc/grpc-contracts-mapper.test.ts tests/unit/query/grpc-*.test.ts
git commit -m "feat: add gRPC contract query adapter"
```

### Task 7: Compose `CantonManager` and publish the API

**Files:**
- Create: `src/query/canton-manager.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/query/canton-manager.test.ts`
- Test: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write failing manager/export tests**

Verify a manager always constructs/exposes `grpc`, chooses exactly one query
backend, rejects missing PQS settings for `QuerySource.pqs`, rejects PQS
options when `QuerySource.grpc` is selected, and rejects a non-gRPC
`grpc.transportKind` before constructing adapters. Verify it delegates writes
to `manager.grpc`, exposes cache invalidation, and disposes the PQS pool and
gRPC client idempotently. Verify all manager/options/query/error/cache exports
are available from the package root.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rtk npm run test -- tests/unit/query/canton-manager.test.ts tests/unit/smoke/package-shape.test.ts`

Expected: FAIL because `CantonManager` is not exported.

- [ ] **Step 3: Implement composition and exports**

Instantiate the existing `CantonClient` from `grpc` options, construct the
selected adapter, expose immutable `grpc`/`query` properties, and implement
idempotent `disposeAsync()`. Do not modify existing `CantonClient` behavior.
Export the manager, source enum, options/types, cache helper, and public query
errors from `src/index.ts`.

- [ ] **Step 4: Run the focused tests**

Run: `rtk npm run test -- tests/unit/query/canton-manager.test.ts tests/unit/smoke/package-shape.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/query src/index.ts tests/unit/query tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add Canton Manager query facade"
```

### Task 8: Document and verify the released surface

**Files:**
- Modify: `README.md`
- Test: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write a documentation/API smoke expectation**

Extend package-shape coverage for root exports and add a compile-safe README
example for both `QuerySource.grpc` and `QuerySource.pqs`, including cache use,
`contracts.findMany`, and `$queryRaw` capability limits.

- [ ] **Step 2: Run the smoke test to verify the new expectation fails**

Run: `rtk npm run test -- tests/unit/smoke/package-shape.test.ts`

Expected: FAIL until Task 7 exports are present.

- [ ] **Step 3: Update documentation**

Document initialization, write delegation through `manager.grpc`, typed query
examples, package-qualified template IDs, gRPC wildcard snapshot semantics,
cache freshness/invalidation, explicit capability errors, and the read-only
database-role requirement for `$queryRaw`.

- [ ] **Step 4: Run focused and full verification**

Run:

```bash
rtk npm run test -- tests/unit/query tests/unit/smoke/package-shape.test.ts
rtk npm run build
rtk npm run lint -- --max-warnings=0
rtk npm run verify:pack
```

Expected: all commands PASS. If the repository-wide linter has unrelated
existing failures, run ESLint on every modified file and report the global
failure separately rather than masking it.

- [ ] **Step 5: Commit**

```bash
git add README.md tests/unit/smoke/package-shape.test.ts
git commit -m "docs: explain Canton Manager PQS queries"
```
