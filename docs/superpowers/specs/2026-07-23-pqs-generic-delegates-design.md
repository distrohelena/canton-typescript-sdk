# PQS Generic Delegates Design

## Goal

Replace the basic physical PQS relation `findMany()` helpers with a public,
Prisma-style generic delegate interface while retaining type-safe relation
fields and parameterized SQL.

## API

Expose `QueryDelegate<TRow, TWhere, TSelect, TOrderBy>` with `findMany`,
`findUnique`, `count`, and `aggregate`. Each PQS relation has a concrete
specialization derived from the v1 schema profile. `findMany` accepts typed
`where`, `select`, `orderBy`, `skip`, and `take`; `findUnique` exists only for
declared stable keys.

## Profile and behavior

The v1 profile is the source of truth for each relation's columns, unique
keys, selectable/filterable/sortable fields, and numeric aggregate fields.
Delegates reject invalid fields locally, bind every value as a PostgreSQL
parameter, and use only profile-controlled identifiers. `$queryRaw` remains
the escape hatch for database-specific predicates.

`QuerySource.grpc` implements only the compatible active-contract subset.
Every other relation delegate, plus unsupported contract operations, rejects
with `QueryCapabilityError` rather than changing sources.

## Verification

Unit tests cover each relation's generated SQL, field validation, projection,
unique lookup, count/aggregate behavior, and gRPC capability errors.
