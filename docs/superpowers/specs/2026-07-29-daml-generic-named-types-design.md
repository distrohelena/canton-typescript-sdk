# DAML Generic Named Types

## Goal

Generate and materialize DAML named types applied to concrete type arguments,
such as `SplitUnderlying<Amount>`, so Vault Base can be generated without
weakening type safety.

## Scope

Support serializable DAML records, variants, and enums that declare ordinary
type parameters and are used with concrete supported DAML types. Support
recursive generic named types. Continue rejecting unresolved type variables,
higher-kinded shapes, arity mismatches, and unsupported type arguments.

## Model and Analysis

The LF model will retain data-type parameter names and type-variable
references. The interface analysis model will add a `typeVariable` shape and
will allow `namedReference` to contain ordered `typeArguments`.

While analyzing a named data type, the analyzer records its parameter names.
When a named type is applied, it validates arity, recursively analyzes each
argument, and keeps the application rather than rejecting it. A declaration's
fields retain type variables; uses outside the declaration must have all such
variables bound by the application.

## Generated TypeScript

Named declarations emit TypeScript generics:

```ts
export interface SplitUnderlying<T> {
    readonly underlying: T;
}
```

An application emits `SplitUnderlying<Amount>`. Imports use the existing
readable collision policy: direct names when unambiguous, a readable namespace
prefix only when required.

## Runtime Descriptors

`namedReference` descriptors will carry their ordered `typeArguments`.
Generated descriptor factories accept descriptors for each declared type
parameter. The static generated registry resolves an identity plus its
arguments to a concrete descriptor. The value converter resolves the
application before decoding, so protobuf, PQS, and JSON paths use the same
substituted shape.

## Errors and Compatibility

Non-generic named references continue to emit and materialize exactly as
before. Invalid generic applications fail during analysis with the choice or
field context. The generated registry remains a static class; no top-level
runtime utility functions or registry values are introduced.

## Validation

Tests will cover analysis arity/type-variable handling, emitted generic
declarations and applications, descriptor substitution during materialization,
and generation of the Vault Base DAR that currently fails on
`SplitUnderlying`.
