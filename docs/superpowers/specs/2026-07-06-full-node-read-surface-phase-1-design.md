# Full Node Read Surface Phase 1 Design

## Goal

Expand the public TypeScript SDK toward full node read coverage by exposing the stable, non-mutating RPCs that are straightforward to implement across the Ledger API, Ledger Admin API, and Canton Participant Admin API.

This phase should:

- keep the public SDK aligned with literal gRPC service boundaries
- expose SDK-owned request, response, and value DTOs only
- implement the covered reads on gRPC
- reject unsupported reads on JSON explicitly
- defer read RPCs that would require heavy custom semantic modeling

## Scope

Phase 1 covers stable, non-mutating RPCs that are easy to expose with SDK-owned DTOs that stay close to protobuf shape.

This includes:

- remaining unary read RPCs on already-exposed services
- new service clients for stable read-only service boundaries that are not yet public
- selected read operations that return raw bytes, repeated rows, generic maps, timestamps, offsets, and similar structural payloads

This phase does not cover:

- alpha or experimental service surfaces
- mutating RPCs
- topology export, snapshot, genesis, or similar model-heavy streaming reads
- read RPCs whose public DTOs would likely need a later breaking redesign
- transport-neutral abstractions for APIs that only exist on gRPC

## Decision Summary

- keep mirroring gRPC service boundaries literally
- use SDK-owned near-protobuf DTOs for phase-1 breadth
- support gRPC first
- reject unsupported methods on JSON with `NotSupportedError`
- preserve lazy missing-endpoint behavior by API surface
- treat unary reads as the default phase-1 target
- allow trivial streaming reads only if they map cleanly to an existing observer or simple DTO pattern

## Inclusion Rules

Include an RPC in phase 1 only when all of the following are true:

- the RPC is stable
- the RPC is non-mutating
- the request and response can be represented with SDK-owned structural DTOs
- the mapper is mostly structural rather than interpretive
- exposing the RPC now is unlikely to force a later public API cleanup

Examples that fit phase 1 well:

- `GetUser`
- `ListUsers`
- `ListUserRights`
- `GetContract`
- `GetEventsByContractId`
- `GetLedgerEnd`
- `GetLatestPrunedOffsets`
- `GetUpdateByOffset`
- `GetDar`
- `ListDars`
- `LookupOffsetByTime`
- `GetResourceLimits`

Defer an RPC to phase 2 when one or more of the following are true:

- it needs a large semantic value model to be useful
- it returns protocol-heavy payloads that should be normalized before public exposure
- it is primarily an export, snapshot, or genesis-oriented API
- it is streaming and needs a new observer or streaming abstraction
- the easy structural shape would create bad public API debt

## Public Service Boundary

The public SDK should keep a literal gRPC-shaped service map.

### Existing services to expand

- `partyManagementService`
- `userManagementService`
- `packageManagementService`
- `participantPackageService`
- `contractService`
- `eventQueryService`
- `stateService`
- `updateService`
- `commandCompletionService`

### New services to add

- `commandInspectionService`
- `identityProviderConfigService`
- `participantInspectionService`
- `participantPruningService`
- `participantRepairService`
- `participantPartyManagementService`
- `synchronizerConnectivityService`
- `resourceManagementService`
- `topologyInitializationService`

This avoids fake consolidations such as `adminReadService` or `nodeInspectionService` and preserves the user-visible shape you want for the SDK.

## Naming Rules

Service methods should stay literal to the RPC meaning while still feeling C#-style:

- `getXAsync`
- `listXAsync`
- `lookupXAsync`
- `countXAsync`
- `currentTimeAsync`

Examples:

- `partyManagementService.getParticipantIdAsync(...)`
- `userManagementService.getUserAsync(...)`
- `participantInspectionService.lookupOffsetByTimeAsync(...)`
- `participantInspectionService.countInFlightAsync(...)`
- `topologyInitializationService.currentTimeAsync(...)`

DTO names should usually mirror the RPC:

- `GetUserRequest`
- `GetUserResponse`
- `ListUsersRequest`
- `ListUsersResponse`

If a name collides with an existing public type, use a service-prefixed SDK type instead of leaking transport concerns into the public method name.

## Transport And Endpoint Behavior

### Transport behavior

- gRPC is the implementation target for all phase-1 APIs
- JSON only supports methods backed by a real JSON surface
- new phase-1 methods default to:
  - gRPC supported
  - JSON rejects with `NotSupportedError`

This keeps the public surface broad while staying honest about transport support.

### Endpoint behavior

Routing remains surface-based:

- Ledger API services use `ledgerEndpoint`
- Ledger Admin API services use `ledgerAdminEndpoint`
- Participant Admin API services use `participantAdminEndpoint`

Missing endpoint behavior remains lazy:

- client construction succeeds even when one or more endpoints are absent
- a service only fails when one of its methods is invoked
- the error should keep identifying the missing surface clearly

## DTO Strategy

Phase 1 uses SDK-owned DTOs that stay close to protobuf shape.

Rules:

- never expose generated protobuf classes
- use SDK request and response classes for every new public method
- keep structural fields such as `Uint8Array`, timestamps, offsets, repeated rows, maps, and enums where they are already meaningful
- avoid large semantic remodeling unless it materially improves the API

