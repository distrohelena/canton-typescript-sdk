# Typed PQS Relational Queries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose typed joins, nested relation reads, JSON extraction, grouping, time buckets, multi-field ordering, and aggregates across the eight built-in PQS relations so Explorer reads do not depend on `$queryRaw`.

**Architecture:** Keep the public API declarative and relation-name based. A versioned PQS profile supplies every allowed edge, field capability, and physical identifier; a shared compiler turns an internal query AST into parameterized PostgreSQL. The PQS client maps nested SQL results into typed rows, while the gRPC client explicitly rejects every PQS-only operation with the established capability error.

**Tech Stack:** TypeScript strict mode, Vitest, PostgreSQL/PQS SQL, existing `PqsSchemaProfileV1`, `PqsQueryClient`, and `QueryCapabilityError`.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/query/model-types.ts` | Public generic relation, include, projection, JSON, grouping, aggregate, and ordering TypeScript contracts. |
| `src/query/query-client.ts` | Public delegate signatures and all eight concrete delegate specializations. |
| `src/query/pqs/pqs-schema-profile.ts` | Fixed v1 relation graph and field capability metadata, plus schema validation requirements. |
| `src/query/pqs/pqs-relational-sql-compiler.ts` (new) | Profile-controlled AST validation and parameterized SQL generation for relation reads and groups. |
| `src/query/pqs/pqs-query-client.ts` | Route delegates through the shared compiler and recursively map nested rows. |
| `src/query/pqs/pqs-sql-compiler.ts` | Keep only the compatibility wrapper during migration, then remove it when all contracts use the shared compiler. |
| `src/query/grpc/grpc-contract-query-client.ts` | Reject PQS-only relation/group/projection features without widening gRPC behavior. |
| `tests/unit/query/model-types.test.ts` | Compile-time API acceptance/rejection fixtures. |
| `tests/types/pqs-relational-query.test-d.ts` (new) | TypeScript-only acceptance/rejection fixtures compiled by the dedicated type-test project. |
| `tsconfig.type-tests.json` (new) | Includes `src` and `tests/types` so `@ts-expect-error` fixtures are checked by `tsc`. |
| `tests/unit/query/pqs-schema-profile.test.ts` | Relation graph and profile validation tests. |
| `tests/unit/query/pqs-relational-sql-compiler.test.ts` (new) | SQL, parameter-order, join, group, JSON, and validation tests. |
| `tests/unit/query/pqs-query-client.test.ts` | Result mapping and delegate integration tests. |
| `tests/unit/query/grpc-contract-query-client.test.ts` | Capability boundary tests. |

### Task 1: Define the public relational query contracts

**Files:**
- Modify: `src/query/model-types.ts`
- Modify: `src/query/query-client.ts`
- Test: `tests/unit/query/model-types.test.ts`
- Test: `tests/types/pqs-relational-query.test-d.ts` (new)
- Create: `tsconfig.type-tests.json`

- [ ] **Step 1: Write compile-time fixtures for the intended API.**

  Add accepted examples for a contract detail include, a transaction multi-field
  order, a JSON scalar projection, and a day bucket reached through the
  `event.transaction` edge to the new `.test-d.ts` file. Add `@ts-expect-error`
  cases for an unknown edge, ordering through a to-many edge, an unbounded
  to-many include, and a JSON path on a non-JSON field. Create a dedicated
  `tsconfig.type-tests.json` with `noEmit: true`, a `rootDir` that contains both
  `src` and `tests/types`, and includes limited to those paths; the normal
  `tsconfig.json` excludes tests and cannot validate these fixtures.

  ```ts
  const detail: ContractFindUniqueArgs = {
      where: { contractId: "cid" },
      include: { contractType: true, createdTransaction: true,
          exercises: { take: 50, include: { transaction: true } } },
  };
  // @ts-expect-error to-many includes require take
  const invalid: ContractFindUniqueArgs = { where: { contractId: "cid" }, include: { exercises: true } };
  ```

- [ ] **Step 2: Run the dedicated type project and confirm the fixtures fail.**

  Run: `rtk ./node_modules/.bin/tsc -p tsconfig.type-tests.json --noEmit`

  Expected: FAIL because the new arguments do not exist.

- [ ] **Step 3: Add generic, reusable type building blocks.**

  In `model-types.ts`, define `RelationQuery`, `RelationInclude`,
  `RelationWhere`, `JsonPath`, `JsonFilter`, `JsonProjection`,
  `GroupByArgs`, `TimeBucket`, and `OrderBy` as readonly generic contracts.
  Model a to-many include as `{ take: number; where?; select?; include?;
  orderBy? }`; model a to-one include as `true | { where?; select?; include? }`.
  Change all row ordering types from a single partial object to a readonly
  non-empty list of single-field objects. Preserve compatibility only where an
  existing API is not migrated in this task; do not introduce `any` or an
  untyped index signature at the public boundary.

- [ ] **Step 4: Add concrete relation-map specializations.**

  Describe each of the eight rows and its valid named relations in the type
  layer. Add contract relations `contractType`, `createdTransaction`,
  `archivedTransaction`, and bounded `exercises`; add all fixed profile edges
  from the approved design. Wire these concrete argument/result types into the
  `QueryClient` delegates.

- [ ] **Step 5: Make compile-time fixtures pass.**

  Run: `rtk ./node_modules/.bin/tsc -p tsconfig.type-tests.json --noEmit`

  Expected: PASS; invalid fixtures are consumed by `@ts-expect-error`.

- [ ] **Step 6: Commit the type-only slice.**

  ```bash
  rtk git add src/query/model-types.ts src/query/query-client.ts tests/unit/query/model-types.test.ts tests/types/pqs-relational-query.test-d.ts tsconfig.type-tests.json
  rtk git commit -m "feat: define typed PQS relation query contracts"
  ```

### Task 2: Make the v1 relation graph executable metadata

**Files:**
- Modify: `src/query/pqs/pqs-schema-profile.ts`
- Test: `tests/unit/query/pqs-schema-profile.test.ts`

- [ ] **Step 1: Write failing graph metadata tests.**

  Assert that `contracts.createdTransaction` is a required to-one edge from
  `created_at_ix` to `transactions.ix`; `contracts.exercises` is a to-many
  edge; `events.transaction` is a to-one edge; and invalid edge lookup throws
  before SQL execution. Assert JSON/bucket capabilities match the approved
  design.

- [ ] **Step 2: Run the focused profile test and confirm failure.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-schema-profile.test.ts`

  Expected: FAIL because relation graph metadata is absent.

