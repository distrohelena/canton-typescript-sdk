# Topology Read Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public participant-admin topology read/query services to the SDK, backed by gRPC `TopologyManagerReadService` and `TopologyAggregationService`, using SDK-owned DTOs, lazy missing-endpoint behavior, and explicit JSON rejection.

**Architecture:** Introduce a dedicated SDK topology model family under `src/core/types/topology`, then layer request/response DTOs, service clients, and transport methods on top of it. Keep service method names literal to Canton gRPC, resolve DTO name collisions with service-prefixed request/response types where needed, and thread the new surface through `CantonClient`, the service registry, gRPC mappers, and transport wiring without exposing generated protobuf types.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated Canton topology admin clients, existing SDK service/transport layers

---

## File Structure

### Shared topology model core and root exports

- Create: `src/core/types/topology/topology-store-id.ts`
- Create: `src/core/types/topology/topology-base-query.ts`
- Create: `src/core/types/topology/topology-base-result.ts`
- Create: `src/core/types/topology/topology-mapping-result.ts`
- Create: `src/core/types/topology/participant-permission.ts`
- Create: `src/core/types/topology/topology-mapping-code.ts`
- Create: `src/core/types/topology/namespace-delegation.ts`
- Create: `src/core/types/topology/decentralized-namespace-definition.ts`
- Create: `src/core/types/topology/owner-to-key-mapping.ts`
- Create: `src/core/types/topology/party-to-key-mapping.ts`
- Create: `src/core/types/topology/synchronizer-trust-certificate.ts`
- Create: `src/core/types/topology/participant-synchronizer-permission.ts`
- Create: `src/core/types/topology/party-hosting-limits.ts`
- Create: `src/core/types/topology/vetted-package.ts`
- Create: `src/core/types/topology/vetted-packages.ts`
- Create: `src/core/types/topology/party-to-participant.ts`
- Create: `src/core/types/topology/dynamic-synchronizer-parameters.ts`
- Create: `src/core/types/topology/dynamic-sequencing-parameters.ts`
- Create: `src/core/types/topology/mediator-synchronizer-state.ts`
- Create: `src/core/types/topology/sequencer-synchronizer-state.ts`
- Create: `src/core/types/topology/lsu-announcement.ts`
- Create: `src/core/types/topology/lsu-sequencer-connection-successor.ts`
- Create: `src/core/types/topology/topology-transactions.ts`
- Create: `src/core/types/topology/topology-party-result.ts`
- Create: `src/core/types/topology/topology-key-owner-result.ts`
- Modify: `src/core/types/vetted-package.ts`
- Modify: `src/core/types/vetted-packages.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/core/topology-dto.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

### Topology manager read request and response DTOs

- Create: `src/core/types/requests/list-namespace-delegation-request.ts`
- Create: `src/core/types/responses/list-namespace-delegation-response.ts`
- Create: `src/core/types/requests/list-decentralized-namespace-definition-request.ts`
- Create: `src/core/types/responses/list-decentralized-namespace-definition-response.ts`
- Create: `src/core/types/requests/list-owner-to-key-mapping-request.ts`
- Create: `src/core/types/responses/list-owner-to-key-mapping-response.ts`
- Create: `src/core/types/requests/list-party-to-key-mapping-request.ts`
- Create: `src/core/types/responses/list-party-to-key-mapping-response.ts`
- Create: `src/core/types/requests/list-synchronizer-trust-certificate-request.ts`
- Create: `src/core/types/responses/list-synchronizer-trust-certificate-response.ts`
- Create: `src/core/types/requests/list-participant-synchronizer-permission-request.ts`
- Create: `src/core/types/responses/list-participant-synchronizer-permission-response.ts`
- Create: `src/core/types/requests/list-party-hosting-limits-request.ts`
- Create: `src/core/types/responses/list-party-hosting-limits-response.ts`
- Create: `src/core/types/requests/topology-list-vetted-packages-request.ts`
- Create: `src/core/types/responses/topology-list-vetted-packages-response.ts`
- Create: `src/core/types/requests/list-party-to-participant-request.ts`
- Create: `src/core/types/responses/list-party-to-participant-response.ts`
- Create: `src/core/types/requests/list-synchronizer-parameters-state-request.ts`
- Create: `src/core/types/responses/list-synchronizer-parameters-state-response.ts`
- Create: `src/core/types/requests/list-sequencing-parameters-state-request.ts`
- Create: `src/core/types/responses/list-sequencing-parameters-state-response.ts`
- Create: `src/core/types/requests/list-mediator-synchronizer-state-request.ts`
- Create: `src/core/types/responses/list-mediator-synchronizer-state-response.ts`
- Create: `src/core/types/requests/list-sequencer-synchronizer-state-request.ts`
- Create: `src/core/types/responses/list-sequencer-synchronizer-state-response.ts`
- Create: `src/core/types/requests/list-lsu-announcement-request.ts`
- Create: `src/core/types/responses/list-lsu-announcement-response.ts`
- Create: `src/core/types/requests/list-lsu-sequencer-connection-successor-request.ts`
- Create: `src/core/types/responses/list-lsu-sequencer-connection-successor-response.ts`
- Create: `src/core/types/requests/list-available-stores-request.ts`
- Create: `src/core/types/responses/list-available-stores-response.ts`
- Create: `src/core/types/requests/list-all-request.ts`
- Create: `src/core/types/responses/list-all-response.ts`
- Create: `src/core/types/requests/list-all-v2-request.ts`
- Create: `src/core/types/responses/list-all-v2-response.ts`

### Topology aggregation request and response DTOs

- Create: `src/core/types/requests/topology-list-parties-request.ts`
- Create: `src/core/types/responses/topology-list-parties-response.ts`
- Create: `src/core/types/requests/list-key-owners-request.ts`
- Create: `src/core/types/responses/list-key-owners-response.ts`

### Public services, transport contract, and client wiring

- Create: `src/services/topology-manager-read/topology-manager-read-service-client.ts`
- Create: `src/services/topology-aggregation/topology-aggregation-service-client.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Create: `tests/unit/services/topology-manager-read-service-client.test.ts`
- Create: `tests/unit/services/topology-aggregation-service-client.test.ts`

