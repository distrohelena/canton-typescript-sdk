# Canton Manager and PQS Query Design

## Goal

Add an additive `CantonManager` façade that keeps gRPC as the SDK's write
path and selects either gRPC or PostgreSQL PQS as its read-query backend. Its
read API must be TypeScript-friendly and Prisma-like, while retaining access
to every PQS relation and the SDK's full existing gRPC surface.

## Construction

`CantonManager` always owns a `CantonClient` constructed from existing gRPC
options. This client remains the only path for command submission, topology,
administration, and every other mutation.

The manager also selects exactly one query backend at construction time:

```ts
const manager = new CantonManager({
    grpc: {
        transportKind: TransportKind.grpc,
        // existing CantonClientOptions
    },
    querySource: QuerySource.pqs,
    pqs: {
        connectionString: process.env.PQS_URL!,
        schema: "public",
    },
});
```

`QuerySource.grpc` does not accept PQS configuration. `QuerySource.pqs`
requires a PostgreSQL connection string and accepts an optional schema that
defaults to `public`.

PQS support uses the `pg` driver and its `Pool` implementation. The manager
owns the pool it creates and `disposeAsync()` closes that pool before disposing
its owned `CantonClient`. The feature supports the same Node.js runtime range
as the SDK and adds `pg` as a production dependency.

The manager exposes:

- `manager.grpc`: the complete existing `CantonClient` service surface and
  all writes.
- `manager.query`: the selected model-oriented read API.

The feature is additive; `CantonClient` remains supported without migration.

## Query surface

`manager.query` uses Prisma-style model delegates. Initial delegates cover the
complete known PQS schema:

- `contracts` (`__contracts`)
- `contractTypes` (`__contract_tpe`)
- `events` (`__events`)
- `exercises` (`__exercises`)
- `exerciseTypes` (`__exercise_tpe`)
- `packages` (`__packages`)
- `transactions` (`__transactions`)
- `watermark` (`__watermark`)

Delegates expose field-aware `findMany`, `findUnique` where a stable unique
key exists, `count`, and supported aggregates. `findMany` accepts `where`,
`select`, `orderBy`, `skip`, and `take`.

```ts
const contracts = await manager.query.contracts.findMany({
    where: {
        templateId: { equals: "packageId:Module:Template" },
        active: true,
    },
    orderBy: { createdEventOffset: "desc" },
    take: 50,
    select: {
        contractId: true,
        templateId: true,
        payload: true,
    },
});
```

PQS delegates compile filters to parameterized PostgreSQL. Relation and schema
identifiers are validated and quoted from a fixed allowlist; data values are
always bound parameters.

`$queryRaw<T>(sql, parameters)` is available only on a PQS-selected manager.
It binds supplied positional parameters, returns caller-declared row types,
and does not interpolate values or identifiers. It is an escape hatch, not a
replacement for typed delegates.

## gRPC behavior and capability boundaries

The gRPC query backend adapts Ledger API reads. Contract delegate operations
fetch the active-contract snapshot through gRPC and apply the same supported
filtering, ordering, projection, and pagination locally. By default it uses
the Ledger API's `filtersForAnyParty` wildcard, which reads contracts visible
for every party hosted by the participant. A query can instead provide one or
more parties to narrow the visibility filter. This deliberately accepts the
higher read cost of gRPC.

The initial backend capability matrix is:

| Query capability | PQS | gRPC |
| --- | --- | --- |
| `contracts.findMany`, `findUnique`, `count` | Current and historical rows where represented by PQS | Active-contract snapshot only, filtered locally |
| PQS relation delegates other than `contracts` | Supported | `QueryCapabilityError` |
| `$queryRaw` | Supported subject to read-only policy | `QueryCapabilityError` |
| Ledger API reads not modelled as a delegate | Available through `manager.grpc` | Available through `manager.grpc` |

Historical or archived contract semantics are never simulated from gRPC ACS
data. They require `QuerySource.pqs` or an explicit gRPC service operation
through `manager.grpc`.

