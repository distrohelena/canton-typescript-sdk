# Template Generation Without External Package Validation Design

## Goal

Generate bindings for a package's own templates from one Dalf without requiring
any referenced external package solely because the Dalf contains unrelated
definitions that mention it.

## Problem

`DamlInterfaceGenerator` currently creates `DamlLfCompilation` through the
global validating constructor. That constructor recursively validates every
data type and value definition in the loaded package before the generator has
selected or analyzed a template. An unused type that mentions an unloaded
Splice package therefore aborts generation, even though no generated file would
reference that type. This remains true after making `ContractId<T>` opaque.

## Design

Add a template-generation compilation factory that builds the compilation
indexes but does not run global reference validation. `DamlInterfaceGenerator`
uses this factory for both Dalf and DAR generation.

The ordinary `DamlLfCompilation.createOrThrow` path remains strict for general
semantic/evaluator consumers. Generator analysis resolves named types lazily
only when they are reachable from an emitted template field or choice. Thus an
unused external reference is ignored, while a real structured external record
used by a generated template still fails clearly instead of producing an
untyped binding. `ContractId<T>` remains its existing special case: its target
is never resolved because the generated value is a string.

## Verification

Add a real one-Dalf fixture containing an otherwise-unused data/value
definition that directly references `Splice.Api.Token.HoldingV1.Holding`, with
no Holding package in the workspace. Prove strict `createOrThrow` still rejects
the fixture, while `generateFromDalfOrThrowAsync` succeeds and emits only the
reachable template bindings. Cover the equivalent DAR generation path and
ensure no generated source includes the external package/module name.