### gRPC mappers and transport wiring

- Create: `src/transports/grpc/mappers/topology-common-mapper.ts`
- Create: `src/transports/grpc/mappers/topology-manager-read-mapper.ts`
- Create: `src/transports/grpc/mappers/topology-aggregation-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Create: `tests/unit/grpc/grpc-topology-manager-read-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-topology-aggregation-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-topology-services.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`

### JSON unsupported behavior, docs, and verification

- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Add Shared Topology Core DTOs And Root Exports

**Files:**
- Create: `src/core/types/topology/topology-store-id.ts`
- Create: `src/core/types/topology/topology-base-query.ts`
- Create: `src/core/types/topology/topology-base-result.ts`
- Create: `src/core/types/topology/topology-mapping-result.ts`
- Create: `src/core/types/topology/participant-permission.ts`
- Create: `src/core/types/topology/topology-mapping-code.ts`
- Create: `src/core/types/topology/namespace-delegation.ts`
- Create: `src/core/types/topology/decentralized-namespace-definition.ts`
- Create: `src/core/types/topology/owner-to-key-mapping.ts`
- Create: `src/core/types/topology/party-to-key-mapping.ts`
- Create: `src/core/types/topology/synchronizer-trust-certificate.ts`
- Create: `src/core/types/topology/participant-synchronizer-permission.ts`
- Create: `src/core/types/topology/party-hosting-limits.ts`
- Create: `src/core/types/topology/vetted-package.ts`
- Create: `src/core/types/topology/vetted-packages.ts`
- Create: `src/core/types/topology/party-to-participant.ts`
- Create: `src/core/types/topology/dynamic-synchronizer-parameters.ts`
- Create: `src/core/types/topology/dynamic-sequencing-parameters.ts`
- Create: `src/core/types/topology/mediator-synchronizer-state.ts`
- Create: `src/core/types/topology/sequencer-synchronizer-state.ts`
- Create: `src/core/types/topology/lsu-announcement.ts`
- Create: `src/core/types/topology/lsu-sequencer-connection-successor.ts`
- Create: `src/core/types/topology/topology-transactions.ts`
- Create: `src/core/types/topology/topology-party-result.ts`
- Create: `src/core/types/topology/topology-key-owner-result.ts`
- Modify: `src/core/types/vetted-package.ts`
- Modify: `src/core/types/vetted-packages.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/core/topology-dto.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing topology DTO and export tests**

