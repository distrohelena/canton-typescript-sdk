# Participant Status Service Design

## Goal

Expose Canton participant-admin `ParticipantStatusService` through the public TypeScript SDK so callers can read participant node status using SDK-owned DTOs instead of generated protobuf clients.

This change should:

- add a new public `participantStatusService`
- keep the public boundary aligned with the admin gRPC surface
- use `adminEndpoint`
- preserve the SDK rule that public APIs return SDK-owned models, not protobuf classes
- establish a reusable admin-status core so later sequencer and mediator status services can share the same model family

## Decision Summary

- add a new admin-surface public service named `participantStatusService`
- expose one method initially:
  - `getParticipantStatusAsync(request)`
- keep the service on `adminEndpoint`
- fail lazily with `EndpointNotConfiguredError` when `adminEndpoint` is missing
- implement gRPC support now
- treat JSON as unsupported unless a real matching admin JSON endpoint is verified later
- add shared SDK admin-status models instead of inlining a participant-only projection
- model the response in a C#-style shape with nullable properties rather than an explicit discriminator enum

## Public Service Boundary

Add to `CantonClient`:

- `participantStatusService`

Public method:

- `participantStatusService.getParticipantStatusAsync(request)`

Why this name:

- `participantStatusService` matches the real admin gRPC boundary
- `getParticipantStatusAsync(...)` reads naturally in TypeScript and still stays close to the underlying RPC
- it is more explicit than `getStatusAsync(...)`, which would become ambiguous once the SDK adds other admin status services

## API Surface Ownership

`participantStatusService` belongs to the participant-admin surface.

Routing rules:

- use `adminEndpoint`
- if `adminEndpoint` is absent, client construction still succeeds
- the call fails only when `participantStatusService` is used
- the failure should be `EndpointNotConfiguredError`

This keeps the service consistent with the existing endpoint split introduced earlier.

## Public DTO Strategy

The public SDK must not expose generated protobuf classes.

Instead, add SDK-owned request/response/value types:

- `GetParticipantStatusRequest`
- `GetParticipantStatusResponse`
- `AdminNodeStatus`
- `AdminNotInitializedStatus`
- `ParticipantNodeStatus`
- `ConnectedSynchronizerStatus`
- `ConnectedSynchronizerHealth`

## Public DTO Shape

### `GetParticipantStatusRequest`

An empty SDK request class for consistency with the rest of the SDK.

Reason:

- the protobuf request is empty today
- a real SDK request class still keeps the surface uniform and leaves room for future fields without a public shape break

### `GetParticipantStatusResponse`

Use a C#-style response shape:

- `status?: ParticipantNodeStatus`
- `notInitialized?: AdminNotInitializedStatus`

Why no explicit discriminator enum:

- the user explicitly wants a more C#-style model
- nullable properties read naturally on the SDK surface
- the protobuf oneof can still be mapped cleanly without leaking protobuf semantics directly

Expected invariant:

- exactly one of `status` or `notInitialized` is usually populated by the mapper
- the SDK does not need to force that invariant through a discriminated union type

### Shared Admin Status Core

#### `AdminNodeStatus`

SDK-owned projection of the shared admin health `Status`.

This type should be intentionally reusable for:

- participant status
- sequencer status
- mediator status

Its final exact fields should be derived from the generated admin health protobuf during implementation rather than guessed now, but it should represent the shared node-health payload rather than a participant-specific wrapper.

#### `AdminNotInitializedStatus`

SDK-owned projection of the shared admin health `NotInitialized`.

This also belongs in the reusable admin-status core because the same concept can appear across multiple admin status services.

### Participant-Specific Models

#### `ParticipantNodeStatus`

Fields:

- `commonStatus?: AdminNodeStatus`
- `connectedSynchronizers: readonly ConnectedSynchronizerStatus[]`
- `active: boolean`
- `supportedProtocolVersions: readonly number[]`

#### `ConnectedSynchronizerStatus`

Fields:

- `physicalSynchronizerId: string`
- `health: ConnectedSynchronizerHealth`

#### `ConnectedSynchronizerHealth`

SDK enum values:

- `unspecified`
- `healthy`
- `unhealthy`

This stays SDK-owned rather than forwarding the generated enum directly.

## gRPC Mapping Boundary

The implementation should map:

- `com.digitalasset.canton.admin.participant.v30.ParticipantStatusService.ParticipantStatus`

From the generated protobuf surface:

- request: `ParticipantStatusRequest`
- response: `ParticipantStatusResponse`

The mapper should convert:

- protobuf oneof status payload -> `GetParticipantStatusResponse.status`
- protobuf oneof not-initialized payload -> `GetParticipantStatusResponse.notInitialized`
- protobuf connected synchronizer health enum -> `ConnectedSynchronizerHealth`
- shared admin health models -> reusable SDK admin-status DTOs

No generated protobuf classes or enums should cross into the public SDK surface.

## JSON Behavior

Assume JSON does not support this service unless a real participant-admin JSON endpoint is verified later.

Therefore:

- keep the public service present on the shared SDK surface
- JSON transport should throw `NotSupportedError`

Reason:

- the public SDK surface remains stable across transports
- transport capability differences stay runtime concerns
- this matches the existing SDK pattern for gRPC-only services

## Internal Structure

### Public Client And Service Registry

Add:

- `participantStatusService` to `CantonClient`
- `participantStatusService` to the service registry

Bind it to the admin surface transport only.

### Transport Contract

Add a new transport method:

- `getParticipantStatusAsync(request, options?)`

Wire it through:

- `ITransport`
- admin missing-endpoint placeholder behavior
- `GrpcTransport`
- `JsonTransport` as `NotSupportedError`

### gRPC Channel Factory

Add the generated participant status gRPC client dependency to the admin transport wiring and expose one operation for the new unary RPC.

## Error Handling

Expected behavior:

- missing `adminEndpoint` -> `EndpointNotConfiguredError`
- JSON call -> `NotSupportedError`
- gRPC transport or RPC failure -> existing SDK transport error hierarchy
- disposed client/transport -> existing disposal behavior still applies

The public API should never expose raw protobuf errors or types as its intended surface.

## Documentation Changes

Update public docs so they show:

- `participantStatusService` on the admin endpoint surface
- `getParticipantStatusAsync(request)`
- JSON unsupported / gRPC supported
- the new shared admin-status DTO family

The endpoint-surface tables should list this service under admin.

## Testing Strategy

Add focused tests for:

- root exports for `ParticipantStatusServiceClient` and the new DTOs
- `CantonClient` exposing `participantStatusService`
- service-client forwarding into the transport contract
- gRPC mapper coverage for:
  - regular status payload
  - not-initialized payload
  - connected synchronizer health mapping
- service registry lazy missing-admin-endpoint failure
- JSON `NotSupportedError` behavior
- transport/contract tests showing the service is admin-surface and gRPC-backed

Regression goals:

- existing endpoint-splitting behavior remains unchanged
- participant-admin package, party, and user services remain on `adminEndpoint`
- no protobuf classes leak into the public API

## Non-Goals

- no JSON participant status implementation unless a real endpoint is verified
- no sequencer status or mediator status service in this change
- no attempt to standardize every future admin status DTO immediately beyond the shared core needed now