- [ ] **Step 3: Add immutable profile edge and capability metadata.**

  Add `PqsRelationEdge` with source/target relation, source/target physical
  columns, cardinality, and nullable status. Add a profile accessor that
  resolves an edge only from the fixed relation map. Extend required schema
  columns so every key column used by an edge is validation-covered. Add
  declared JSON fields and the one bucketable timestamp field.

- [ ] **Step 4: Run profile tests.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-schema-profile.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the profile slice.**

  ```bash
  rtk git add src/query/pqs/pqs-schema-profile.ts tests/unit/query/pqs-schema-profile.test.ts
  rtk git commit -m "feat: declare PQS v1 relation graph"
  ```

### Task 3: Introduce a validated relational SQL compiler

**Files:**
- Create: `src/query/pqs/pqs-relational-sql-compiler.ts`
- Create: `tests/unit/query/pqs-relational-sql-compiler.test.ts`
- Modify: `src/query/pqs/pqs-sql-compiler.ts`

- [ ] **Step 1: Write failing compiler tests for root reads.**

  Test a package read with two ordering fields and a stable `pk` tie-breaker;
  test a contract root read retaining the current logical joins; test unknown
  field/edge rejection before a query is issued. Assert SQL contains only
  profile-resolved quoted identifiers and every operand is in the values array.

