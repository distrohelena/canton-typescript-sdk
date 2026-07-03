# Shared Request Timeout Design

## Goal

Add timeout support to the public SDK surface so callers can set:

- a client-level default request timeout
- a gRPC-specific client connection timeout
- a per-call timeout override

The feature must be usable from `CantonClient` and the existing public service clients without exposing generated transport clients.

## Decision Summary

- add a transport-neutral public per-call options object
- use `timeoutMs` as the shared per-call and default request timeout field
- map shared `timeoutMs` to gRPC deadlines internally
- map shared `timeoutMs` to JSON `fetch` cancellation internally
- keep gRPC connection timeout separate as `grpcConnectTimeoutMs`
- thread the new shared options through the existing public service methods as an optional second parameter
- ignore transport-neutral request timeout options on unsupported paths only if they are semantically irrelevant; for this feature JSON will actively use them

## Public API Shape

### `CantonClientOptions`

Add:

- `defaultRequestTimeoutMs?: number`
- `grpcConnectTimeoutMs?: number`

Behavior:

- `defaultRequestTimeoutMs` applies to both JSON and gRPC requests
- `grpcConnectTimeoutMs` applies only to gRPC transport construction
- both fields are optional

### `RequestOptions`

Add a new public SDK type, exposed from the root package:

- `RequestOptions`

Fields:

- `timeoutMs?: number`

Behavior:

- this is a shared per-call override object
- callers pass it as the final optional parameter on public service methods
- it must not be added to request DTO classes

Example:

```ts
await client.partyManagementService.listKnownPartiesAsync(
    new ListKnownPartiesRequest(),
    new RequestOptions({
        timeoutMs: 5_000,
    }),
);
```

## Precedence Rules

Effective timeout resolution:

1. per-call `RequestOptions.timeoutMs`
2. `CantonClientOptions.defaultRequestTimeoutMs`
3. no timeout when neither is set

Transport-specific behavior:

- gRPC converts the effective timeout to a call deadline
- JSON converts the effective timeout to request cancellation
- gRPC connection setup separately uses `grpcConnectTimeoutMs` when configured

## Service Surface Changes

Public service methods should accept the shared options object as an optional final parameter.

Examples:

- `versionService.getLedgerApiVersionAsync(request?, options?)`
- `partyManagementService.listKnownPartiesAsync(request, options?)`
- `stateService.getActiveContractsPageAsync(request, options?)`
- `commandService.submitAndWaitAsync(request, options?)`

Methods that already take an observer should place `options` after the observer:

- `stateService.getActiveContractsAsync(request, observer, options?)`
- `updateService.getUpdatesAsync(request, observer, options?)`

This preserves current call shapes while keeping request DTOs transport-neutral.

## Internal Architecture

### Shared SDK Layer

Add a new public request-options type under the core public model.

Update:

- public service client classes
- `ITransport`
- transport implementations

The transport boundary should carry the shared `RequestOptions` object so service clients remain thin.

### gRPC Path

Update the gRPC call-options factory so it can combine:

- auth metadata
- effective request timeout

The effective timeout should be converted to a deadline at call time.

Update the gRPC transport/channel construction path to apply `grpcConnectTimeoutMs` when creating the underlying gRPC transport.

### JSON Path

Update the JSON HTTP client so it can accept an optional effective timeout and use `AbortController` to cancel the fetch.

This keeps the public per-call options shared across transports while letting JSON use the same `timeoutMs` contract.

## Error Handling

Timeout support should integrate with the existing SDK error model where practical.

Expected behavior:

- timed-out JSON requests should surface as SDK timeout failures rather than raw abort details where feasible
- gRPC deadline failures should continue flowing through the existing transport error handling path

This design does not introduce a new public timeout-specific request type.

## Testing Strategy

Add focused tests for:

- `CantonClientOptions` new timeout fields
- shared `RequestOptions` construction
- service-client forwarding of the optional shared options object
- gRPC call-options factory merging auth metadata with a computed deadline
- JSON HTTP client timeout cancellation behavior
- transport-level precedence between per-call `timeoutMs` and client default `defaultRequestTimeoutMs`
- gRPC transport construction wiring for `grpcConnectTimeoutMs`

Regression goal:

- callers can use timeouts from `CantonClient` without touching generated clients
- existing calls without options remain unchanged

## Non-Goals

- no request-class timeout fields
- no exposure of protobuf-ts generated client options in the public API
- no separate public `deadlineMs` field
- no attempt to unify gRPC connect timeout with JSON semantics
