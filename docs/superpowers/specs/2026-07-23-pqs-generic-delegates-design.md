# PQS Generic Delegates Design

## Goal

Replace the basic physical PQS relation `findMany()` helpers with a public,
Prisma-style generic delegate interface while retaining type-safe relation
fields and parameterized SQL.

## API

Expose `QueryDelegate<TRow, TWhere, TSelect, TOrderBy, TUnique>` with `findMany`,
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

`contracts` is the only logical row: it joins `__contracts` to
`__contract_tpe` and creation/archive `__transactions`, exposing contract ID,
package-qualified template ID, package ID, payload, witnesses, lifecycle
offsets/timestamps, and derived active state. The remaining delegates expose
their v1 physical rows with bigint values mapped to strings, JSON to `unknown`,
arrays to readonly strings, bytea to `Uint8Array`, and timestamp values to
`Date | null`.

Generic `where` supports profile-declared equality, `in`, null, and array
membership predicates; null is `{ is: null }` or `{ isNot: null }`.
`findUnique` takes `{ where: TUnique, select?: TSelect }`, preserving each
relation's distinct key shape. `select` narrows the returned row fields; `orderBy`
accepts exactly one profile-declared sort field; `count` returns a number.
`aggregate` takes `{ where?, count?, min?, max?, sum? }`, with numeric field
arrays for `min`/`max`/`sum`, and returns an optional count plus per-field
`string | null` numeric results. It supports `count` on every relation and
`min`/`max`/`sum` only for profile-declared numeric fields. Empty numeric
aggregates return `null`.

Stable unique keys are: contracts `contractId`; contract types/events/exercise
types `pk`; packages `pk` and `id`; transactions `ix` and `offset`; watermark
`singleton`; exercises have no `findUnique` operation.

On gRPC, only `contracts.findMany`, `contracts.findUnique`, and
`contracts.count` are supported, with `contractId`, package-qualified
`templateId`, and active semantics; explicit `active: true` is accepted. All aggregate calls, all other
relations, raw SQL, lifecycle fields, and unsupported filters/selections/orders
throw `QueryCapabilityError` containing the selected source and operation.

## Verification

Unit tests cover each relation's generated SQL, field validation, projection,
unique lookup, count/aggregate behavior, and gRPC capability errors.