This is the intended fast path for broad stable read coverage.

## Phase 1 Inventory

### Ledger API

- `contractService.getContractAsync`
- `eventQueryService.getEventsByContractIdAsync`
- `stateService.getConnectedSynchronizersAsync`
- `stateService.getLedgerEndAsync`
- `stateService.getLatestPrunedOffsetsAsync`
- `updateService.getUpdateByOffsetAsync`
- `updateService.getUpdateByIdAsync`
- `updateService.getUpdateByHashAsync`
- `updateService.getUpdatesPageAsync`
- `commandCompletionService.getCompletionsAsync`

### Ledger Admin API

- `partyManagementService.getParticipantIdAsync`
- `partyManagementService.getPartiesAsync`
- `userManagementService.getUserAsync`
- `userManagementService.listUsersAsync`
- `userManagementService.listUserRightsAsync`
- `packageManagementService.listKnownPackagesAsync`
- `commandInspectionService.getCommandStatusAsync`
- `identityProviderConfigService.getIdentityProviderConfigAsync`
- `identityProviderConfigService.listIdentityProviderConfigsAsync`

### Participant Admin API

- `participantPackageService.getDarAsync`
- `participantPackageService.listDarsAsync`
- `participantPackageService.getDarContentsAsync`
- `participantInspectionService.lookupOffsetByTimeAsync`
- `participantInspectionService.lookupSentAcsCommitmentsAsync`
- `participantInspectionService.lookupReceivedAcsCommitmentsAsync`
- `participantInspectionService.getConfigForSlowCounterParticipantsAsync`
- `participantInspectionService.getIntervalsBehindForCounterParticipantsAsync`
- `participantInspectionService.countInFlightAsync`
- `participantPruningService.getSafePruningOffsetAsync`
- `participantPruningService.getScheduleAsync`
- `participantPruningService.getParticipantScheduleAsync`
- `participantPruningService.getNoWaitCommitmentsFromAsync`
- `participantRepairService.listPendingOperationsAsync`
- `participantPartyManagementService.getHighestOffsetByTimestampAsync`
- `synchronizerConnectivityService.listConnectedSynchronizersAsync`
- `synchronizerConnectivityService.listRegisteredSynchronizersAsync`
- `synchronizerConnectivityService.getSynchronizerIdAsync`
- `resourceManagementService.getResourceLimitsAsync`
- `topologyInitializationService.getIdAsync`
- `topologyInitializationService.currentTimeAsync`

## Implementation Architecture

Each added service or expanded service should follow the same structure already used in the SDK:

- add SDK-owned DTOs under `src/core/types/requests` and `src/core/types/responses`
- add or expand public service clients under `src/services/...`
- extend `src/core/transports/transport.interface.ts`
- add gRPC request and response mappers under `src/transports/grpc/mappers`
- extend `src/transports/grpc/grpc-channel-factory.ts`
- implement transport methods in `src/transports/grpc/grpc-transport.ts`
- add JSON rejections in `src/transports/json/json-transport.ts`
- register services and lazy endpoint behavior in `src/client/service-registry.ts`
- expose new services and DTOs from `src/index.ts` and `src/client/canton-client.ts`
- document every added function in `DOCUMENTATION.md`

## Rollout Order

### Batch 1: existing service expansion

Expand the public services that already exist:

- `partyManagementService`
- `userManagementService`
- `packageManagementService`
- `participantPackageService`
- `contractService`
- `eventQueryService`
- `stateService`
- `updateService`
- `commandCompletionService`

This is the lowest-risk way to increase visible coverage quickly.

### Batch 2: small new read services

Add the smallest new admin read services:

- `commandInspectionService`
- `identityProviderConfigService`
- `resourceManagementService`
- `topologyInitializationService`

These should be simple structurally and reinforce the repeated implementation pattern.

### Batch 3: broader participant-admin inspection services

Add the participant-admin read services with more payload variety:

- `participantInspectionService`
- `participantPruningService`
- `participantRepairService`
- `participantPartyManagementService`
- `synchronizerConnectivityService`

## Testing Strategy

For every new RPC or tight group of closely related RPCs:

- add focused DTO tests if the type family is non-trivial
- add gRPC mapper tests
- add gRPC transport tests
- add service client forwarding tests
- add JSON rejection tests when unsupported
- extend endpoint routing tests where a new service boundary is introduced
- update `DOCUMENTATION.md` support matrix

Every completed batch should pass:

- `npm run lint`
- `npm run test:unit`

## Documentation Strategy

`DOCUMENTATION.md` should:

- list all new public services on `CantonClient`
- document which endpoint surface owns each service
- document every new public function
- state whether each function is `grpc`-only or supported on both transports
- update the transport support matrix

## Out Of Scope

The following stay out of phase 1:

- alpha read surfaces such as `partyManagementAlphaService`
- mutating RPCs across all surfaces
- topology export, genesis, snapshot, and similar streaming reads
- read APIs that require large semantic modeling instead of structural DTO wrapping
- broad streaming abstraction work beyond what already exists cleanly in the SDK
