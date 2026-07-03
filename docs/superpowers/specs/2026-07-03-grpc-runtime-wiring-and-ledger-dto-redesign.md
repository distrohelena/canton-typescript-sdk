# gRPC Runtime Wiring And Ledger DTO Redesign

## Goal

Turn the SDK's default gRPC path into a live runtime transport by:

- replacing the stubbed gRPC operations factory with real protobuf-ts generated client wiring
- redesigning the shallow ledger-facing public DTOs that currently prevent full gRPC implementation

## Scope

This design covers:

- explicit gRPC channel security configuration
- per-call metadata propagation from `IAuthProvider`
- live protobuf-ts client bindings for all methods currently exposed in `GrpcOperations`
- public SDK DTO redesign for ledger query, stream, and command submission workflows
- mapper and test updates needed to keep the shared SDK contract coherent

This design does not cover:

- new endpoint families outside the current SDK surface
- mTLS, custom CA bundles, or advanced channel tuning
- retry policies
- redesign of the JSON transport beyond what is required to keep shared DTOs coherent

## Current Problem

The SDK now has:

- a shared client surface
- gRPC mapper files
- protobuf-ts generated service clients

But the default gRPC runtime path is still incomplete for two separate reasons.

### Problem 1: Runtime Wiring Is Stubbed

[grpc-channel-factory.ts](/home/helena/env/daml/typescript-sdk/src/transports/grpc/grpc-channel-factory.ts) still returns placeholder implementations that throw `TransportError`.

That means the default gRPC client path cannot yet talk to a live Canton participant even for operations whose SDK DTOs are already sufficient.

### Problem 2: Some Public Ledger DTOs Are Too Thin

Several public SDK request types were intentionally minimal placeholders and do not contain enough information to construct real Ledger API v2 gRPC requests.

The affected DTOs are:

- `QueryContractsRequest`
- `StreamTransactionsRequest`
- `SubmitCommandRequest`

By contrast, these admin/shared operations are already close enough to real protocol needs:

- `CreatePartyRequest`
- `ListPartiesRequest`
- `GrantUserRightsRequest`
- `UploadPackageRequest`

So this feature must solve both transport construction and DTO sufficiency together.

## Recommended Project Shape

Treat this as one feature with three internal phases.

### Phase A: Runtime Wiring Foundation

Add real gRPC channel construction, auth metadata propagation, and generated client setup behind the existing `GrpcOperations` façade.

### Phase B: Ledger DTO Redesign

Redesign the shallow ledger-facing public DTOs so they can express real Ledger API v2 requests while still feeling like SDK-owned, C#-style models.

### Phase C: Full Façade Wiring

Use the new DTOs and the runtime foundation to replace the remaining `GrpcOperations` stubs with live generated-client calls.

This sequencing is recommended because it isolates infrastructure work from protocol-shape redesign while still delivering one coherent end result.

## Public Configuration

The SDK should use explicit configuration rather than inferring gRPC channel behavior from the endpoint string.

### New Enum

Add:

- `GrpcChannelSecurity.insecure`
- `GrpcChannelSecurity.tls`

### Client Options

`CantonClientOptions` should gain:

- `grpcChannelSecurity?: GrpcChannelSecurity`

Behavior:

- only relevant when `transportKind === TransportKind.grpc`
- default should be `GrpcChannelSecurity.tls`

This supports both local quickstart usage and hosted TLS participants without overloading the endpoint string.

## Auth And Metadata

Reuse `IAuthProvider` as-is.

For every gRPC call, the runtime layer should:

1. call `await authProvider?.getHeadersAsync()`
2. copy every returned header into protobuf-ts/gRPC metadata
3. pass that metadata to the generated client method

This preserves the existing transport-agnostic auth abstraction and avoids introducing a second gRPC-specific auth model in v1.

## Runtime Wiring Architecture

Keep `GrpcOperations` as the internal boundary.

Why:

- it preserves the current SDK layering
- it keeps protobuf-ts call types out of `GrpcTransport`
- it keeps the fast fake-operations unit tests valid
- it avoids spreading channel construction concerns into higher layers

### Construction Flow