Create `tests/unit/core/topology-dto.test.ts` with assertions like:

```ts
const query = new TopologyBaseQuery({
    includeProposals: true,
    operation: TopologyMappingOperation.addReplace,
    headState: true,
});

const result = new TopologyMappingResult({
    item: new PartyToParticipant({
        party: "Alice",
        threshold: 1,
        participants: [],
    }),
});

expect(query.includeProposals).toBe(true);
expect(result.item.party).toBe("Alice");
expect(ParticipantPermission.submission).toBe("submission");
expect(TopologyMappingCode.partyToParticipant).toBe("partyToParticipant");
```

Extend `tests/unit/smoke/package-shape.test.ts` to verify root exports for:

- `TopologyBaseQuery`
- `TopologyBaseResult`
- `TopologyMappingResult`
- `TopologyStoreId`
- `TopologyMappingOperation`
- `TopologyMappingCode`
- `ParticipantPermission`
- `PartyToParticipant`
- `TopologyTransactions`

- [ ] **Step 2: Run the focused topology DTO tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/core/topology-dto.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- missing topology DTO files
- missing root exports

- [ ] **Step 3: Add the shared topology model family**

Implement the SDK-owned topology core and payload models:

- shared query core:
  - `TopologyStoreId`
  - `TopologyBaseQuery`
  - `TopologyBaseResult`
  - `TopologyMappingResult`
- enums:
  - `TopologyMappingOperation`
  - `TopologyMappingCode`
  - `ParticipantPermission`
- mapping payloads:
  - `NamespaceDelegation`
  - `DecentralizedNamespaceDefinition`
  - `OwnerToKeyMapping`
  - `PartyToKeyMapping`
  - `SynchronizerTrustCertificate`
  - `ParticipantSynchronizerPermission`
  - `PartyHostingLimits`
  - `PartyToParticipant`
  - `MediatorSynchronizerState`
  - `SequencerSynchronizerState`
  - `LsuAnnouncement`
  - `LsuSequencerConnectionSuccessor`
- aggregated payloads:
  - `TopologyPartyResult`
  - `TopologyKeyOwnerResult`
- raw transaction payloads:
  - `TopologyTransactions`

Also convert `src/core/types/vetted-package.ts` and `src/core/types/vetted-packages.ts` into thin compatibility re-exports of the new topology-backed models so existing package-read code can migrate without a second rename wave.

