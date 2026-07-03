# gRPC Channel Wiring Design

## Goal

Replace the current stubbed gRPC operations factory with real protobuf-ts generated client wiring for every SDK operation currently exposed through `GrpcOperations`.

## Scope

This design covers:

- explicit gRPC channel security configuration
- real `GrpcOperations` wiring backed by generated protobuf-ts clients
- per-call metadata propagation from `IAuthProvider`
- replacement of stubbed `TransportError` implementations in `grpc-channel-factory.ts`
- tests for channel security selection and metadata propagation

This design does not cover:

- new SDK endpoints
- mTLS or custom certificate bundle configuration
- retry policies or advanced call options
- transport-specific public APIs beyond what already exists

## Current Problem

The SDK now has a complete shared gRPC transport surface for the currently implemented services, but [grpc-channel-factory.ts](/home/helena/env/daml/typescript-sdk/src/transports/grpc/grpc-channel-factory.ts) still returns stub operations that throw `TransportError`.

That means:

- service-level unit tests pass through fake operations
- the gRPC mapper layer exists
- the default gRPC transport path cannot yet talk to a live Canton participant

The missing piece is real runtime wiring from `CantonClientOptions` into protobuf-ts generated service clients.

## Recommended Architecture

Keep `GrpcOperations` as the internal boundary and implement it with generated service clients.

Why this is the right boundary:

- it preserves the current SDK layering
- it keeps protobuf-ts call objects out of `GrpcTransport`
- it keeps existing fake-operations unit tests valid
- it limits the wiring change to the gRPC construction path instead of forcing a transport-wide refactor

The implementation should therefore:

1. extend `CantonClientOptions` with explicit gRPC channel-security configuration
2. construct a real protobuf-ts gRPC transport from those options
3. create generated service clients from that transport
4. adapt those generated clients into the existing `GrpcOperations` façade

## Public Configuration

The SDK should use explicit configuration rather than inferring behavior from the endpoint string.

### New Enum

Add a new SDK enum:

- `GrpcChannelSecurity.insecure`
- `GrpcChannelSecurity.tls`

This fits the C#-style SDK direction and avoids boolean configuration that becomes unclear as the transport grows.

### Client Options

`CantonClientOptions` should gain an optional property:

- `grpcChannelSecurity?: GrpcChannelSecurity`

Behavior:

- only relevant when `transportKind === TransportKind.grpc`
- default should be `GrpcChannelSecurity.tls`

Defaulting to TLS is the safer production posture while still allowing explicit insecure local testing.

## Auth And Metadata

Reuse `IAuthProvider` exactly as it exists today.

The gRPC wiring layer should:

1. call `await authProvider?.getHeadersAsync()` before each RPC
2. copy every returned header into gRPC metadata
3. pass that metadata as call options to the generated protobuf-ts client method

This design intentionally forwards all headers, not only `authorization`, because:

- it preserves the transport-agnostic auth abstraction already chosen for the SDK
- it allows future custom metadata without redesigning auth
- it keeps the common bearer-token case working naturally

No separate gRPC auth abstraction should be added in v1.

## Channel Construction

`createGrpcTransport(options)` should pass the full `CantonClientOptions` object into the gRPC factory, not only the endpoint string.

`createGrpcOperations(options)` should:

1. choose `credentials.createInsecure()` for `GrpcChannelSecurity.insecure`
2. choose `credentials.createSsl()` for `GrpcChannelSecurity.tls`
3. build a `GrpcTransport` from `@protobuf-ts/grpc-transport`
4. create the generated service clients needed by the current SDK surface

The channel factory should be the only place that knows about:

- channel credentials
- metadata creation
- generated client construction

That keeps `GrpcTransport` focused on mapping SDK DTOs to transport requests and back.

## Service Bindings

Every method already present in `GrpcOperations` should be wired to a real generated client.

Expected bindings:

- `getHealthAsync`
  - service: health/version service already used by the SDK
- `createPartyAsync`
  - service: `PartyManagementService.AllocateParty`
- `listPartiesAsync`
  - service: `PartyManagementService.ListKnownParties`
- `grantUserRightsAsync`
  - service: `UserManagementService.GrantUserRights`
- `uploadPackageAsync`
  - service: package-management service already represented in the SDK
- `queryContractsAsync`
  - service: contract or state query service currently targeted by the SDK mapper layer
- `streamTransactionsAsync`
  - service: update/event service currently targeted by the SDK mapper layer
- `submitCommandAsync`
  - service: command submission or command service currently targeted by the SDK mapper layer

The spec does not force a broad internal type-tightening refactor. `GrpcOperations` can remain a façade with mostly `unknown` payload types if that keeps the change focused, though typed helper functions are acceptable where low-cost.

## Error Handling

The wiring layer should stop using placeholder `TransportError` throws for supported methods.

Instead:

- generated client errors should surface through the existing gRPC transport path
- metadata-building failures from `authProvider` should propagate as the underlying error unless later normalized elsewhere

No retry or fallback policy should be added in this change.

## Testing Strategy

Add focused coverage in three layers.

### Unit Tests

Add tests for:

- insecure credential selection
- TLS credential selection
- metadata propagation from `IAuthProvider`
- binding of at least one representative unary operation through the real factory logic

### Existing Service-Level Tests

Keep the current fake-operations tests:

- they are fast
- they still validate mapper/service behavior independently of channel construction

### Integration Tests

Update or add integration coverage so the default gRPC construction path exercises:

- `createGrpcTransport(options)`
- real channel-security selection
- real generated-client invocation against the local quickstart-backed environment

This is the important end-to-end proof that the default gRPC client path is no longer stubbed.

## Recommendation

Implement real generated-client wiring behind the existing `GrpcOperations` façade, add explicit `GrpcChannelSecurity` to `CantonClientOptions`, and forward all auth-provider headers into gRPC metadata per call.

This is the smallest change that turns the current gRPC SDK path from structurally complete but runtime-stubbed into a live transport path without breaking the SDK’s current layering.