- [ ] **Step 2: Run the new compiler test and confirm it fails.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-relational-sql-compiler.test.ts`

  Expected: FAIL because the compiler module does not exist.

- [ ] **Step 3: Implement a small AST and root compiler.**

  Introduce internal, non-exported `CompiledSelection`, `CompiledJoin`, and
  parameter allocator helpers. Compile scalar filters, logical groups,
  pagination, multi-field ordering, and profile-derived stable tie-breakers.
  Port the contract root joins and existing predicates from
  `pqs-sql-compiler.ts` without altering their public behavior.

- [ ] **Step 4: Pass the root compiler tests and existing compiler tests.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-sql-compiler.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the compiler foundation.**

  ```bash
  rtk git add src/query/pqs/pqs-relational-sql-compiler.ts src/query/pqs/pqs-sql-compiler.ts tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-sql-compiler.test.ts
  rtk git commit -m "feat: compile profile-controlled PQS relation reads"
  ```

### Task 4: Implement to-one and bounded to-many includes

**Files:**
- Modify: `src/query/pqs/pqs-relational-sql-compiler.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Test: `tests/unit/query/pqs-relational-sql-compiler.test.ts`
- Test: `tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 1: Add failing SQL and mapping tests.**

  Cover a contract detail returning `contractType`, `createdTransaction`,
  nullable `archivedTransaction`, and `{ exercises: { take: 2, include:
  { transaction: true } } }`. Assert parent rows are not duplicated, a to-many
  include uses a correlated bounded subquery, and empty to-many relations map
  to `[]`.

- [ ] **Step 2: Run focused tests and confirm failure.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 3: Compile includes safely.**

  Compile to-one edges as profile-approved left joins. Compile to-many edges as
  correlated subqueries that apply child filters/order/take before `jsonb_agg`.
  Reject a to-many edge without a finite non-negative `take`; recursively
  validate every nested edge and predicate through the profile.

- [ ] **Step 4: Map nested results without casts at the public boundary.**

  Add internal row-decoding helpers that map JSON objects/arrays using relation
  metadata and the existing scalar conversion rules. Return concrete nested
  public result types rather than `Record<string, unknown>` or `any`.

- [ ] **Step 5: Run focused tests.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit include support.**

  ```bash
  rtk git add src/query/pqs/pqs-relational-sql-compiler.ts src/query/pqs/pqs-query-client.ts tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts
  rtk git commit -m "feat: include related PQS records"
  ```

### Task 5: Add relation predicates and JSON extraction/projections

**Files:**
- Modify: `src/query/model-types.ts`
- Modify: `src/query/pqs/pqs-relational-sql-compiler.ts`
- Test: `tests/unit/query/model-types.test.ts`
- Test: `tests/unit/query/pqs-relational-sql-compiler.test.ts`

- [ ] **Step 1: Write failing tests.**

  Add a transaction query filtered by `events.some`, a contract query filtered
  by `exercises.none`, and JSON extraction against `contracts.payload` and
  `exercises.argument`. Assert every JSON path is bound as a `text[]` value;
  reject a JSON path for `packages.name`.

- [ ] **Step 2: Run tests and confirm failure.**

  Run: `rtk npm exec vitest run tests/unit/query/model-types.test.ts tests/unit/query/pqs-relational-sql-compiler.test.ts`

- [ ] **Step 3: Implement nested relation predicates and JSON AST nodes.**

  Compile to-one predicates through profile joins and to-many `some`/`none`/
  `every` via correlated `exists`/`not exists`. Compile JSON scalar predicates
  with `#>>`, JSON value projections with `#>`, and explicitly requested text,
  numeric, boolean, or timestamp casts. Never interpolate a JSON path.

- [ ] **Step 4: Run focused tests.**

  Run: `rtk npm exec vitest run tests/unit/query/model-types.test.ts tests/unit/query/pqs-relational-sql-compiler.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit JSON and relation filters.**

  ```bash
  rtk git add src/query/model-types.ts src/query/pqs/pqs-relational-sql-compiler.ts tests/unit/query/model-types.test.ts tests/unit/query/pqs-relational-sql-compiler.test.ts
  rtk git commit -m "feat: filter PQS relations and JSON fields"
  ```

### Task 6: Implement groupBy, buckets, array groups, and aggregates

**Files:**
- Modify: `src/query/query-client.ts`
- Modify: `src/query/model-types.ts`
- Modify: `src/query/pqs/pqs-relational-sql-compiler.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Test: `tests/unit/query/pqs-relational-sql-compiler.test.ts`
- Test: `tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 1: Write failing representative group tests.**

  Cover event count by event type and transaction day; active contracts grouped
  by `payload.owner`; contracts grouped by unnested witnesses; and traffic
  sums by transaction domain. Assert group aliases are deterministic and
  numeric results remain strings. Reject group fields outside profile
  capabilities and an aggregate on a nonnumeric field.

- [ ] **Step 2: Run focused tests and confirm failure.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 3: Compile grouped query AST nodes.**

  Build group expressions from scalar columns, profile-approved JSON paths,
  `date_trunc` on profiled timestamps, and `cross join lateral unnest` for an
  array field. Reuse where/relation predicate compilation. Generate `group by`
  using expressions rather than aliases, and allow group ordering only by a
  group key or requested aggregate.

- [ ] **Step 4: Decode grouped rows.**

  Reuse scalar mapping metadata for group values and return a typed aggregate
  object. Preserve `null` for empty numeric min/max/sum and a number for count.

- [ ] **Step 5: Run focused tests.**

  Run: `rtk npm exec vitest run tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit grouping support.**

  ```bash
  rtk git add src/query/query-client.ts src/query/model-types.ts src/query/pqs/pqs-relational-sql-compiler.ts src/query/pqs/pqs-query-client.ts tests/unit/query/pqs-relational-sql-compiler.test.ts tests/unit/query/pqs-query-client.test.ts
  rtk git commit -m "feat: group and aggregate PQS relation queries"
  ```