- [ ] **Step 4: Run the focused topology DTO tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/core/topology-dto.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/topology src/core/types/vetted-package.ts src/core/types/vetted-packages.ts src/index.ts tests/unit/core/topology-dto.test.ts tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add topology sdk core types"
```

## Task 2: Add Topology Manager Read Request And Response DTOs

**Files:**
- Create: `src/core/types/requests/list-namespace-delegation-request.ts`
- Create: `src/core/types/responses/list-namespace-delegation-response.ts`
- Create: `src/core/types/requests/list-decentralized-namespace-definition-request.ts`
- Create: `src/core/types/responses/list-decentralized-namespace-definition-response.ts`
- Create: `src/core/types/requests/list-owner-to-key-mapping-request.ts`
- Create: `src/core/types/responses/list-owner-to-key-mapping-response.ts`
- Create: `src/core/types/requests/list-party-to-key-mapping-request.ts`
- Create: `src/core/types/responses/list-party-to-key-mapping-response.ts`
- Create: `src/core/types/requests/list-synchronizer-trust-certificate-request.ts`
- Create: `src/core/types/responses/list-synchronizer-trust-certificate-response.ts`
- Create: `src/core/types/requests/list-participant-synchronizer-permission-request.ts`
- Create: `src/core/types/responses/list-participant-synchronizer-permission-response.ts`
- Create: `src/core/types/requests/list-party-hosting-limits-request.ts`
- Create: `src/core/types/responses/list-party-hosting-limits-response.ts`
- Create: `src/core/types/requests/topology-list-vetted-packages-request.ts`
- Create: `src/core/types/responses/topology-list-vetted-packages-response.ts`
- Create: `src/core/types/requests/list-party-to-participant-request.ts`
- Create: `src/core/types/responses/list-party-to-participant-response.ts`
- Create: `src/core/types/requests/list-synchronizer-parameters-state-request.ts`
- Create: `src/core/types/responses/list-synchronizer-parameters-state-response.ts`
- Create: `src/core/types/requests/list-sequencing-parameters-state-request.ts`
- Create: `src/core/types/responses/list-sequencing-parameters-state-response.ts`
- Create: `src/core/types/requests/list-mediator-synchronizer-state-request.ts`
- Create: `src/core/types/responses/list-mediator-synchronizer-state-response.ts`
- Create: `src/core/types/requests/list-sequencer-synchronizer-state-request.ts`
- Create: `src/core/types/responses/list-sequencer-synchronizer-state-response.ts`
- Create: `src/core/types/requests/list-lsu-announcement-request.ts`
- Create: `src/core/types/responses/list-lsu-announcement-response.ts`
- Create: `src/core/types/requests/list-lsu-sequencer-connection-successor-request.ts`
- Create: `src/core/types/responses/list-lsu-sequencer-connection-successor-response.ts`
- Create: `src/core/types/requests/list-available-stores-request.ts`
- Create: `src/core/types/responses/list-available-stores-response.ts`
- Create: `src/core/types/requests/list-all-request.ts`
- Create: `src/core/types/responses/list-all-response.ts`
- Create: `src/core/types/requests/list-all-v2-request.ts`
- Create: `src/core/types/responses/list-all-v2-response.ts`
- Modify: `tests/unit/core/topology-dto.test.ts`

- [ ] **Step 1: Write the failing manager-read DTO tests**

Extend `tests/unit/core/topology-dto.test.ts` with coverage like:

```ts
const request = new ListPartyToParticipantRequest({
    baseQuery: new TopologyBaseQuery({
        includeProposals: false,
        operation: TopologyMappingOperation.addReplace,
        headState: true,
    }),
    filterParty: "Alice",
});

const response = new ListPartyToParticipantResponse({
    results: [],
});

const rawResponse = new ListAllV2Response({
    result: new TopologyTransactions({
        items: [],
    }),
});

expect(request.filterParty).toBe("Alice");
expect(response.results).toEqual([]);
expect(rawResponse.result?.items).toEqual([]);
```

Include a collision-case assertion for:

- `TopologyListVettedPackagesRequest`
- `TopologyListVettedPackagesResponse`

- [ ] **Step 2: Run the focused manager-read DTO test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/core/topology-dto.test.ts
```

Expected:

- `FAIL`
- missing request and response DTOs for manager-read methods

- [ ] **Step 3: Add the manager-read request and response classes**

Implement SDK-owned request and response DTOs for all unary `TopologyManagerReadService` methods.

Rules:

- mapping read requests compose `baseQuery?: TopologyBaseQuery` plus method-specific filters
- mapping read responses expose `results: readonly TopologyMappingResult<TItem>[]`
- `ListAvailableStoresResponse` exposes `storeIds: readonly TopologyStoreId[]`
- `ListAllResponse` and `ListAllV2Response` expose `result?: TopologyTransactions`
- keep `ListAllRequest` and `ListAllResponse` marked deprecated in comments
- use the collision-safe names:
  - `TopologyListVettedPackagesRequest`
  - `TopologyListVettedPackagesResponse`

- [ ] **Step 4: Run the focused manager-read DTO test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/core/topology-dto.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests src/core/types/responses tests/unit/core/topology-dto.test.ts
git commit -m "feat: add topology manager read dto surface"
```

## Task 3: Add Topology Aggregation DTOs And Public Service Surface

**Files:**
- Create: `src/core/types/requests/topology-list-parties-request.ts`
- Create: `src/core/types/responses/topology-list-parties-response.ts`
- Create: `src/core/types/requests/list-key-owners-request.ts`
- Create: `src/core/types/responses/list-key-owners-response.ts`
- Create: `src/services/topology-manager-read/topology-manager-read-service-client.ts`
- Create: `src/services/topology-aggregation/topology-aggregation-service-client.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Create: `tests/unit/services/topology-manager-read-service-client.test.ts`
- Create: `tests/unit/services/topology-aggregation-service-client.test.ts`

