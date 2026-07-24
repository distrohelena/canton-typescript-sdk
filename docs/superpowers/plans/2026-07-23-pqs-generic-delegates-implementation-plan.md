# PQS Generic Delegates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace basic PQS relation reads with typed Prisma-style generic delegates.

**Architecture:** Profile metadata drives a reusable SQL delegate factory. The public `QueryDelegate` interface carries relation-specific rows, filters, selections, ordering, and unique keys; gRPC provides capability errors outside active contracts.

**Tech Stack:** TypeScript, PostgreSQL `pg`, Vitest.

---

### Task 1: Generic delegate contracts and profile metadata

**Files:**
- Modify: `src/query/query-client.ts`
- Modify: `src/query/model-types.ts`
- Modify: `src/query/pqs/pqs-schema-profile.ts`
- Test: `tests/unit/query/query-delegate.test.ts`

- [ ] Write failing type/runtime tests for `QueryDelegate`, declared unique keys, exercises' intentional lack of `findUnique`, equality/`in`/`{ is: null }`/`{ isNot: null }`/array-membership predicates, exactly-one-field ordering, aggregate shapes, and gRPC capability errors.
- [ ] Run `rtk npm run test -- tests/unit/query/query-delegate.test.ts` and confirm failure.
- [ ] Implement generic arguments/results and complete v1 metadata, including logical contracts joins (`__contracts`, type, creation/archive transactions), lifecycle/derived active fields, and bigint→string, JSON→unknown, arrays→readonly strings, bytea→Uint8Array, timestamp→Date|null mappings.
- [ ] Re-run focused test and commit `feat: define generic query delegates`.

### Task 2: Profile-driven PQS SQL delegate factory

**Files:**
- Modify: `src/query/pqs/pqs-sql-compiler.ts`
- Modify: `src/query/pqs/pqs-query-client.ts`
- Test: `tests/unit/query/pqs-query-client.test.ts`
- Test: `tests/unit/query/pqs-sql-compiler.test.ts`

- [ ] Write failing tests for every relation's predicate forms, projection, exactly-one-field ordering, pagination, count, and aggregate SQL; aggregate tests cover optional count, profile-numeric-only min/max/sum, and null results for empty numeric sets. Test `findUnique` only where the profile declares a stable key. Include PQS contract-party witness filtering and contract-ID-only unique lookup.
- [ ] Run focused tests and confirm failure.
- [ ] Implement the parameterized delegate factory; preserve the logical contracts join and reject non-profile fields.
- [ ] Re-run focused tests and commit `feat: add Prisma-style PQS delegates`.

### Task 3: Complete gRPC capability implementation and public docs

**Files:**
- Modify: `src/query/grpc/grpc-contract-query-client.ts`
- Modify: `README.md`
- Test: `tests/unit/query/grpc-contract-query-client.test.ts`

- [ ] Write failing tests for omitted-party all-hosted ACS, supplied-party narrowing, accepted `active: true` and contractId/templateId equality, plus rejection of `in`, null/array predicates, select/order/pagination, package/lifecycle fields, aggregates, raw SQL, and all non-contract delegates.
- [ ] Run focused test and confirm failure.
- [ ] Implement the exact capability matrix and document the generic interface.
- [ ] Run `rtk npm run test -- tests/unit/query tests/unit/grpc/grpc-contracts-mapper.test.ts`, `rtk npm run build`, and scoped ESLint; commit `docs: complete PQS delegate API`.