### Task 7: Preserve gRPC boundaries and finish the migration

**Files:**
- Modify: `src/query/grpc/grpc-contract-query-client.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Delete: `src/query/pqs/pqs-sql-compiler.ts` (only after no callers remain)
- Test: `tests/unit/query/grpc-contract-query-client.test.ts`
- Test: `tests/unit/query/pqs-sql-compiler.test.ts` (delete or move assertions)

- [ ] **Step 1: Write failing gRPC capability tests.**

  Assert `contracts.findMany` with `include`, relation predicates, JSON
  projections, multi-field ordering, or `groupBy` rejects with
  `QueryCapabilityError(QuerySource.grpc, operation)`. Confirm the existing
  supported active-contract subset remains unchanged.

- [ ] **Step 2: Run the gRPC test and confirm failure.**

  Run: `rtk npm exec vitest run tests/unit/query/grpc-contract-query-client.test.ts`

- [ ] **Step 3: Reject every PQS-only operation explicitly.**

  Extend capability checks and unsupported delegates to cover the new delegate
  methods. Do not emulate joins client-side and do not return partial nested
  rows from gRPC.

- [ ] **Step 4: Remove the old contract-only compiler once migrated.**

  Move any still-useful compatibility assertions into the relational compiler
  test and delete the obsolete module/imports. Confirm no reference remains:

  Run: `rtk rg -n 'compileContractFindMany|pqs-sql-compiler' src tests`

  Expected: no production references to the old compiler.

- [ ] **Step 5: Run query regression tests.**

  Run: `rtk npm exec vitest run tests/unit/query`

  Expected: PASS.

- [ ] **Step 6: Commit the finished API boundary.**

  ```bash
  rtk git add src/query tests/unit/query
  rtk git rm src/query/pqs/pqs-sql-compiler.ts tests/unit/query/pqs-sql-compiler.test.ts
  rtk git commit -m "refactor: unify PQS relational query compilation"
  ```

### Task 8: Verify Explorer coverage and the complete repository

**Files:**
- Modify: `tests/unit/query/pqs-query-client.test.ts`
- Modify: `docs/superpowers/specs/2026-07-26-pqs-relational-query-design.md` only if an intentionally unsupported primitive is found

- [ ] **Step 1: Add one executable query fixture per required Explorer shape.**

  Package browsing, contract detail, recent updates, party activity, node
  summary primitives, traffic purchases, token balance/holder/transfer
  primitives, and active-party discovery must each compile through a typed
  delegate. A fixture may assert generated SQL and mapping; it must not call
  `$queryRaw`.

- [ ] **Step 2: Run the complete query suite.**

  Run: `rtk npm exec vitest run tests/unit/query`

  Expected: PASS.

- [ ] **Step 3: Run required repository verification.**

  Run:

  ```bash
  rtk ./node_modules/.bin/tsc -p tsconfig.json --noEmit
  rtk git diff --check
  rtk git status --short
  ```

  Expected: TypeScript succeeds, no whitespace errors, and only intentional
  task files appear. Preserve unrelated changes, including the pre-existing
  `package.json` version edit.

- [ ] **Step 4: Commit final coverage if needed.**

  ```bash
  rtk git add tests/unit/query docs/superpowers/specs/2026-07-26-pqs-relational-query-design.md
  rtk git commit -m "test: cover Explorer PQS query compositions"
  ```