- [ ] **Step 1: Write the failing public-surface and forwarding tests**

Add service construction assertions:

```ts
expect(client.topologyManagerReadService).toBeDefined();
expect(client.topologyAggregationService).toBeDefined();
```

Create forwarding tests like:

```ts
await service.listPartyToParticipantAsync(request, options);

expect(transport.listPartyToParticipantAsync).toHaveBeenCalledWith(
    request,
    options,
);
```

Extend `tests/unit/client/service-registry-endpoints.test.ts` to verify:

- topology services use the participant-admin transport
- topology methods fail lazily with `EndpointNotConfiguredError` when `participantAdminEndpoint` is missing

Also add DTO tests for the collision-safe aggregation names:

- `TopologyListPartiesRequest`
- `TopologyListPartiesResponse`

- [ ] **Step 2: Run the focused topology surface tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/services/topology-manager-read-service-client.test.ts tests/unit/services/topology-aggregation-service-client.test.ts
```

Expected:

- `FAIL`
- missing topology services on `CantonClient`
- missing transport methods
- missing participant-admin endpoint routing for the new services

- [ ] **Step 3: Add topology aggregation DTOs, services, and transport contract methods**

Implement:

- `TopologyListPartiesRequest`
- `TopologyListPartiesResponse`
- `ListKeyOwnersRequest`
- `ListKeyOwnersResponse`
- `TopologyManagerReadServiceClient`
- `TopologyAggregationServiceClient`
- new `ITransport` methods for every topology unary read/query method
- `CantonClient` and service registry wiring for both topology services
- participant-admin lazy placeholder methods for every topology operation

Keep method comments concise and explicit about gRPC support and JSON rejection.

- [ ] **Step 4: Run the focused topology surface tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/services/topology-manager-read-service-client.test.ts tests/unit/services/topology-aggregation-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/transports/transport.interface.ts src/core/types/requests/topology-list-parties-request.ts src/core/types/responses/topology-list-parties-response.ts src/core/types/requests/list-key-owners-request.ts src/core/types/responses/list-key-owners-response.ts src/services/topology-manager-read/topology-manager-read-service-client.ts src/services/topology-aggregation/topology-aggregation-service-client.ts src/client/canton-client.ts src/client/service-registry.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/services/topology-manager-read-service-client.test.ts tests/unit/services/topology-aggregation-service-client.test.ts
git commit -m "feat: add topology read service surface"
```

## Task 4: Implement gRPC Topology Mapping And Transport Operations

**Files:**
- Create: `src/transports/grpc/mappers/topology-common-mapper.ts`
- Create: `src/transports/grpc/mappers/topology-manager-read-mapper.ts`
- Create: `src/transports/grpc/mappers/topology-aggregation-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Create: `tests/unit/grpc/grpc-topology-manager-read-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-topology-aggregation-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-topology-services.test.ts`

- [ ] **Step 1: Write the failing gRPC topology mapper and transport tests**

Create request and response mapper tests like:

```ts
const payload = mapGrpcListPartyToParticipantRequest(
    new ListPartyToParticipantRequest({
        baseQuery: new TopologyBaseQuery({
            includeProposals: false,
            operation: TopologyMappingOperation.addReplace,
            headState: true,
        }),
        filterParty: "Alice",
    }),
);

expect(payload.filterParty).toBe("Alice");
expect(payload.baseQuery?.headState).toBeDefined();
```

Add response mapping assertions for:

- `BaseQuery` and `BaseResult`
- `ListPartyToParticipant`
- `ListAvailableStores`
- `ListAllV2`
- `TopologyListParties`
- `ListKeyOwners`

Add transport tests asserting `GrpcTransport`:

- calls the generated topology operations
- maps returned protobuf payloads to SDK DTOs
- preserves shared `RequestOptions`

- [ ] **Step 2: Run the focused gRPC topology tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-topology-manager-read-mapper.test.ts tests/unit/grpc/grpc-topology-aggregation-mapper.test.ts tests/unit/grpc/grpc-topology-services.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
```

