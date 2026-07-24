# PQS Query Filter Expansion Design

## Goal

Extend the PQS query API with comparison and pattern predicates, composable
logical expressions, and JSON payload dot-path predicates. The additions stay
additive to the existing Prisma-like delegate API and retain parameterized SQL
execution.

## Public API

Every string, numeric-as-string, and date field filter gains these optional
predicates:

- `lt`, `lte`, `gt`, and `gte` for ordered comparisons.
- `like` and `ilike` for string fields only.

The profile already maps database numeric values to TypeScript strings; their
comparison predicates bind strings and let PostgreSQL compare them using the
native column type. Dates bind `Date` values and permit only the ordered
predicates. Boolean, JSON, binary, and array fields retain only their existing
equality/null or array-membership operations. TypeScript filter types encode
these restrictions, and the runtime compiler repeats them for callers using
untyped JavaScript.

`where` becomes a recursive condition expression. Existing field entries keep
their implicit-AND behavior. `and` and `or` contain arrays of condition
expressions; `not` contains a single expression.

```ts
where: {
  and: [
    { createdEventOffset: { gte: "100" } },
    { payload: { path: "owner.address.city", ilike: "new%" } },
    { not: { active: { equals: false } } },
  ],
}
```

PQS contracts additionally support `payload: { path, ...predicate }`, where
`path` is a non-empty dot-separated sequence of non-empty key segments. A
literal dot cannot occur in a key segment in v1. A payload condition uses
exactly one of `equals`, `lt`, `lte`, `gt`, `gte`, `like`, or `ilike`, with a
string value. It extracts the matched JSON scalar as text, so all its ordered
comparisons have explicit lexical-text semantics. JSON arrays, objects, and
JSON-null predicates are out of scope for v1. Multiple payload conditions are
composed with `and` or `or`.

Field filters preserve existing composition: every supplied supported predicate
on one field is ANDed together. `is` and `isNot` can therefore be combined with
value predicates just as before. A filter is invalid only if it requests an
operator unavailable for that field type; a payload filter is invalid if it
does not contain exactly one supported value predicate.

## Compilation and Safety

The compiler will recursively compile expressions and return SQL plus an
ordered parameter array. SQL identifiers continue to come only from the schema
profile's fixed allowlist. All scalar predicate values and JSON path segments
are bound parameters.

Scalar predicates compile to PostgreSQL operators: `=`, `<`, `<=`, `>`, `>=`,
`LIKE`, and `ILIKE`. Existing `in`, `is`, `isNot`, and array `has` retain their
behavior. JSON paths use PostgreSQL text extraction against the `payload`
column, passing the split path as a bound `text[]` parameter and applying the
textual operator set.

An empty `and` compiles to true and an empty `or` compiles to false. `not`
wraps its single compiled child. Invalid dot paths, unknown fields, unsupported
operators, and invalid operator combinations reject before any database call.

## Scope and Compatibility

The features are implemented for the PQS query client. Existing gRPC query
capability boundaries remain unchanged; it will not claim support for new
PQS-specific JSON or pattern semantics. Existing flat filters, selects,
ordering, pagination, aggregates, and error redaction remain compatible.

## Verification

Unit tests will prove generated SQL and parameter order for each comparison and
pattern predicate, nested logical expressions, JSON paths, empty logical
groups, and validation failures. The existing query test suite and TypeScript
build will validate compatibility.
