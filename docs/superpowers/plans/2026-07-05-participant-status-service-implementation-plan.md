# Participant Status Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public admin-surface `participantStatusService` with `getParticipantStatusAsync(...)`, backed by gRPC `ParticipantStatusService`, SDK-owned status DTOs, lazy missing-admin-endpoint failure, and JSON `NotSupportedError` behavior.

**Architecture:** Add a reusable admin-status DTO core for the shared Canton admin health payloads, then layer a participant-specific status service and mapper on top. Thread the new service through `CantonClient`, `ITransport`, the service registry, and the gRPC admin transport wiring, while keeping JSON present-but-unsupported and preserving the split `adminEndpoint` behavior introduced earlier.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated Canton admin participant/health clients, existing SDK service/transport layers

---

## File Structure

### Shared admin-status DTOs and root exports

- Create: `src/core/types/admin-component-health-kind.ts`
- Create: `src/core/types/admin-not-initialized-external-input-kind.ts`
- Create: `src/core/types/admin-component-status.ts`
- Create: `src/core/types/admin-topology-queue-status.ts`
- Create: `src/core/types/admin-node-status.ts`
- Create: `src/core/types/admin-not-initialized-status.ts`
- Create: `src/core/types/connected-synchronizer-health.ts`
- Create: `src/core/types/connected-synchronizer-status.ts`
- Create: `src/core/types/participant-node-status.ts`
- Create: `src/core/types/requests/get-participant-status-request.ts`
- Create: `src/core/types/responses/get-participant-status-response.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

### Public service surface and service registry

- Create: `src/services/participant-status/participant-status-service-client.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Create: `tests/unit/services/participant-status-service-client.test.ts`

### gRPC mapping and admin transport wiring

- Create: `src/transports/grpc/mappers/admin-status-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-status-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Create: `tests/unit/grpc/grpc-participant-status-service.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`

### JSON behavior, docs, and end-to-end verification

- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Add Shared Admin Status DTOs And Participant Status DTOs

**Files:**
- Create: `src/core/types/admin-component-health-kind.ts`
- Create: `src/core/types/admin-not-initialized-external-input-kind.ts`
- Create: `src/core/types/admin-component-status.ts`
- Create: `src/core/types/admin-topology-queue-status.ts`
- Create: `src/core/types/admin-node-status.ts`
- Create: `src/core/types/admin-not-initialized-status.ts`
- Create: `src/core/types/connected-synchronizer-health.ts`
- Create: `src/core/types/connected-synchronizer-status.ts`
- Create: `src/core/types/participant-node-status.ts`
- Create: `src/core/types/requests/get-participant-status-request.ts`
- Create: `src/core/types/responses/get-participant-status-response.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing DTO/export tests**

Extend the root package-shape test with assertions like:

```ts
const request = new GetParticipantStatusRequest();
const response = new GetParticipantStatusResponse({
    status: new ParticipantNodeStatus({
        active: true,
        connectedSynchronizers: [],
        supportedProtocolVersions: [30],
    }),
});

expect(request).toBeInstanceOf(GetParticipantStatusRequest);
expect(response.status?.active).toBe(true);
expect(AdminNodeStatus).toBeTypeOf("function");
expect(ConnectedSynchronizerHealth.healthy).toBe("healthy");
```

Also verify the shared admin-status core types are root-exported:

- `AdminNodeStatus`
- `AdminNotInitializedStatus`
- `AdminComponentStatus`
- `AdminTopologyQueueStatus`
- `AdminComponentHealthKind`
- `AdminNotInitializedExternalInputKind`

- [ ] **Step 2: Run the focused DTO/export test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- missing participant status DTO exports
- missing shared admin-status DTO exports

- [ ] **Step 3: Add the SDK-owned DTOs and exports**

Implement:

- `GetParticipantStatusRequest` as an empty request class
- `GetParticipantStatusResponse` with nullable `status` and `notInitialized`
- `AdminNodeStatus` from the generated admin health `Status` fields:
  - `uid`
  - `uptime?`
  - `ports`
  - `active`
  - `topologyQueues?`
  - `components`
  - `version`
- `AdminNotInitializedStatus` from:
  - `active`
  - `waitingForExternalInput`
  - `version`
- `AdminComponentStatus` and supporting enums/models for the shared component payload
- participant-specific models:
  - `ParticipantNodeStatus`
  - `ConnectedSynchronizerStatus`
  - `ConnectedSynchronizerHealth`

Keep all public types SDK-owned and C#-style.

- [ ] **Step 4: Run the focused DTO/export test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/admin-component-health-kind.ts src/core/types/admin-not-initialized-external-input-kind.ts src/core/types/admin-component-status.ts src/core/types/admin-topology-queue-status.ts src/core/types/admin-node-status.ts src/core/types/admin-not-initialized-status.ts src/core/types/connected-synchronizer-health.ts src/core/types/connected-synchronizer-status.ts src/core/types/participant-node-status.ts src/core/types/requests/get-participant-status-request.ts src/core/types/responses/get-participant-status-response.ts src/index.ts tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add participant admin status sdk types"
```

## Task 2: Add The Public Service And Bind It To The Admin Surface

**Files:**
- Create: `src/services/participant-status/participant-status-service-client.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Create: `tests/unit/services/participant-status-service-client.test.ts`