`createGrpcTransport(options)` should pass the full `CantonClientOptions` into `createGrpcOperations(options)`.

`createGrpcOperations(options)` should:

1. select `credentials.createInsecure()` or `credentials.createSsl()` from `GrpcChannelSecurity`
2. construct protobuf-ts `GrpcTransport`
3. construct the generated service clients needed by the SDK
4. adapt those clients into `GrpcOperations`

The channel factory should be the only place that knows about:

- channel credentials
- protobuf-ts gRPC transport construction
- auth metadata creation
- generated client instantiation

## Public DTO Redesign

The public SDK should continue to expose SDK-owned request classes rather than generated protobuf messages.

### QueryContractsRequest

The current DTO only exposes `templateId`, which is not sufficient for real Ledger API state queries.

It should evolve to carry the minimum information needed for real ledger reads, including:

- the querying party or parties
- the template/filter target
- any request format inputs required for the selected state query path
- optional paging or offset inputs if the chosen RPC requires them

The final field set should remain minimal, but it must be enough to build a valid Ledger API request.

### StreamTransactionsRequest

The current DTO only exposes `beginOffset`, which is not sufficient for `UpdateService.GetUpdates`.

It should evolve to carry:

- `beginOffset`
- optional `endOffset`
- party or parties used to build update filters
- the event/update format information needed for a real update stream

### SubmitCommandRequest

The current DTO only exposes `applicationId` and `actAs`, which is not sufficient for `CommandService.SubmitAndWait`.

It should evolve into a real command-submission model with at least:

- `applicationId`
- `actAs`
- optional `readAs`
- command payload details required to build a real `Commands` message
- any minimal metadata needed for command submission

This redesign is not optional if command submission is to be real over gRPC.

## Transport Binding Scope

After the DTO redesign, every current `GrpcOperations` method should be live.

### Feasible Without DTO Redesign

These can be wired directly once runtime construction exists:

- `getHealthAsync`
- `createPartyAsync`
- `listPartiesAsync`
- `grantUserRightsAsync`
- `uploadPackageAsync`

### Requires DTO Redesign First

These require richer SDK DTOs before the runtime implementation can be honest:

- `queryContractsAsync`
- `streamTransactionsAsync`
- `submitCommandAsync`

## Binding Strategy

The runtime layer should use the generated protobuf-ts clients that correspond to the current SDK surface:

- version service for health/version
- party management service for party operations
- user management service for user-rights operations
- package management service for DAR upload
- state or update services for ledger reads
- command service for command submission

The design does not require an all-at-once internal type-tightening refactor. Adapter functions can stay narrow and focused.

## Compatibility With Existing SDK Structure

The SDK should remain instance-based and C#-influenced:

- explicit option class
- enums for closed configuration sets
- SDK-owned DTO classes
- service properties on root clients

No static helper export pattern should be introduced as part of this change.

## Error Handling

For supported operations, the placeholder `TransportError` throws in the gRPC factory should be removed and replaced by real generated-client calls.

If an operation still cannot be honestly implemented because its DTO redesign has not yet landed, it should remain explicitly unsupported during the transition rather than silently faked.

No retry or resilience layer should be added in this feature.

## Testing Strategy

Testing should follow the three internal phases.

### Phase A Tests

Add channel-factory coverage for:

- insecure credential selection
- TLS credential selection
- propagation of all auth-provider headers into gRPC metadata
- invocation of at least one unary generated client through the real factory path

### Phase B Tests

Add request/mapper coverage for the redesigned DTOs:

- DTO construction and validation
- gRPC request mapping for real ledger request shapes
- response mapping where revised DTOs change expected outputs

### Phase C Tests

Add or update integration coverage so the default gRPC path exercises:

- `createGrpcTransport(options)`
- real generated-client calls
- at least one live admin operation
- at least one live ledger operation

Keep the existing fake-operations tests because they still isolate service behavior well.

## Recommendation

Implement this as one feature with three phases:

1. real gRPC runtime wiring
2. minimal public ledger DTO redesign
3. full replacement of the remaining gRPC façade stubs

This is the smallest honest path to a genuinely live gRPC SDK while preserving the current SDK architecture and avoiding transport-specific public DTO fragmentation.
