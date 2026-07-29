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
  not resolve or recursively validate that argument. Zero or multiple arguments
  remain invalid.
- Analysis maps it directly to a contract-ID analyzed type with no nested
  contract descriptor.
- Emitted `contractId` descriptors contain only `kind: "contractId"`; decoding
  returns the source string unchanged. The public runtime descriptor keeps an
  optional legacy `contract` member for source compatibility, but generated
  bindings neither emit nor inspect it.
- Every generator traversal stops at a contract ID: template descriptor
  emission, named-reference walking, and legacy type normalization in
  `TemplateBindingEmitter`; named-reference and runtime-primitive traversal in
  `NamedTypeEmitter`; and descriptor emission in `SupportFileEmitter`.

Ordinary named references, including records, variants, and enums nested in
template fields or choices, remain resolvable requirements. This does not make
the generator silently emit `unknown` for real structured dependencies.

## Verification

Add an actual Dalf-byte regression package containing a selected template field,
choice parameter, and choice result typed as
`ContractId<missing:Splice.Api.Token.HoldingV1:Holding>`, with no Holding
package loaded. Compiling and generating that one package must succeed; emitted
descriptors must be exactly `{ kind: "contractId" }`; output types must be
`string`; and protobuf/JSON materialization must return the ID string. Test
that zero and two `ContractId` arguments fail while exactly one unresolved
target succeeds. Keep an unresolved ordinary named-type reference test to prove
structured dependencies still fail.

Update existing descriptor/converter/analyzer/emitter tests for the descriptor
shape without `contract`, and run the DAML-LF plus DAML-interface unit and
integration suites, build, scoped lint, and diff check.
