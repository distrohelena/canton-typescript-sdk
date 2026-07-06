# Topology Read And Query Design

## Goal

Expose the Canton topology read/query surface through the public TypeScript SDK using SDK-owned DTOs and public services that mirror the real gRPC service boundaries.

This change should:

- add public topology services for participant-admin topology reads
- expose the unary read/list/query RPCs first
- keep the public boundary aligned with Canton topology admin gRPC services
- preserve the SDK rule that public APIs return SDK-owned models, not generated protobuf classes
- keep transport behavior explicit: gRPC supported, JSON rejected for this slice

## Scope

This design covers the first topology-admin read/query slice:

- public `topologyManagerReadService`
- public `topologyAggregationService`
- SDK-owned request, response, enum, and value DTOs for unary topology reads
- gRPC mapping for the covered topology admin read/query RPCs
- participant-admin endpoint wiring, lazy missing-endpoint behavior, docs, and tests

This design does not cover:

- topology write, propose, authorize, import, or temporary-store operations
- server-streaming read RPCs such as snapshot export or genesis state export
- JSON implementations for topology admin endpoints
- parsing raw topology transaction bytes returned by `ListAll` and `ListAllV2`

## Decision Summary

- add two new public participant-admin services:
  - `topologyManagerReadService`
  - `topologyAggregationService`
- keep the service split literal to the Canton gRPC boundaries
- support the unary read/query RPCs first
- route both services through `participantAdminEndpoint`
- fail lazily with `EndpointNotConfiguredError` when `participantAdminEndpoint` is missing
- support gRPC now
- treat JSON as unsupported for all topology admin methods in this slice
- expose SDK-owned topology DTOs only
- keep `ListAllAsync` available but marked deprecated because the upstream RPC is deprecated
- expose `ListAllV2Async` as the preferred raw topology transaction query

## Public Service Boundary

Add to `CantonClient`:

- `topologyManagerReadService`
- `topologyAggregationService`

### `topologyManagerReadService`

Public methods:

- `listNamespaceDelegationAsync(request, options?)`
- `listDecentralizedNamespaceDefinitionAsync(request, options?)`
- `listOwnerToKeyMappingAsync(request, options?)`
- `listPartyToKeyMappingAsync(request, options?)`
- `listSynchronizerTrustCertificateAsync(request, options?)`
- `listParticipantSynchronizerPermissionAsync(request, options?)`
- `listPartyHostingLimitsAsync(request, options?)`
- `listVettedPackagesAsync(request, options?)`
- `listPartyToParticipantAsync(request, options?)`
- `listSynchronizerParametersStateAsync(request, options?)`
- `listSequencingParametersStateAsync(request, options?)`
- `listMediatorSynchronizerStateAsync(request, options?)`
- `listSequencerSynchronizerStateAsync(request, options?)`
- `listLsuAnnouncementAsync(request, options?)`
- `listLsuSequencerConnectionSuccessorAsync(request, options?)`
- `listAvailableStoresAsync(request, options?)`
- `listAllAsync(request, options?)`
- `listAllV2Async(request, options?)`

### `topologyAggregationService`

Public methods:

- `listPartiesAsync(request, options?)`
- `listKeyOwnersAsync(request, options?)`

Why this split:

- it matches the real Canton service boundaries
- it keeps the SDK aligned with your earlier decision to mirror gRPC services literally
- it avoids a future cleanup when write services and streaming read services are added later

## API Surface Ownership

Both topology services belong to the participant-admin surface.

Routing rules:

- use `participantAdminEndpoint`
- if `participantAdminEndpoint` is absent, client construction still succeeds
- calls fail only when a topology service method is used
- the failure should be `EndpointNotConfiguredError`

This keeps topology admin behavior consistent with the current lazy endpoint model.

## Transport Behavior

All methods in this first topology slice are `gRPC only`.

Behavior by transport:

- gRPC: supported
- JSON: reject with `NotSupportedError`

Reason:

- no verified JSON topology-admin surface is in scope here
- the SDK should not pretend topology admin has a shared transport-neutral implementation when it does not
- the public service can still exist on the client while transport capability differences stay runtime concerns

## Public DTO Strategy

The public SDK must not expose generated protobuf request/response/message types or generated enums.

Instead, add SDK-owned topology DTO families under a dedicated topology type area, for example:

- `core/types/topology/...`
- `core/types/requests/...`
- `core/types/responses/...`

The DTO design should stay close to Canton semantics without copying protobuf naming mechanically.

## Shared Topology Query Core

Add SDK-owned shared topology primitives:

- `TopologyStoreId`
- `TopologyStoreKind`
- `TopologyStoreAuthorized`
- `TopologyStoreTemporary`
- `TopologyStoreSynchronizer`
- `TopologyBaseQuery`
- `TopologyTimeQueryKind`
- `TopologyTimeRange`
- `TopologyBaseResult`
- `TopologyMappingOperation`

### `TopologyBaseQuery`

This should mirror Canton `BaseQuery` closely:

