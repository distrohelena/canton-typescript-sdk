# DAML Generic Named Types

## Goal

Generate and materialize DAML named types applied to concrete type arguments,
such as `SplitUnderlying<Amount>`, so Vault Base can be generated without
weakening type safety.

## Scope

Support serializable DAML records and variants that declare ordinary type
parameters and are used with concrete supported DAML types. LF enums have no
type parameters and remain non-generic. Support recursive generic named types.
Continue rejecting unresolved type variables, higher-kinded shapes, arity
mismatches, and unsupported type arguments.

## Model and Analysis

The LF model will retain data-type parameter names, their `TypeVarWithKind`
kinds, and type-variable references. The interface analysis model will add a
`typeVariable` shape and will allow `namedReference` to contain ordered
`typeArguments`. Only parameters of kind `*` are accepted; `Type.forall`,
higher-kinded variables, and variables outside a declaration's lexical type
parameter scope fail analysis.

While analyzing a named data type, the analyzer records its parameter names and
their validated kinds. Generated parameter names use the existing
collision-safe identifier policy and reserve imported/runtime type names. When
a named type is applied, the analyzer validates exact arity, recursively
analyzes each argument, and keeps the application rather than rejecting it. A
declaration's fields retain type variables; uses outside the declaration must
have all such variables bound by the application.

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

`namedReference` descriptors will carry their ordered `typeArguments`. A
generated descriptor factory has one descriptor argument per declared type
parameter and lexically substitutes those arguments into its emitted field or
constructor descriptors. The static registry exposes
`resolve(identity, typeArguments)`, validates the exact factory arity, and
returns the fully concrete descriptor. Recursive applications retain their
own nested type arguments rather than sharing mutable substitution state. The
value converter resolves the application before decoding, so protobuf, PQS,
and JSON paths use the same substituted shape.

## Errors and Compatibility

Non-generic named references continue to emit and materialize exactly as
before. Invalid generic applications fail during analysis with the choice or
field context. The generated registry remains a static class; no top-level
runtime utility functions or registry values are introduced.

## Validation

Tests will cover analysis arity, kind, and lexical type-variable handling;
collision-safe generic parameter names; emitted generic declarations and
applications; descriptor substitution during record and variant
materialization; self and mutual recursion; one generic identity instantiated
with multiple concrete arguments; and generation of the Vault Base DAR that
currently fails on `SplitUnderlying`.
