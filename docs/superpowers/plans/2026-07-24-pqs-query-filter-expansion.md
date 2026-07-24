# PQS Query Filter Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add type-safe PQS range and pattern predicates, recursive logical conditions, and contracts-payload JSON dot-path filtering.

**Architecture:** Extend the public query model types with recursive condition types that retain existing flat-filter compatibility. Teach the logical-contract SQL compiler and physical-relation query compiler to recursively emit parenthesized, parameterized PostgreSQL predicates. JSON filtering is limited to PQS contracts and extracts a dotted payload path as text with bound path and value parameters.

**Tech Stack:** TypeScript 5.9, Vitest 3, PostgreSQL SQL compilation, `pg` positional parameter bindings.

---

## File structure

- `src/query/model-types.ts` — public filter, field-capability, and recursive-where TypeScript types.
- `src/query/pqs/pqs-sql-compiler.ts` — logical `contracts` filter compiler, including payload paths.
- `src/query/pqs/pqs-query-client.ts` — physical-relation recursive filter compiler and runtime validation.
- `src/query/grpc/grpc-contract-query-client.ts` — explicit rejection of new PQS-only contract filtering.
- `tests/unit/query/pqs-sql-compiler.test.ts` — logical-contract SQL/parameter behavior.
- `tests/unit/query/pqs-query-client.test.ts` — physical-delegate SQL and validation behavior.
- `tests/unit/query/grpc-contract-query-client.test.ts` — gRPC capability boundary regression coverage.

### Task 1: Add public filter and recursive-condition types

**Files:**
- Modify: `src/query/model-types.ts:3-75`
- Test: `tests/unit/query/query-delegate.test.ts`

- [ ] **Step 1: Write failing type-level examples for range, pattern, recursive logic, and payload paths**

  Add valid `ContractWhere` and `PackageWhere` assignments using `lt`, `gte`, `like`, `ilike`, `and`, `or`, `not`, and `payload: { path: "owner.city", ilike: "new%" }`; use `// @ts-expect-error` for pattern matching on numeric/string-represented numeric, date, and boolean fields, and for invalid payload predicate shapes.

- [ ] **Step 2: Run the TypeScript build to verify the examples fail**

  Run: `rtk npm run build`

  Expected: FAIL because the new filter fields and recursive condition properties do not yet exist.

- [ ] **Step 3: Implement the minimal public types**

  Add separate equality/null, ordered, and string-pattern filter interfaces; define a recursive `WhereExpression<TFields>` that adds `and`, `or`, and `not`; preserve existing array membership behavior. Parameterize `RowWhere` with explicitly declared ordered and pattern-capable field-key sets, and update every exported physical `*Where` alias with its concrete profile-derived sets so `pk` can remain an ordered numeric-string field while `name` is pattern-capable text. Define `ContractPayloadFilter` with `path` plus exactly one textual value predicate, and make `ContractWhere` an expression over contract fields that accepts both the existing `active: true | false` shorthand and `active: { equals: true | false }`.

- [ ] **Step 4: Run the TypeScript build to verify the types pass**

  Run: `rtk npm run build`

  Expected: PASS.

- [ ] **Step 5: Commit the public type API**

  ```bash
  rtk git add src/query/model-types.ts tests/unit/query/query-delegate.test.ts
  rtk git commit -m "feat: define recursive PQS query filters"
  ```

### Task 2: Compile logical contract scalar, logical, and payload predicates

**Files:**
- Modify: `src/query/pqs/pqs-sql-compiler.ts:14-108`
- Test: `tests/unit/query/pqs-sql-compiler.test.ts`

- [ ] **Step 1: Write failing compiler tests for range and pattern predicates**

  Call `compileContractFindMany` with each supported comparison operator (`lt`, `lte`, `gt`, `gte`) on the appropriate contract scalar/date field plus `templateId.like` and `templateId.ilike`. Assert every operator is present, `Date` values are bound unchanged, `active: { equals: false }` is equivalent to the existing `active: false` shorthand, no input literal appears in SQL, and `values` preserves traversal order.

- [ ] **Step 2: Run the compiler test file to verify it fails**

  Run: `rtk npm test -- tests/unit/query/pqs-sql-compiler.test.ts`

  Expected: FAIL because the compiler emits only equality/set/null conditions.

- [ ] **Step 3: Write failing compiler tests for nested logical expressions**

  Assert nested `and`, `or`, and `not` produce parenthesized SQL, flat field entries remain ANDed, `and: []` becomes true, and `or: []` becomes false.

- [ ] **Step 4: Implement recursive scalar and logical compilation**

  Replace the flat condition loop with a helper that validates and accepts a `ContractWhere` expression, rejects unknown field/logical keys and operators unavailable for the target field before emitting SQL, recursively joins child conditions, and emits `not (...)`. Reuse one `addValue` closure so all predicates, parties, limit, and offset retain deterministic positional ordering. Keep `active: true/false`, witness membership, and party filtering as leaf conditions.