- `storeId?: TopologyStoreId`
- `includeProposals: boolean`
- `operation: TopologyMappingOperation`
- exactly one time selector:
  - `snapshot?: Date`
  - `headState?: boolean`
  - `timeRange?: TopologyTimeRange`
- `signedKeyFingerprint?: string`
- `protocolVersion?: number`

The implementation should validate or normalize the time selector in a way consistent with the rest of the SDK, but the public model should remain simple and C#-style.

### `TopologyBaseResult`

This should mirror Canton per-row topology context:

- `storeId?: TopologyStoreId`
- `sequencedAt?: Date`
- `validFrom?: Date`
- `validUntil?: Date`
- `operation: TopologyMappingOperation`
- `transactionHash: Uint8Array`
- `serial: number`
- `signedByFingerprints: readonly string[]`

## Shared Topology Result Wrapper

Use a consistent SDK wrapper for topology mapping reads:

- `TopologyMappingResult<TItem>`

Fields:

- `context?: TopologyBaseResult`
- `item: TItem`

All mapping/state list responses should use this pattern rather than inventing custom per-method wrappers.

Examples:

- `ListPartyToParticipantResponse.results: readonly TopologyMappingResult<PartyToParticipant>[]`
- `ListNamespaceDelegationResponse.results: readonly TopologyMappingResult<NamespaceDelegation>[]`
- `ListVettedPackagesResponse.results: readonly TopologyMappingResult<VettedPackages>[]`

## Topology Payload Models

Add SDK-owned value models for the topology payloads returned by the covered RPCs.

This first slice should include SDK models for:

- `NamespaceDelegation`
- `NamespaceDelegationRestriction`
- `DecentralizedNamespaceDefinition`
- `OwnerToKeyMapping`
- `PartyToKeyMapping`
- `SynchronizerTrustCertificate`
- `ParticipantSynchronizerPermission`
- `PartyHostingLimits`
- `VettedPackages`
- `VettedPackage`
- `PartyToParticipant`
- `PartyToParticipantParticipant`
- `DynamicSynchronizerParameters` projection
- `DynamicSequencingParameters` projection
- `MediatorSynchronizerState`
- `SequencerSynchronizerState`
- `LsuAnnouncement`
- `LsuSequencerConnectionSuccessor`
- `LsuSequencerConnection`
- `TopologyTransactions`
- `TopologyTransactionItem`

The exact fields should be derived from the generated Canton protobufs during implementation rather than guessed beyond what the current protobufs already show, but the public models must remain SDK-owned.

## Enum Strategy

Use SDK enums where the upstream protocol uses stable enums and the values are meaningful in the public API:

- `TopologyMappingOperation`
- `ParticipantPermission`
- `TopologyMappingCode`

Keep raw strings where Canton is effectively string-based or open-ended:

- party ids
- participant ids
- synchronizer ids
- key owner uid
- key owner type
- member ids

This keeps the public API typed where it helps while avoiding fake certainty for open string domains.

## Request And Response Families

Each RPC should have SDK-owned request and response types matching the public method name.

Examples:

- `ListPartyToParticipantRequest`
- `ListPartyToParticipantResponse`
- `ListAvailableStoresRequest`
- `ListAvailableStoresResponse`
- `ListPartiesRequest`
- `ListPartiesResponse`

Collision rule:

- when a topology RPC name would collide with an existing public SDK request or response type, use a service-prefixed topology DTO name while keeping the service method name literal
- examples:
  - topology aggregation `ListParties` may use `TopologyListPartiesRequest` and `TopologyListPartiesResponse`
  - topology manager read `ListVettedPackages` may use `TopologyListVettedPackagesRequest` and `TopologyListVettedPackagesResponse`

This keeps the method surface faithful to Canton while avoiding ambiguous or conflicting public type names at the SDK root.

### Mapping Read Requests

Most `TopologyManagerReadService` requests should compose:

- `baseQuery?: TopologyBaseQuery`
- plus RPC-specific filters such as:
  - `filterParty`
  - `filterParticipant`
  - `filterNamespace`
  - `filterSynchronizerId`
  - `filterSequencerId`
  - `filterSuccessorPhysicalSynchronizerId`

### Mapping Read Responses

Most `TopologyManagerReadService` responses should expose:

- `results: readonly TopologyMappingResult<TItem>[]`

### Aggregation Requests And Responses

`TopologyAggregationService` request and response models should stay distinct from mapping reads because they return aggregated views, not topology transactions plus topology context.

#### `ListPartiesRequest`

Fields:

- `asOf?: Date`
- `limit?: number`
- `synchronizerIds: readonly string[]`
- `filterParty?: string`
- `filterParticipant?: string`

#### `ListPartiesResponse`

Expose aggregated party hosting information rather than topology transaction context:

- `results: readonly TopologyPartyResult[]`

Suggested payload family:

- `TopologyPartyResult`
- `TopologyPartyParticipant`
- `TopologyPartyParticipantSynchronizerPermission`

#### `ListKeyOwnersRequest`

Fields:

