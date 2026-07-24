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

Define physical-row types for `contractTypes`, `events`, `exercises`,
`exerciseTypes`, `packages`, `transactions`, and `watermark`. Define the
logical `ContractRow` with `contractId`, package-qualified `templateId`,
`packageId`, `payload`, `witnesses`, creation/archive offsets/timestamps, and
derived `active`. Provide generic `findMany`, `findUnique`, `count`, and
aggregate argument/result types; restrict contract filters/sorts to the fields
approved in the design. Preserve selection inference so `select` narrows the
result type.

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
are rejected; all eight required relations and required v1 columns are checked
through a parameterized `information_schema` query; missing fields produce
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
git add package.json package-lock.json src/query/pqs tests/unit/query
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
- Create: `src/query/grpc/grpc-active-contract-reader.ts`
- Create: `src/query/grpc/grpc-contract-query-client.ts`
- Test: `tests/unit/query/grpc-contract-query-client.test.ts`
- Test: `tests/unit/query/grpc-active-contract-reader.test.ts`

- [ ] **Step 1: Write failing gRPC query tests**

Mock `StateServiceClient.getActiveContractsPageAsync` for a paginated ACS.
Assert the request uses `filtersForAnyParty` by default, uses `filtersByParty`
when parties are supplied, and holds `activeAtOffset` stable across pages.
Test local contract filtering, package-qualified template IDs, ordering,
projection, pagination, count, unsupported historical fields, and a clear
`QueryCapabilityError` for each PQS-only delegate/raw SQL operation.

Add cache tests demonstrating one ACS fetch satisfies multiple query shapes,
TTL expiry causes a refetch, bypass skips reads/writes, and explicit
invalidation removes the snapshot.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `rtk npm run test -- tests/unit/query/grpc-active-contract-reader.test.ts tests/unit/query/grpc-contract-query-client.test.ts`

Expected: FAIL because the gRPC adapter does not exist.

- [ ] **Step 3: Implement the gRPC adapter**

Create `EventFormat` with a wildcard filter for all hosted parties or
per-party filters when requested. Read all page tokens at one stable snapshot
offset; map gRPC created events to the supported `ContractRow` fields; cache
the unprojected snapshot with source, endpoint identity, visibility scope, and
snapshot options in its key. Evaluate only the documented compatible contract
subset locally and reject unsupported PQS-only features explicitly.

- [ ] **Step 4: Run the focused tests**

Run: `rtk npm run test -- tests/unit/query/grpc-active-contract-reader.test.ts tests/unit/query/grpc-contract-query-client.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/query/grpc tests/unit/query/grpc-*.test.ts
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
backend, rejects missing PQS settings for `QuerySource.pqs`, delegates writes
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
