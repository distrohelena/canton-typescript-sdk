# gRPC Health Check Design

## Goal

Add support for `grpc.health.v1.Health.Check` to the SDK without exposing generated protobuf classes and without blurring it into the existing version surface.

## Decision Summary

- Add a dedicated `healthService` root service boundary
- Add `healthService.checkAsync(...)`
- Use SDK-owned request, response, and enum types
- Support `grpc`
- Reject on `json` with `NotSupportedError`
- Keep `versionService.getLedgerApiVersionAsync(...)` unchanged

## Why A Separate Health Service

`grpc.health.v1.Health.Check` is not the same concept as `VersionService.GetLedgerApiVersion`.

They differ in:

- protocol foundation
- semantic purpose
- response model

Putting health under `versionService` would reintroduce the same kind of boundary drift the SDK was just cleaned up to avoid.

## Public SDK Shape

Add a new service client:

- `HealthServiceClient`

Expose it on:

- `CantonClient`
- `GrpcLedgerClient`
- `JsonLedgerClient`

Public method:

```ts
await client.healthService.checkAsync(
    new HealthCheckRequest({
        service: "grpc.health.v1.Health",
    }),
);
```

## SDK-Owned Types

### `HealthCheckRequest`

Fields:

- `service?: string`

This mirrors the gRPC request selector and allows callers to check overall server health or a specific registered service.

### `HealthCheckResponse`

Fields:

- `status: HealthCheckStatus`

### `HealthCheckStatus`

SDK enum values:

- `unknown`
- `serving`
- `notServing`
- `serviceUnknown`

These values mirror the gRPC health status model while remaining SDK-owned.

## Transport Behavior

### gRPC

Implement `healthService.checkAsync(...)` using `grpc.health.v1.Health.Check`.

The implementation should:

- map `HealthCheckRequest` to the gRPC request shape
- call the generated `grpc.health.v1` client
- map the gRPC serving status enum to `HealthCheckStatus`

### JSON

JSON should not emulate this endpoint.

Reason:

- HTTP liveness endpoints like `/livez` are not `grpc.health.v1`
- they do not share the same response contract
- they should not define the shared SDK surface

Behavior:

- `JsonTransport.checkHealthAsync(...)` throws `NotSupportedError`

### Placeholder Transport

Behavior:

- `PlaceholderTransport.checkHealthAsync(...)` throws `TransportError`

## Internal Architecture

Add:

- `src/services/health/health-service-client.ts`
- SDK request/response/enum files for health check

Extend:

- `src/client/canton-client.ts`
- `src/client/service-registry.ts`
- `src/transports/grpc/grpc-ledger-client.ts`
- `src/transports/json/json-ledger-client.ts`
- `src/core/transports/transport.interface.ts`
- `src/transports/grpc/grpc-transport.ts`
- `src/transports/json/json-transport.ts`
- root exports and protocol-specific exports as needed

The internal transport contract should gain:

- `checkHealthAsync(request: HealthCheckRequest): Promise<HealthCheckResponse>`

## Naming Rules

The SDK should follow the existing rule set:

- gRPC service boundary names shape the public API
- method names stay gRPC-derived
- protobuf-generated classes are not part of the public SDK
- SDK-owned wrappers remain the stable public contract

That means:

- `healthService` is the right service name
- `checkAsync(...)` is the right method name
- `HealthCheckRequest` and `HealthCheckResponse` are SDK types, not generated classes

## Testing

Required coverage:

- package surface test confirms `healthService` is exported on shared and transport-specific clients
- unit test for `HealthServiceClient`
- gRPC transport test for successful `Check`
- JSON transport test confirming `NotSupportedError`
- contract-style test for `grpc` support and `json` rejection
- documentation update coverage through existing public-surface tests

## Documentation

Update:

- `README.md`
- `DOCUMENTATION.md`

Document:

- `healthService.checkAsync(...)`
- full `HealthCheckRequest` support including `service`
- `grpc`-only transport support
- explicit statement that JSON has no equivalent `grpc.health.v1` endpoint

## Out Of Scope

This design does not:

- add support for `grpc.health.v1.Health.Watch`
- alias HTTP liveness endpoints to gRPC health
- rename or replace `versionService`
