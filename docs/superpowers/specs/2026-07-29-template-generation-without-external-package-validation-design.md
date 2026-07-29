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
used by a generated template still fails with its fully qualified package,
module, and type identity instead of producing an untyped binding.
`ContractId<T>` remains its existing special case: its target is never resolved
because the generated value is a string.

DAR generation continues to load all Dalf entries and emit their templates, as
it does today. The new factory changes only global validation: each loaded
package may contain unused external references without blocking generation.

## Verification

Add separate real one-Dalf fixtures (or isolated workspaces) containing an
otherwise-unused data type and an otherwise-unused value definition,
respectively, that directly reference `Splice.Api.Token.HoldingV1.Holding`,
with no Holding package in the workspace. Prove strict `createOrThrow` rejects
each branch independently, while `generateFromDalfOrThrowAsync` succeeds for
the package containing both and emits only reachable template bindings. Cover
the equivalent DAR generation path and ensure no generated source includes the
external package/module name.

Add separate Dalf and DAR negative tests where a template field or choice
directly uses the missing structured Holding type. Generation must reject with
the fully qualified external identity. This proves the factory removes only
unreachable dependency requirements.
