# DAML Template Contract ID Property Design

## Goal

Expose a generated template instance's contract ID through a read-only
`contractId` property instead of a `get()` method.

## Design

`DamlTemplate` continues to own its contract ID exclusively in a private field
set by its constructor. It exposes `get contractId(): string`, so all generated
template and exercised-choice event classes inherit the same synchronous,
property-shaped API.

The generator will not emit or retain `get()`. This keeps the base class
minimal and avoids two competing public access patterns.

## Compatibility

This is an intentional public API replacement: generated-binding consumers use
`instance.contractId` rather than `instance.get()`. No connection, schema
validation, or other asynchronous initialization is involved in reading this
locally held value.

## Verification

Unit tests will prove that the getter returns the constructor-supplied value,
that generated template and choice-event instances expose it, and that the old
method is absent. The generated-project compilation integration test will
continue to type-check emitted bindings.
