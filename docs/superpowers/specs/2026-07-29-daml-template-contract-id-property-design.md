# DAML Template Contract ID Property Design

## Goal

Expose a generated template instance's contract ID through a read-only
`contractId` property instead of a `get()` method.

## Design

`DamlTemplate` continues to own its contract ID exclusively in a private field
set by its constructor. It exposes `get contractId(): string`, so generated
template classes expose a synchronous, property-shaped API.

Generated exercised-choice event classes do not extend `DamlTemplate`. They
retain their existing `public readonly contractId` constructor field, which
already has the required property-shaped API.

The generator will not emit or retain `get()`. This keeps the base class
minimal and avoids two competing public access patterns.

## Compatibility

This is an intentional public API replacement: generated-template consumers
use `instance.contractId` rather than `instance.get()`. No connection, schema
validation, or other asynchronous initialization is involved in reading this
locally held value.

Because `get` is no longer a member of the template base class, generated DAML
fields named `get` must keep that source name, allowing direct
`instance.get` field access. Choice names retain their source identity through
the existing generated choice-event naming path; this change introduces no
static choice-factory API. Remove `get` from both the TypeScript-keyword and
template-member reservation sets, and add collision tests for these resolved
names. `contractId` and `constructor` remain reserved because they still
conflict with generated class members.

## Verification

Unit tests will prove that the getter returns the constructor-supplied value,
that generated template instances expose it, that choice-event classes retain
their property, and that the old method is absent. Update the base runtime
test, generated-template materialization integration test and its local module
interface, generated-project compilation consumer test, and `DOCUMENTATION.md`.
Update the earlier template-generator design and implementation-plan documents
to replace their obsolete `get()` contract so it cannot be reintroduced. The
generated-project compilation integration test will continue to type-check
emitted bindings.
