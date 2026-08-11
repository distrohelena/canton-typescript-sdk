# Template Generator All-Types Design

**Date:** 2026-08-11

## Goal

Make the DAML TypeScript generator expose every modeled named DAML data type in
the input compilation, instead of pruning declarations based on the types
reachable from generated template fields and choices.

## Decision

`DamlInterfaceAnalyzer` will analyze templates as before, then materialize
every `DamlLfDataType` returned by the semantic model. Referenced types remain
resolved recursively so nested and recursive definitions continue to work, but
template fields and choices are no longer the root set for named declarations.

The `DamlLfDataType` model retains the raw LF `serializable` flag. The analyzer
uses that semantic flag to exclude internal type-level definitions such as
`NatSyn`, while still treating every serializable data type as an output
candidate regardless of template reachability.

`ContractId<T>` remains opaque in generated TypeScript and does not resolve or
emit `T` solely because it is a contract-ID target. Value definitions remain
outside the generator's emitted surface and are not new analysis roots.

## Error behavior

If any modeled local data type contains a structured reference that is missing
from the compilation, generation fails with the fully qualified identity. The
generator no longer ignores such a reference merely because no generated
template currently uses the type.

## Implementation boundary

The semantic model gains an operation to enumerate data types with their full
package/module identities. The analyzer's existing type builder gains an
operation to register and fully build one named definition without requiring a
synthetic applied type reference.

## Verification

Tests cover an unused local data type being emitted, non-serializable internal
types being ignored, an unused unresolved data type causing generation failure
for Dalf and DAR input, and successful materialization when an additional local
type is present. The generator is also exercised against all 16 utility DARs in
the supplied `canton-network-utility-dars-0.13.0` directory. Existing
recursive, generic, and opaque contract-ID tests remain green.
