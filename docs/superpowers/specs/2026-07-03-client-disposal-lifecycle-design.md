# Client Disposal Lifecycle Design

## Goal

Add a public disposal API so long-lived server applications can cache SDK clients and shut them down cleanly when the process or container is stopping.

The disposal contract must be available from:

- `CantonClient`
- direct public transport instances in the `grpc` and `json` subpaths

After disposal, further SDK calls must fail immediately and deterministically.

## Decision Summary

- add `disposeAsync(): Promise<void>` to the public lifecycle surface
- expose disposal on both `CantonClient` and public transport classes
- make disposal idempotent
- enforce disposal at the transport boundary so all service clients inherit the same behavior
- throw a dedicated SDK lifecycle error after disposal instead of relying on lower-layer failures
- treat JSON disposal as a logical lifecycle transition even though it currently has no persistent channel to close

## Public API Shape

### `CantonClient`

Add:

```ts
public disposeAsync(): Promise<void>;
```

Behavior:

- disposes the shared transport instance created for the client
- can be called multiple times without throwing
- after disposal, any future service call through that client fails immediately

### Public Transport Classes

Add the same lifecycle method to:

- `GrpcTransport`
- `JsonTransport`

Behavior:

- direct transport users can dispose them explicitly
- disposal is idempotent
- calls made after disposal fail immediately with an SDK lifecycle error

### Transport Contract

Add disposal to `ITransport` so the lifecycle surface is shared consistently across:

- concrete transports
- the placeholder transport
- the transport instance owned by `CantonClient`

## Error Model

Add a dedicated SDK error for post-disposal usage:

- `ObjectDisposedError`

Behavior:

- extends the existing SDK error hierarchy
- represents attempts to use a disposed client or transport
- carries a deterministic message such as:
  - `"The client or transport has been disposed."`

This keeps the public API C#-shaped and avoids leaking transport-specific shutdown details.

## Ownership And Enforcement

### Root Ownership

`CantonClient` should continue to own exactly one transport instance through the service registry. Disposal of the root client delegates to that shared transport.

This ensures:

- one cached client maps to one lifecycle boundary
- all service clients on the same root client observe the same disposed state
- there is no need to duplicate lifecycle state in every service wrapper

### Transport Boundary Guard

The disposed-state check should live in the transport implementations, not in every service client.

Reasoning:

- all public service clients already delegate through a shared transport
- direct transport consumers also need the same protection
- the guard stays centralized and easier to test

Concrete effect:

- `versionService`, `healthService`, `partyManagementService`, and the rest all fail consistently after root disposal
- direct `GrpcTransport` and `JsonTransport` usage fails the same way

## Transport-Specific Behavior

### gRPC

The gRPC implementation currently uses protobuf-ts over `@grpc/grpc-js`. The underlying protobuf transport already exposes a synchronous `close()` method.

Disposal behavior:

- `GrpcTransport.disposeAsync()` closes the underlying protobuf-ts transport
- the public SDK method remains async for uniformity and future flexibility
- after close, the transport marks itself disposed and rejects future calls before attempting RPC work

### JSON

The JSON implementation currently uses stateless `fetch` calls and does not hold a reusable socket or channel object.

Disposal behavior:

- `JsonTransport.disposeAsync()` is currently a cleanup no-op plus disposed-state transition
- future requests still fail immediately after disposal
- this leaves room for future persistent JSON resources without changing the API

### Placeholder Transport

The placeholder transport should also implement `disposeAsync()` and adopt the same idempotent disposed-state behavior.

This keeps the lifecycle contract consistent even on unsupported or future transport variants.

## Service Registry Changes

The service registry should return the shared transport instance in addition to the service wrappers so `CantonClient` can own and dispose it explicitly.

Example shape:

- `transport`
- `versionService`
- `healthService`
- other service wrappers

This is an internal change only; the public service surface remains unchanged.

## Idempotency And Semantics

Disposal should be idempotent:

- first call performs cleanup and marks the instance disposed
- later calls return successfully without repeating destructive work

Post-disposal usage should be deterministic:

- no best-effort forwarding
- no partial reuse of previously captured service objects
- no dependency on gRPC or fetch internals to explain failure

## Testing Strategy

Add focused tests for:

- `CantonClient.disposeAsync()` delegating exactly once to the shared transport
- `GrpcTransport.disposeAsync()` closing the underlying protobuf transport
- `JsonTransport.disposeAsync()` preventing further requests
- service calls failing with `ObjectDisposedError` after root disposal
- direct transport calls failing with `ObjectDisposedError` after direct disposal
- disposal idempotency on client and transport paths

Regression goal:

- no behavior changes before disposal
- predictable shutdown semantics for cached SDK clients in server applications

## Non-Goals

- no synchronous `dispose()` or `close()` alias in this change
- no attempt to cancel in-flight operations during disposal
- no public exposure of lower-level gRPC channel objects
- no per-service disposal methods