The manager does not silently switch sources. A delegate or raw query that
cannot be served by the selected backend rejects with `QueryCapabilityError`,
identifying the operation and selected `QuerySource`. Full gRPC-specific reads
and services stay available through `manager.grpc` rather than being reduced
to the common model API.

## Caching

Caching is opt-in. Manager options accept a caller-supplied cache store and a
positive TTL; a simple in-memory cache helper is supplied for convenience.
Without this configuration no values are cached.

For gRPC contracts, the cache stores the fetched active-contract snapshot,
allowing several distinct local Prisma-style queries to reuse one snapshot
until expiry. Query calls can bypass caching and callers can invalidate cache
entries, particularly after writes. The SDK makes no freshness guarantee
beyond the configured TTL and explicit invalidation.

## PQS schema contract

The typed layer defines a versioned `PqsSchemaProfile.v1`, rather than treating
the database as an arbitrary PostgreSQL schema. The profile owns the eight
allowlisted relations. The delegates other than `contracts` expose physical
rows, mapping their snake_case columns to stable camelCase TypeScript fields.

`contracts` is intentionally a logical PQS view, not a direct `select *` from
`__contracts`, so it has useful parity with the gRPC active-contract model. In
profile v1 it joins `__contracts.tpe_pk` to `__contract_tpe.pk`, and its
creation/archive indexes to `__transactions.ix`. Its fields are:

- `contractId` from `__contracts.contract_id` (unique)
- `templateId` from the joined contract-type identifier
- `packageId` from `__contracts.creation_package_id`
- `payload` from `__contracts.payload`
- `witnesses` from `__contracts.witnesses`
- `createdEventOffset` and `createdAt` from the creation transaction
- `archivedEventOffset` and `archivedAt` from the archive transaction when one
  exists
- `active`, derived as `archived_at_ix is null`

The supported contract filters are equality/set matching for `contractId`,
`templateId`, `packageId`, and `active`, plus witness membership. Ordering is
limited to `contractId`, `createdEventOffset`, `createdAt`, `archivedEventOffset`,
and `archivedAt`; `payload` is selectable but not filterable or sortable.
The gRPC contract delegate supports the intersecting active-contract subset:
`contractId`, `templateId`, and active semantics, with no historical archive
fields.

`templateId` has one canonical, package-qualified string representation on
both backends: `packageId:moduleName:entityName`. PQS derives it from its
package/type metadata and gRPC maps its `Identifier` fields to the same format.
Unqualified `moduleName:entityName` values are not accepted by typed filters;
callers must choose an exact package identity.

Each profile declares the filterable, sortable, selectable, aggregateable, and
uniquely identifying fields for every other delegate. The first implementation
derives this metadata from the PQS layout used by Canton Explorer and verifies
required relations and columns through `information_schema` when the client is
initialized.

An unknown or incompatible layout fails initialization with a descriptive
schema-profile error. New PQS columns and future PQS versions require a new
profile; they are not silently exposed as typed fields. Raw SQL remains the
intentional escape hatch for database-specific access.

## Raw-query safety

`$queryRaw` uses PostgreSQL positional `$1`, `$2`, and subsequent placeholders
with a separate values array. It accepts a single SQL statement beginning with
`SELECT`, `WITH`, `EXPLAIN`, or `SHOW`; all other statement classes, multiple
statements, and mutable `WITH` bodies are rejected before execution. The
documentation additionally requires a read-only PostgreSQL role for
defense-in-depth. Parameters and connection strings are never included in a
reported error.

## Errors

- `QueryCapabilityError` is used for selected-source limitations.
- PQS failures become structured query errors that preserve PostgreSQL code
  and safe context while redacting parameter values and connection details.
- gRPC failures retain the existing parsed `GrpcTransportError` surface.

## Verification

Unit coverage will include SQL generation and parameter binding, schema
validation, model operation semantics, gRPC local filtering, cache hit/expiry/
invalidation behavior, error and capability mapping, manager write delegation,
and package exports. Live PQS integration coverage can be environment-gated in
a later increment.