Expected:

- `FAIL`
- missing topology mapper functions
- missing topology operations on the gRPC transport wiring

- [ ] **Step 3: Add the topology gRPC mapper family and transport operations**

Implement:

- shared protobuf-to-SDK and SDK-to-protobuf helpers in `topology-common-mapper.ts`
- manager-read request and response mapping in `topology-manager-read-mapper.ts`
- aggregation request and response mapping in `topology-aggregation-mapper.ts`
- topology unary operation bindings in `grpc-channel-factory.ts`
- `GrpcTransport` methods for every covered topology unary method

Important rules:

- no generated protobuf classes leak past mapper boundaries
- reuse the shared request timeout/deadline path already present in `RequestOptions`
- keep `ListAllAsync` deprecated in public comments but fully wired
- map topology stores, time queries, enums, byte arrays, and nested collections losslessly

- [ ] **Step 4: Run the focused gRPC topology tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-topology-manager-read-mapper.test.ts tests/unit/grpc/grpc-topology-aggregation-mapper.test.ts tests/unit/grpc/grpc-topology-services.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/mappers/topology-common-mapper.ts src/transports/grpc/mappers/topology-manager-read-mapper.ts src/transports/grpc/mappers/topology-aggregation-mapper.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts tests/unit/grpc/grpc-topology-manager-read-mapper.test.ts tests/unit/grpc/grpc-topology-aggregation-mapper.test.ts tests/unit/grpc/grpc-topology-services.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
git commit -m "feat: add grpc topology read query support"
```

## Task 5: Add JSON Rejection Behavior, Docs, And Contract Coverage

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Write the failing JSON contract and docs-driven tests**

Extend the shared contracts to assert:

- gRPC operational contract can construct and call both topology services
- JSON operational contract rejects topology methods with `NotSupportedError`

Add a focused transport-surface assertion like:

```ts
await expect(
    transport.listPartyToParticipantAsync(
        new ListPartyToParticipantRequest(),
    ),
).rejects.toThrow(NotSupportedError);
```

- [ ] **Step 2: Run the focused JSON and contract tests to verify they fail**

Run:

```bash
rtk npm test -- tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `FAIL`
- missing topology methods in operational contracts
- JSON transport does not yet reject the new methods

- [ ] **Step 3: Add JSON rejection behavior and update public docs**

Implement:

- `JsonTransport` `NotSupportedError` methods for every topology unary call
- gRPC and JSON operational contract updates for the new surface
- documentation updates in:
  - `README.md`
  - `DOCUMENTATION.md`

Document:

- `topologyManagerReadService`
- `topologyAggregationService`
- participant-admin endpoint ownership
- gRPC support
- JSON rejection
- `listAllAsync` deprecation
- collision-safe DTO names where they differ from method names

- [ ] **Step 4: Run the focused JSON and contract tests to verify they pass**

Run:

```bash
rtk npm test -- tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-transport.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/unit/core/transport-surface.test.ts README.md DOCUMENTATION.md
git commit -m "feat: expose topology read query services"
```

## Task 6: Full Verification

**Files:**
- Modify: none

- [ ] **Step 1: Run the full unit and contract suite relevant to the SDK surface**

Run:

```bash
rtk npm test
```

Expected:

- `PASS`

- [ ] **Step 2: Run the build**

Run:

```bash
rtk npm run build
```

Expected:

- `PASS`

- [ ] **Step 3: Run lint**

Run:

```bash
rtk npm run lint
```

Expected:

- `PASS`

- [ ] **Step 4: Review git diff for public API consistency**

Run:

```bash
rtk git diff --stat HEAD~5..HEAD
rtk git diff -- src/index.ts src/client/canton-client.ts src/core/transports/transport.interface.ts DOCUMENTATION.md
```

Expected:

- topology surface appears under participant-admin services
- DTO collisions are resolved with explicit topology-prefixed request and response names
- no generated protobuf types are exported from the root package

- [ ] **Step 5: Final commit if verification required follow-up edits**

```bash
git add -A
git commit -m "chore: finish topology read query rollout"
```