- [ ] **Step 5: Run the compiler test file to verify scalar and logical filters pass**

  Run: `rtk npm test -- tests/unit/query/pqs-sql-compiler.test.ts`

  Expected: PASS.

- [ ] **Step 6: Write failing compiler tests for payload dot paths and validation**

  Assert `payload: { path: "owner.address.city", ilike: "new%" }` uses PostgreSQL text extraction with a bound `text[]` path and bound pattern; assert empty segments, a missing value predicate, multiple payload value predicates, unknown contract fields, and unsupported predicates throw before SQL execution.

- [ ] **Step 7: Implement payload-path compilation and validation**

  Split and validate the dot path (non-empty segments only), bind its segment array, compile `contract_row.payload #>> $n::text[]`, and allow exactly one of `equals`, range, or pattern predicates with a string value. Reject arrays, objects, null predicates, and multiple value predicates.

- [ ] **Step 8: Run the compiler test file to verify payload behavior passes**

  Run: `rtk npm test -- tests/unit/query/pqs-sql-compiler.test.ts`

  Expected: PASS.

- [ ] **Step 9: Commit logical-contract compilation**

  ```bash
  rtk git add src/query/pqs/pqs-sql-compiler.ts tests/unit/query/pqs-sql-compiler.test.ts
  rtk git commit -m "feat: compile logical and JSON contract filters"
  ```

### Task 3: Extend physical PQS delegates with supported recursive filters

**Files:**
- Modify: `src/query/pqs/pqs-query-client.ts:25-36,214-265`
- Modify: `src/query/pqs/pqs-schema-profile.ts:18-37`
- Test: `tests/unit/query/pqs-query-client.test.ts`

- [ ] **Step 1: Write failing physical-delegate tests**

  Query `packages` using `name.ilike`, a numeric `pk.gte`, and nested `or`/`not`. Assert the SQL is parenthesized and parameters are bound in expression order. Add failures for `like` on a numeric field and range matching on a boolean/JSON/binary/array field.

- [ ] **Step 2: Run the physical-delegate test file to verify it fails**

  Run: `rtk npm test -- tests/unit/query/pqs-query-client.test.ts`

  Expected: FAIL because `RuntimeFilter` and `compileWhere` only understand the current flat operators.

- [ ] **Step 3: Implement supported runtime filter validation and recursive compilation**

  Expand the internal runtime filter shapes, add profile metadata for string/pattern-capable fields, and add a recursive condition compiler used by every physical delegate. Permit ordered predicates only for profile numeric/date/string fields, permit patterns only for the explicit profile string fields, retain `has` exclusively for arrays, and preserve existing multiple-predicate implicit AND behavior.

- [ ] **Step 4: Run the physical-delegate test file to verify it passes**

  Run: `rtk npm test -- tests/unit/query/pqs-query-client.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit physical-delegate filtering**

  ```bash
  rtk git add src/query/pqs/pqs-query-client.ts src/query/pqs/pqs-schema-profile.ts tests/unit/query/pqs-query-client.test.ts
  rtk git commit -m "feat: support logical filters on PQS delegates"
  ```

### Task 4: Preserve the gRPC capability boundary

**Files:**
- Modify: `src/query/grpc/grpc-contract-query-client.ts:55-94`
- Test: `tests/unit/query/grpc-contract-query-client.test.ts`

- [ ] **Step 1: Write failing gRPC capability tests**

  Add representative `contractId.like`, `and`, and `payload` calls and assert each rejects with `QueryCapabilityError` before reading a snapshot.

- [ ] **Step 2: Run the gRPC test file to verify it fails**

  Run: `rtk npm test -- tests/unit/query/grpc-contract-query-client.test.ts`

  Expected: FAIL because nested or new predicates are not inspected by the current flat capability guard.

- [ ] **Step 3: Implement recursive unsupported-filter detection**

  Add a focused predicate walker that accepts only the existing gRPC-supported equality filters and `active: true`; reject any range, pattern, logical, payload, set/null, party-witness, package, or inactive condition with the current capability error.

- [ ] **Step 4: Run the gRPC test file to verify it passes**

  Run: `rtk npm test -- tests/unit/query/grpc-contract-query-client.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the capability guard**

  ```bash
  rtk git add src/query/grpc/grpc-contract-query-client.ts tests/unit/query/grpc-contract-query-client.test.ts
  rtk git commit -m "fix: reject PQS-only gRPC query filters"
  ```

### Task 5: Run integration-level verification

**Files:**
- Verify only; no planned source changes.

- [ ] **Step 1: Run all affected query tests**

  Run: `rtk npm test -- tests/unit/query`

  Expected: PASS.

- [ ] **Step 2: Run the full TypeScript build**

  Run: `rtk npm run build`

  Expected: PASS.

- [ ] **Step 3: Inspect the final diff and working tree**

  Run: `rtk git diff --check && rtk git status --short`

  Expected: no whitespace errors; only the intended feature changes, commits, and pre-existing untracked generated artifacts.
