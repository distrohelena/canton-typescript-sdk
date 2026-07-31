# Protobuf Test-Suite Repair Design

## Goal

Restore a green `npm test` run without reintroducing any legacy request or
response wrappers. Generated protobuf-ts messages and their `.create(...)`
factories remain the canonical RPC boundary throughout SDK code, tests, live
harnesses, and debugger fixtures.

## Context

The repository is partway through a protobuf-first public API migration. The
service and transport signatures for several RPCs already accept and return
generated protobuf messages, while older tests and live helpers still import
SDK DTO classes from the package root and instantiate them with `new`. A
protobuf-ts `MessageType` is a factory, not a constructor, so those stale call
sites fail with errors such as `X is not a constructor`. Other stale root DTOs
can reach gRPC serialization and fail there because they are not generated
messages with the required protobuf shape.

The last full run reported 30 failures. They form a small number of related
clusters rather than 30 independent defects:

- stale request construction and stale response-class identity assertions;
- debugger tests importing request/response files removed by prior migrations;
- Active Contracts pagination missing or drifting between `ITransport`,
  `GrpcOperations`, the inventory, and test doubles;
- live connectivity and participant assertions using legacy request or response
  shapes;
- one generated-template materialization test exceeding the global 15-second
  timeout;
- live tests cascading from the initial connectivity failure.

## Considered approaches

### Selected: finish the protobuf-first migration

Migrate every failing caller to the generated request/response type used by the
corresponding service. Construct requests with `.create(...)`, compare
generated responses structurally or through generated APIs, and remove obsolete
root DTO exports and files once repository search proves no supported caller
uses them. Repair actual transport/inventory drift at the boundary instead of
teaching tests about a broken intermediate state.

This keeps one API model, exercises the same values that production transports
serialize, and follows the repository's existing protobuf-first design.

### Rejected: tests-only compatibility shims

Tests could locally wrap `MessageType.create` in constructor-like helpers. That
would make assertions pass while preserving a second, misleading API model and
would not repair live serialization or debugger imports.

### Rejected: restore SDK wrapper constructors

Re-exporting legacy DTO classes would restore backward compatibility, but the
user explicitly rejected that direction. It would also reintroduce mapping code
at RPC boundaries that have already migrated to generated protobuf types.

### Rejected: skip stale or live tests

Changing Vitest patterns, marking failures skipped, or removing live tests from
`npm test` would hide regressions. The acceptance criterion is a real green
suite against the already-running localnet.

## Canonical protobuf boundary

For every migrated RPC, the service client, `ITransport`, gRPC operations,
gRPC transport, JSON unsupported implementation, service registry, tests, and
documentation must agree on the exact generated request and response types.
Tests import generated values either from their generated module or the public
`/protobuf` namespace and call `MessageType.create(...)`. They do not import a
same-named legacy DTO from the package root.

Legacy root exports and their source files are removed only when they duplicate
a generated message for a migrated RPC and no supported non-test caller remains.
This is an intentional cleanup, not a compatibility layer. Package-shape tests
must protect the generated public path and must not preserve the removed root
surface.

## Failure-cluster repairs

### Stale constructors and response assertions

Update participant package, participant party management, pruning, version,
health, and related contract tests to use their generated message factories.
Assertions should verify the generated response value and fields, not
`instanceof` a removed SDK response class. JSON tests continue to assert the
existing `NotSupportedError` contracts where the protocol does not implement
the RPC.

### Debugger fixtures

Replace imports of removed contract/event request and response DTOs with the
generated Ledger API messages already used by the service boundary. Fixture
construction follows the generated shapes. Debugger behavior itself is not
redesigned; only the stale boundary types are migrated.

### Active Contracts pagination

Trace `getActiveContractsPageAsync` end to end. `ITransport`, service client,
gRPC and JSON transports, `GrpcOperations`, channel construction, inventory,
and test doubles must expose one consistent method. If the RPC is synthesized
from a generated streaming API, the inventory documents that disposition
explicitly rather than inventing a generated unary method. Tests must cover the
real operations object so a missing function cannot pass type-only checks.

### Live harness

The live preflight creates health, participant-status, participant-ID,
party-management, package, and user-management requests through generated
factories. Assertions follow generated response fields. This prevents legacy
objects from reaching protobuf serialization and lets downstream live tests run
instead of cascading from preflight failure.

The normal CN quickstart localnet remains external test infrastructure. The
repair does not modify its checkout or weaken authentication/TLS behavior.

### Materialization timeout

Measure the isolated test repeatedly before changing it. If behavior is correct
and duration is consistently near or above the global 15-second ceiling, give
that integration test a narrowly scoped timeout based on observed runtime. If
it regressed, fix the slow path instead. Do not increase the global timeout to
mask unrelated hangs.

## Error handling and compatibility

Transport errors and JSON `NotSupportedError` behavior remain unchanged. The
repair removes stale compatibility surface; it does not add aliases,
constructor adapters, or automatic conversion from SDK DTOs to generated
messages. Compile failures at old imports are acceptable and intentional under
the no-backward-compatibility requirement.

## Testing strategy

Work proceeds cluster by cluster using red-green-refactor:

1. Reproduce the smallest failing test file for a cluster.
2. Confirm its failure matches the diagnosed stale boundary or missing wiring.
3. Make the minimum production/test migration needed for that cluster.
4. Re-run the focused file and adjacent contract tests.
5. Search for remaining stale imports or constructor calls before moving on.

Final verification requires:

- focused tests for every repaired cluster;
- `npm run build`;
- `npm run examples:check`;
- the package type-contract compilation;
- `npm test` with no failures or unexpected skips while the 3.5.7 localnet is
  running;
- scoped lint for changed files and `git diff --check`.

No failure is resolved by deleting an assertion, excluding a suite, or
restoring a legacy wrapper.
