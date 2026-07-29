# Opaque DAML Contract ID Type Arguments Design

## Goal

Allow generated bindings for a package's own templates from a single Dalf or
DAR package when they use `ContractId<T>` and `T` belongs to an unloaded
dependency package.

## Problem

In DAML, the type argument of `ContractId<T>` identifies the target contract
at the source type level, but its ledger/JSON/gRPC representation is a contract
ID string. The binding generator currently resolves that argument twice: global
compilation validation recursively visits every type argument, and the
generator's analyzed-type builder recursively creates a descriptor for it.
Consequently, `ContractId<Splice.Api.Token.HoldingV1.Holding>` requires the
Holding package even though generated TypeScript only needs `string`.

## Design

`ContractId<T>` is opaque below its arity check:

- Compilation validates that the builtin has exactly one type argument but does
  not resolve or recursively validate that argument.
- Analysis maps it directly to a contract-ID analyzed type with no nested
  contract descriptor.
- Runtime and emitted `contractId` descriptors contain only `kind:
  "contractId"`; decoding returns the source string unchanged.
- Descriptor-walking/import logic does not traverse a contract-ID target.

Ordinary named references, including records, variants, and enums nested in
template fields or choices, remain resolvable requirements. This does not make
the generator silently emit `unknown` for real structured dependencies.

## Verification

Add a regression package containing a selected template field or choice typed
as `ContractId<missing:Splice.Api.Token.HoldingV1:Holding>`, with no Holding
package loaded. Compiling and generating that one package must succeed and the
generated member must materialize as a string. Keep an unresolved ordinary
named-type reference test to prove structured dependencies still fail.

Update existing descriptor/converter/analyzer/emitter tests for the descriptor
shape without `contract`, and run the DAML-LF plus DAML-interface unit and
integration suites, build, scoped lint, and diff check.