- [ ] **Step 1: Write the failing service-surface and forwarding tests**

Add assertions that:

```ts
expect(client.participantStatusService).toBeDefined();
```

Add a focused service-client forwarding test:

```ts
await client.getParticipantStatusAsync(request, options);

expect(transport.getParticipantStatusAsync).toHaveBeenCalledWith(
    request,
    options,
);
```

Extend the service-registry endpoint test to verify:

- `participantStatusService` uses the admin transport
- calls fail lazily with `EndpointNotConfiguredError` when `adminEndpoint` is absent

- [ ] **Step 2: Run the focused service tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/services/participant-status-service-client.test.ts
```

Expected:

- `FAIL`
- missing `participantStatusService`
- missing transport method
- missing lazy missing-admin-endpoint behavior for the new service

- [ ] **Step 3: Add the public service and transport contract**

Implement:

- `ParticipantStatusServiceClient`
- `participantStatusService` on `CantonClient`
- `participantStatusService` in the service registry
- `ITransport.getParticipantStatusAsync(request, options?)`
- admin missing-endpoint placeholder support for `participantStatusService`

Bind it only to the admin surface.

- [ ] **Step 4: Run the focused service tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/services/participant-status-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/services/participant-status/participant-status-service-client.ts src/client/canton-client.ts src/client/service-registry.ts src/core/transports/transport.interface.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/services/participant-status-service-client.test.ts
git commit -m "feat: add participant status service surface"
```

## Task 3: Implement gRPC Mapping And JSON Unsupported Behavior

**Files:**
- Create: `src/transports/grpc/mappers/admin-status-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-status-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Create: `tests/unit/grpc/grpc-participant-status-service.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`

- [ ] **Step 1: Write the failing gRPC mapper and JSON unsupported tests**

Add a focused gRPC test for two response shapes:

1. regular participant status:

```ts
expect(result.status?.active).toBe(true);
expect(result.status?.connectedSynchronizers[0].health).toBe(
    ConnectedSynchronizerHealth.healthy,
);
```

2. not initialized:

```ts
expect(result.notInitialized?.version).toBe("3.4.0");
expect(result.status).toBeUndefined();
```

Also extend the JSON contract test to assert:

```ts
await expect(
    participantStatusService.getParticipantStatusAsync(
        new GetParticipantStatusRequest(),
    ),
).rejects.toThrow(NotSupportedError);
```

- [ ] **Step 2: Run the focused transport tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-participant-status-service.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `FAIL`
- no participant status gRPC operation yet
- no mapper yet
- JSON does not implement the new explicit unsupported method yet

- [ ] **Step 3: Implement gRPC operations and mappers**

Add the generated client dependency from:

- `src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/participant_status_service.client.ts`

Implement:

- `GrpcOperations.getParticipantStatusAsync(...)`
- `GrpcTransport.getParticipantStatusAsync(...)`
- admin health core mapper in `admin-status-mapper.ts`
- participant-specific mapper in `participant-status-mapper.ts`

Mapping rules:

- protobuf `kind.status` -> `GetParticipantStatusResponse.status`
- protobuf `kind.notInitialized` -> `GetParticipantStatusResponse.notInitialized`
- connected synchronizer enum values -> SDK `ConnectedSynchronizerHealth`
- shared admin health structures -> shared SDK admin-status core

Implement `JsonTransport.getParticipantStatusAsync(...)` as `NotSupportedError`.

- [ ] **Step 4: Run the focused transport tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-participant-status-service.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/mappers/admin-status-mapper.ts src/transports/grpc/mappers/participant-status-mapper.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts src/transports/grpc/grpc-ledger-client.ts src/transports/json/json-transport.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-participant-status-service.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
git commit -m "feat: implement participant status transport support"
```

## Task 4: Document The New Admin Status Service And Re-Verify The SDK

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Update the public docs**

Update `README.md` to:

- list `participantStatusService` under the admin endpoint surface
- note that it is gRPC-only today

Update `DOCUMENTATION.md` to:

- add `participantStatusService` to the exposed properties section
- document `getParticipantStatusAsync(request)`
- document the new DTOs:
  - `GetParticipantStatusRequest`
  - `GetParticipantStatusResponse`
  - `AdminNodeStatus`
  - `AdminNotInitializedStatus`
  - `ParticipantNodeStatus`
- add the new service to the transport support matrix with endpoint surface `Admin`

- [ ] **Step 2: Run the full verification commands**

Run:

```bash
rtk npm test
rtk npm run build
rtk npm run lint
```

Expected:

- all tests `PASS`
- TypeScript build exits `0`
- lint exits `0`

- [ ] **Step 3: Commit**

```bash
git add README.md DOCUMENTATION.md
git commit -m "docs: add participant status service"
```

- [ ] **Step 4: Finish the branch work**

After the final commit, verify the working tree is clean:

```bash
rtk git status --short
```

Expected:

- no unexpected tracked changes remain