- `asOf?: Date`
- `limit?: number`
- `synchronizerIds: readonly string[]`
- `filterKeyOwnerType?: string`
- `filterKeyOwnerUid?: string`

#### `ListKeyOwnersResponse`

Expose:

- `results: readonly TopologyKeyOwnerResult[]`

Suggested payload family:

- `TopologyKeyOwnerResult`
- `TopologySigningKey`
- `TopologyEncryptionKey`

## `ListAvailableStores`

`ListAvailableStoresAsync` should expose SDK-owned store identifiers:

- `ListAvailableStoresResponse.storeIds: readonly TopologyStoreId[]`

This is the core primitive that the rest of `TopologyBaseQuery.storeId` should reuse.

## `ListAll` And `ListAllV2`

Expose both RPCs because they are part of the read/query boundary, but treat them as raw topology transaction queries rather than parsed mapping unions in this slice.

### `ListAllAsync`

- supported on gRPC
- public comments should mark it deprecated
- request should expose:
  - `baseQuery?: TopologyBaseQuery`
  - `excludeMappings: readonly string[]`
  - `filterNamespace?: string`

### `ListAllV2Async`

- supported on gRPC
- preferred API
- request should expose:
  - `baseQuery?: TopologyBaseQuery`
  - `includeMappings: readonly TopologyMappingCode[]`
  - `filterNamespace?: string`

### Shared Response Shape

Both responses should expose:

- `result?: TopologyTransactions`

`TopologyTransactions` should expose:

- `items: readonly TopologyTransactionItem[]`

`TopologyTransactionItem` should expose:

- `sequencedAt?: Date`
- `validFrom?: Date`
- `validUntil?: Date`
- `transaction: Uint8Array`
- `rejectionReason?: string`

Non-goal for this slice:

- do not decode `transaction` bytes into parsed topology mapping unions yet

## Naming And Style Rules

Public naming should follow the existing SDK conventions:

- camelCase fields
- PascalCase class and enum names
- `Async` suffix on service methods
- instance-oriented service properties on `CantonClient`

The surface should still feel C#-style:

- explicit request and response classes
- explicit service classes
- no static helper exports as the main API
- enums where they add real clarity

## Internal Structure

### Public Service Clients

Add:

- `services/topology-manager-read/topology-manager-read-service-client.ts`
- `services/topology-aggregation/topology-aggregation-service-client.ts`

Expose them from:

- `CantonClient`
- `ServiceRegistry`
- `src/index.ts`

### Transport Contract

Extend `ITransport` with explicit topology methods matching the new public services.

The transport contract should not expose generated protobuf classes. It should accept and return SDK DTOs only.

### gRPC Transport

Add gRPC support for:

- `TopologyManagerReadService`
- `TopologyAggregationService`

Implementation areas likely include:

- gRPC channel factory wiring
- gRPC transport operations
- topology request mappers
- topology response mappers

### JSON Transport

Add method stubs that reject with `NotSupportedError` for all topology read/query calls in this slice.

### Placeholder And Missing-Surface Transport

Extend the placeholder/lazy participant-admin surface behavior so:

- missing `participantAdminEndpoint` fails lazily when topology methods are invoked
- error messages identify the unavailable topology service or operation clearly

## Error Handling

Expected behavior:

- missing `participantAdminEndpoint` -> `EndpointNotConfiguredError`
- JSON topology call -> `NotSupportedError`
- gRPC RPC or transport failure -> existing mapped transport error hierarchy
- disposed client or transport -> existing disposal behavior remains unchanged

The public API should never surface generated protobuf types as its intended contract.

## Documentation Changes

Update public docs so they show:

- `topologyManagerReadService` under the participant-admin surface
- `topologyAggregationService` under the participant-admin surface
- each new method with a concise summary
- `gRPC supported`
- `JSON rejects it`
- `listAllAsync` deprecated

`DOCUMENTATION.md` should document every new topology request and response family at a practical SDK level rather than protobuf level.

## Testing Strategy

Add focused tests for:

- root exports for the new service clients and topology DTOs
- `CantonClient` exposing both new topology services
- service-client forwarding to the transport contract
- gRPC request mapping for shared `TopologyBaseQuery`
- gRPC response mapping for shared `TopologyBaseResult`
- gRPC request and response mapping for each covered unary RPC
- aggregation response mapping for `listPartiesAsync` and `listKeyOwnersAsync`
- lazy missing-`participantAdminEndpoint` failure behavior
- JSON `NotSupportedError` behavior
- service registry wiring for the new participant-admin topology services

Regression goals:

- existing ledger, ledger-admin, and participant-admin surfaces stay unchanged
- no generated topology protobuf types leak into the public API
- request timeout and disposal behavior continue to work through the shared abstractions

## Non-Goals

- no topology write service in this change
- no topology aggregation beyond `ListParties` and `ListKeyOwners`
- no server-streaming snapshot or genesis export support in this change
- no JSON topology admin implementation
- no decoded topology transaction parser for `ListAll` or `ListAllV2` bytes in this change
