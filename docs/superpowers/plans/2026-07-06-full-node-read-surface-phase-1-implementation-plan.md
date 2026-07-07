# Full Node Read Surface Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the stable, non-mutating, easy-to-model node read RPCs across the Ledger API, Ledger Admin API, and Canton Participant Admin API through SDK-owned DTOs, literal public service boundaries, gRPC implementations, and explicit JSON rejection where no JSON surface exists.

**Architecture:** Expand existing public services first, then add small new read-only services, then add the broader participant-admin inspection services. Keep request and response types SDK-owned and near-protobuf, extend `ITransport` explicitly for every public read method, wire gRPC through generated clients and dedicated mapper files, and keep JSON behavior honest by rejecting unsupported methods at runtime.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated Canton clients, existing SDK service registry, existing gRPC and JSON transports, `@distrohelena/linter`

---

## File Structure

### Batch 1: Existing public service expansion

- Create: `src/core/types/requests/get-participant-id-request.ts`
- Create: `src/core/types/responses/get-participant-id-response.ts`
- Create: `src/core/types/requests/get-parties-request.ts`
- Create: `src/core/types/responses/get-parties-response.ts`
- Create: `src/core/types/requests/get-user-request.ts`
- Create: `src/core/types/responses/get-user-response.ts`
- Create: `src/core/types/requests/list-users-request.ts`
- Create: `src/core/types/responses/list-users-response.ts`
- Create: `src/core/types/requests/list-user-rights-request.ts`
- Create: `src/core/types/responses/list-user-rights-response.ts`
- Create: `src/core/types/requests/list-known-packages-request.ts`
- Create: `src/core/types/responses/list-known-packages-response.ts`
- Create: `src/core/types/requests/get-contract-request.ts`
- Create: `src/core/types/responses/get-contract-response.ts`
- Create: `src/core/types/requests/get-events-by-contract-id-request.ts`
- Create: `src/core/types/responses/get-events-by-contract-id-response.ts`
- Create: `src/core/types/requests/get-connected-synchronizers-request.ts`
- Create: `src/core/types/responses/get-connected-synchronizers-response.ts`
- Create: `src/core/types/requests/get-ledger-end-request.ts`
- Create: `src/core/types/responses/get-ledger-end-response.ts`
- Create: `src/core/types/requests/get-latest-pruned-offsets-request.ts`
- Create: `src/core/types/responses/get-latest-pruned-offsets-response.ts`
- Create: `src/core/types/requests/get-update-by-offset-request.ts`
- Create: `src/core/types/responses/get-update-by-offset-response.ts`
- Create: `src/core/types/requests/get-update-by-id-request.ts`
- Create: `src/core/types/responses/get-update-by-id-response.ts`
- Create: `src/core/types/requests/get-update-by-hash-request.ts`
- Create: `src/core/types/responses/get-update-by-hash-response.ts`
- Create: `src/core/types/requests/get-updates-page-request.ts`
- Create: `src/core/types/responses/get-updates-page-response.ts`
- Create: `src/core/types/requests/get-completions-request.ts`
- Create: `src/core/types/responses/get-completions-response.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/services/user-management/user-management-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: `src/services/contract/contract-service-client.ts`
- Modify: `src/services/event-query/event-query-service-client.ts`
- Modify: `src/services/state/state-service-client.ts`
- Modify: `src/services/update/update-service-client.ts`
- Modify: `src/services/command-completion/command-completion-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/mappers/parties-mapper.ts`
- Modify: `src/transports/grpc/mappers/users-mapper.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `src/transports/grpc/mappers/contracts-mapper.ts`
- Create: `src/transports/grpc/mappers/event-query-mapper.ts`
- Create: `src/transports/grpc/mappers/state-read-mapper.ts`
- Create: `src/transports/grpc/mappers/update-read-mapper.ts`
- Create: `src/transports/grpc/mappers/command-completion-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/services/package-management-service-client.test.ts`
- Create: `tests/unit/services/user-management-read-client.test.ts`
- Create: `tests/unit/services/contract-service-client.test.ts`
- Create: `tests/unit/services/event-query-service-client.test.ts`
- Modify: `tests/unit/services/package-service-client.test.ts`
- Modify: `tests/unit/services/state-service-client.test.ts`
- Modify: `tests/unit/services/update-service-client.test.ts`
- Create: `tests/unit/services/command-completion-service-client.test.ts`
- Create: `tests/unit/grpc/grpc-batch1-read-mappers.test.ts`
- Create: `tests/unit/grpc/grpc-batch1-read-services.test.ts`
- Create: `tests/unit/json/json-batch1-read-services.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

### Batch 2: Small new read-only services

- Create: `src/core/types/requests/get-command-status-request.ts`
- Create: `src/core/types/responses/get-command-status-response.ts`
- Create: `src/core/types/requests/get-identity-provider-config-request.ts`
- Create: `src/core/types/responses/get-identity-provider-config-response.ts`
- Create: `src/core/types/requests/list-identity-provider-configs-request.ts`
- Create: `src/core/types/responses/list-identity-provider-configs-response.ts`
- Create: `src/core/types/requests/get-resource-limits-request.ts`
- Create: `src/core/types/responses/get-resource-limits-response.ts`
- Create: `src/core/types/requests/get-topology-initialization-id-request.ts`
- Create: `src/core/types/responses/get-topology-initialization-id-response.ts`
- Create: `src/core/types/requests/get-topology-initialization-current-time-request.ts`
- Create: `src/core/types/responses/get-topology-initialization-current-time-response.ts`
- Create: `src/services/command-inspection/command-inspection-service-client.ts`
- Create: `src/services/identity-provider-config/identity-provider-config-service-client.ts`
- Create: `src/services/resource-management/resource-management-service-client.ts`
- Create: `src/services/topology-initialization/topology-initialization-service-client.ts`
- Create: `src/transports/grpc/mappers/command-inspection-mapper.ts`
- Create: `src/transports/grpc/mappers/identity-provider-config-mapper.ts`
- Create: `src/transports/grpc/mappers/resource-management-mapper.ts`
- Create: `src/transports/grpc/mappers/topology-initialization-mapper.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Modify: `DOCUMENTATION.md`
- Create: `tests/unit/services/command-inspection-service-client.test.ts`
- Create: `tests/unit/services/identity-provider-config-service-client.test.ts`
- Create: `tests/unit/services/resource-management-service-client.test.ts`
- Create: `tests/unit/services/topology-initialization-service-client.test.ts`
- Create: `tests/unit/grpc/grpc-batch2-read-mappers.test.ts`
- Create: `tests/unit/grpc/grpc-batch2-read-services.test.ts`
- Create: `tests/unit/json/json-batch2-read-services.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

### Batch 3: Participant-admin inspection and read services

- Create: `src/core/types/requests/get-dar-request.ts`
- Create: `src/core/types/responses/get-dar-response.ts`
- Create: `src/core/types/requests/list-dars-request.ts`
- Create: `src/core/types/responses/list-dars-response.ts`
- Create: `src/core/types/requests/get-dar-contents-request.ts`
- Create: `src/core/types/responses/get-dar-contents-response.ts`
- Create: `src/core/types/requests/lookup-offset-by-time-request.ts`
- Create: `src/core/types/responses/lookup-offset-by-time-response.ts`
- Create: `src/core/types/requests/lookup-sent-acs-commitments-request.ts`
- Create: `src/core/types/responses/lookup-sent-acs-commitments-response.ts`
- Create: `src/core/types/requests/lookup-received-acs-commitments-request.ts`
- Create: `src/core/types/responses/lookup-received-acs-commitments-response.ts`
- Create: `src/core/types/requests/get-config-for-slow-counter-participants-request.ts`
- Create: `src/core/types/responses/get-config-for-slow-counter-participants-response.ts`
- Create: `src/core/types/requests/get-intervals-behind-for-counter-participants-request.ts`
- Create: `src/core/types/responses/get-intervals-behind-for-counter-participants-response.ts`
- Create: `src/core/types/requests/count-in-flight-request.ts`
- Create: `src/core/types/responses/count-in-flight-response.ts`
- Create: `src/core/types/requests/get-safe-pruning-offset-request.ts`
- Create: `src/core/types/responses/get-safe-pruning-offset-response.ts`
- Create: `src/core/types/requests/get-pruning-schedule-request.ts`
- Create: `src/core/types/responses/get-pruning-schedule-response.ts`
- Create: `src/core/types/requests/get-participant-pruning-schedule-request.ts`
- Create: `src/core/types/responses/get-participant-pruning-schedule-response.ts`
- Create: `src/core/types/requests/get-no-wait-commitments-from-request.ts`
- Create: `src/core/types/responses/get-no-wait-commitments-from-response.ts`
- Create: `src/core/types/requests/list-pending-operations-request.ts`
- Create: `src/core/types/responses/list-pending-operations-response.ts`
- Create: `src/core/types/requests/get-highest-offset-by-timestamp-request.ts`
- Create: `src/core/types/responses/get-highest-offset-by-timestamp-response.ts`
- Create: `src/core/types/requests/list-connected-synchronizers-request.ts`
- Create: `src/core/types/responses/list-connected-synchronizers-response.ts`
- Create: `src/core/types/requests/list-registered-synchronizers-request.ts`
- Create: `src/core/types/responses/list-registered-synchronizers-response.ts`
- Create: `src/core/types/requests/get-synchronizer-id-request.ts`
- Create: `src/core/types/responses/get-synchronizer-id-response.ts`
- Modify: `src/services/participant-package/participant-package-service-client.ts`
- Create: `src/services/participant-inspection/participant-inspection-service-client.ts`
- Create: `src/services/participant-pruning/participant-pruning-service-client.ts`
- Create: `src/services/participant-repair/participant-repair-service-client.ts`
- Create: `src/services/participant-party-management/participant-party-management-service-client.ts`
- Create: `src/services/synchronizer-connectivity/synchronizer-connectivity-service-client.ts`
- Create: `src/transports/grpc/mappers/participant-inspection-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-pruning-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-repair-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-party-management-mapper.ts`
- Create: `src/transports/grpc/mappers/synchronizer-connectivity-mapper.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `tests/unit/services/participant-package-service-client.test.ts`
- Create: `tests/unit/services/participant-inspection-service-client.test.ts`
- Create: `tests/unit/services/participant-pruning-service-client.test.ts`
- Create: `tests/unit/services/participant-repair-service-client.test.ts`
- Create: `tests/unit/services/participant-party-management-service-client.test.ts`
- Create: `tests/unit/services/synchronizer-connectivity-service-client.test.ts`
- Create: `tests/unit/grpc/grpc-batch3-read-mappers.test.ts`
- Create: `tests/unit/grpc/grpc-batch3-read-services.test.ts`
- Create: `tests/unit/json/json-batch3-read-services.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

## Task 1: Expand Existing Public Services With New Read DTOs And Methods

**Files:**
- Create: `src/core/types/requests/get-participant-id-request.ts`
- Create: `src/core/types/responses/get-participant-id-response.ts`
- Create: `src/core/types/requests/get-parties-request.ts`
- Create: `src/core/types/responses/get-parties-response.ts`
- Create: `src/core/types/requests/get-user-request.ts`
- Create: `src/core/types/responses/get-user-response.ts`
- Create: `src/core/types/requests/list-users-request.ts`
- Create: `src/core/types/responses/list-users-response.ts`
- Create: `src/core/types/requests/list-user-rights-request.ts`
- Create: `src/core/types/responses/list-user-rights-response.ts`
- Create: `src/core/types/requests/list-known-packages-request.ts`
- Create: `src/core/types/responses/list-known-packages-response.ts`
- Create: `src/core/types/requests/get-contract-request.ts`
- Create: `src/core/types/responses/get-contract-response.ts`
- Create: `src/core/types/requests/get-events-by-contract-id-request.ts`
- Create: `src/core/types/responses/get-events-by-contract-id-response.ts`
- Create: `src/core/types/requests/get-connected-synchronizers-request.ts`
- Create: `src/core/types/responses/get-connected-synchronizers-response.ts`
- Create: `src/core/types/requests/get-ledger-end-request.ts`
- Create: `src/core/types/responses/get-ledger-end-response.ts`
- Create: `src/core/types/requests/get-latest-pruned-offsets-request.ts`
- Create: `src/core/types/responses/get-latest-pruned-offsets-response.ts`
- Create: `src/core/types/requests/get-update-by-offset-request.ts`
- Create: `src/core/types/responses/get-update-by-offset-response.ts`
- Create: `src/core/types/requests/get-update-by-id-request.ts`
- Create: `src/core/types/responses/get-update-by-id-response.ts`
- Create: `src/core/types/requests/get-update-by-hash-request.ts`
- Create: `src/core/types/responses/get-update-by-hash-response.ts`
- Create: `src/core/types/requests/get-updates-page-request.ts`
- Create: `src/core/types/responses/get-updates-page-response.ts`
- Create: `src/core/types/requests/get-completions-request.ts`
- Create: `src/core/types/responses/get-completions-response.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/services/user-management/user-management-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: `src/services/contract/contract-service-client.ts`
- Modify: `src/services/event-query/event-query-service-client.ts`
- Modify: `src/services/state/state-service-client.ts`
- Modify: `src/services/update/update-service-client.ts`
- Modify: `src/services/command-completion/command-completion-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/services/package-management-service-client.test.ts`
- Create: `tests/unit/services/user-management-read-client.test.ts`
- Create: `tests/unit/services/contract-service-client.test.ts`
- Create: `tests/unit/services/event-query-service-client.test.ts`
- Modify: `tests/unit/services/state-service-client.test.ts`
- Modify: `tests/unit/services/update-service-client.test.ts`
- Create: `tests/unit/services/command-completion-service-client.test.ts`

- [ ] **Step 1: Write the failing service client tests for the expanded existing services**

Add forwarding tests that exercise the new public methods with `RequestOptions`, for example:

```ts
await client.getParticipantIdAsync(
    new GetParticipantIdRequest(),
    new RequestOptions({ timeoutMs: 5_000 }),
);

expect(getParticipantIdAsync).toHaveBeenCalledWith(
    expect.any(GetParticipantIdRequest),
    expect.any(RequestOptions),
);
```

Cover:

- `partyManagementService.getParticipantIdAsync`
- `partyManagementService.getPartiesAsync`
- `userManagementService.getUserAsync`
- `userManagementService.listUsersAsync`
- `userManagementService.listUserRightsAsync`
- `packageManagementService.listKnownPackagesAsync`
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

- [ ] **Step 2: Run the focused service client tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/services/package-management-service-client.test.ts tests/unit/services/user-management-read-client.test.ts tests/unit/services/contract-service-client.test.ts tests/unit/services/event-query-service-client.test.ts tests/unit/services/state-service-client.test.ts tests/unit/services/update-service-client.test.ts tests/unit/services/command-completion-service-client.test.ts
```

Expected:

- `FAIL`
- missing DTO files
- missing service methods
- missing `ITransport` methods

- [ ] **Step 3: Add the SDK request and response DTOs plus public service methods**

Implement the new request and response classes with SDK-owned, near-protobuf fields.

Rules for this batch:

- keep simple scalar requests empty when the upstream RPC has no real filters
- keep structural payloads structural instead of inventing deep value models
- only add a separate nested value type if the same shape is reused by more than one RPC in this batch

Add methods to the affected service clients and extend `ITransport` with matching method names.

- [ ] **Step 4: Run the focused service client tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/services/package-management-service-client.test.ts tests/unit/services/user-management-read-client.test.ts tests/unit/services/contract-service-client.test.ts tests/unit/services/event-query-service-client.test.ts tests/unit/services/state-service-client.test.ts tests/unit/services/update-service-client.test.ts tests/unit/services/command-completion-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests src/core/types/responses src/services src/core/transports/transport.interface.ts src/index.ts tests/unit/services
git commit -m "feat: add phase 1 existing service read surface"
```

## Task 2: Implement Batch 1 gRPC And JSON Transport Support

**Files:**
- Modify: `src/transports/grpc/mappers/parties-mapper.ts`
- Modify: `src/transports/grpc/mappers/users-mapper.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `src/transports/grpc/mappers/contracts-mapper.ts`
- Create: `src/transports/grpc/mappers/event-query-mapper.ts`
- Create: `src/transports/grpc/mappers/state-read-mapper.ts`
- Create: `src/transports/grpc/mappers/update-read-mapper.ts`
- Create: `src/transports/grpc/mappers/command-completion-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `DOCUMENTATION.md`
- Create: `tests/unit/grpc/grpc-batch1-read-mappers.test.ts`
- Create: `tests/unit/grpc/grpc-batch1-read-services.test.ts`
- Create: `tests/unit/json/json-batch1-read-services.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

- [ ] **Step 1: Write the failing mapper, routing, and JSON rejection tests for batch 1**

Cover:

- request mapping for each new batch-1 gRPC RPC
- response mapping back into SDK DTOs
- `GrpcTransport` method forwarding and response conversion
- `createGrpcOperations(...)` auth and timeout propagation for the new unary calls
- JSON `NotSupportedError` behavior for unsupported batch-1 reads
- service-registry lazy endpoint failures for any newly introduced ledger-admin surface reads

- [ ] **Step 2: Run the focused batch-1 transport tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-batch1-read-mappers.test.ts tests/unit/grpc/grpc-batch1-read-services.test.ts tests/unit/json/json-batch1-read-services.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `FAIL`
- missing mapper exports
- missing gRPC operation wiring
- missing JSON rejection coverage

- [ ] **Step 3: Implement the batch-1 mapper and transport wiring**

Implementation notes:

- extend `parties-mapper.ts` for `GetParticipantId` and `GetParties`
- extend `users-mapper.ts` for `GetUser`, `ListUsers`, and `ListUserRights`
- extend `packages-mapper.ts` for `ListKnownPackages`
- extend `contracts-mapper.ts` for `GetContract`
- keep `GetEventsByContractId` isolated in `event-query-mapper.ts`
- keep `GetConnectedSynchronizers`, `GetLedgerEnd`, and `GetLatestPrunedOffsets` isolated in `state-read-mapper.ts`
- keep `GetUpdateByOffset`, `GetUpdateById`, `GetUpdateByHash`, and `GetUpdatesPage` isolated in `update-read-mapper.ts`
- keep `GetCompletions` isolated in `command-completion-mapper.ts`
- add the generated client dependencies to `grpc-channel-factory.ts`
- route ledger methods through `buildCallOptionsForLedgerSurfaceAsync(...)`
- route ledger-admin methods through `buildCallOptionsForLedgerAdminSurfaceAsync(...)`
- reject unsupported JSON methods in `json-transport.ts`

- [ ] **Step 4: Run the focused batch-1 transport tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-batch1-read-mappers.test.ts tests/unit/grpc/grpc-batch1-read-services.test.ts tests/unit/json/json-batch1-read-services.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc src/transports/json src/client src/core/transports DOCUMENTATION.md tests/unit/grpc tests/unit/json tests/unit/client tests/unit/core
git commit -m "feat: wire phase 1 existing service reads"
```

## Task 3: Add Small New Read-Only Service DTOs And Public Clients

**Files:**
- Create: `src/core/types/requests/get-command-status-request.ts`
- Create: `src/core/types/responses/get-command-status-response.ts`
- Create: `src/core/types/requests/get-identity-provider-config-request.ts`
- Create: `src/core/types/responses/get-identity-provider-config-response.ts`
- Create: `src/core/types/requests/list-identity-provider-configs-request.ts`
- Create: `src/core/types/responses/list-identity-provider-configs-response.ts`
- Create: `src/core/types/requests/get-resource-limits-request.ts`
- Create: `src/core/types/responses/get-resource-limits-response.ts`
- Create: `src/core/types/requests/get-topology-initialization-id-request.ts`
- Create: `src/core/types/responses/get-topology-initialization-id-response.ts`
- Create: `src/core/types/requests/get-topology-initialization-current-time-request.ts`
- Create: `src/core/types/responses/get-topology-initialization-current-time-response.ts`
- Create: `src/services/command-inspection/command-inspection-service-client.ts`
- Create: `src/services/identity-provider-config/identity-provider-config-service-client.ts`
- Create: `src/services/resource-management/resource-management-service-client.ts`
- Create: `src/services/topology-initialization/topology-initialization-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/services/command-inspection-service-client.test.ts`
- Create: `tests/unit/services/identity-provider-config-service-client.test.ts`
- Create: `tests/unit/services/resource-management-service-client.test.ts`
- Create: `tests/unit/services/topology-initialization-service-client.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`

- [ ] **Step 1: Write the failing service client tests for the new small read-only services**

Each new client test should:

- construct a minimal fake transport
- call the new method with a request and `RequestOptions`
- assert the matching transport method was called
- assert the response remains an SDK-owned DTO

- [ ] **Step 2: Run the focused small-service client tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/command-inspection-service-client.test.ts tests/unit/services/identity-provider-config-service-client.test.ts tests/unit/services/resource-management-service-client.test.ts tests/unit/services/topology-initialization-service-client.test.ts tests/unit/client/canton-client-construction.test.ts
```

Expected:

- `FAIL`
- missing files
- missing `CantonClient` properties

- [ ] **Step 3: Add the DTOs, service clients, root exports, and client properties**

Implementation notes:

- use service-prefixed topology initialization DTO names to avoid generic `GetId` and `CurrentTime` type collisions
- keep identity provider config payloads structural rather than adding deep value types in this phase
- add the new services to `CantonClient` and `ServiceRegistry`
- extend `ITransport` with explicit methods for each new RPC

- [ ] **Step 4: Run the focused small-service client tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/command-inspection-service-client.test.ts tests/unit/services/identity-provider-config-service-client.test.ts tests/unit/services/resource-management-service-client.test.ts tests/unit/services/topology-initialization-service-client.test.ts tests/unit/client/canton-client-construction.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests src/core/types/responses src/services src/client src/core/transports/transport.interface.ts src/index.ts tests/unit/services tests/unit/client
git commit -m "feat: add small phase 1 read services"
```

## Task 4: Implement gRPC And JSON Support For The Small New Read Services

**Files:**
- Create: `src/transports/grpc/mappers/command-inspection-mapper.ts`
- Create: `src/transports/grpc/mappers/identity-provider-config-mapper.ts`
- Create: `src/transports/grpc/mappers/resource-management-mapper.ts`
- Create: `src/transports/grpc/mappers/topology-initialization-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `DOCUMENTATION.md`
- Create: `tests/unit/grpc/grpc-batch2-read-mappers.test.ts`
- Create: `tests/unit/grpc/grpc-batch2-read-services.test.ts`
- Create: `tests/unit/json/json-batch2-read-services.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

- [ ] **Step 1: Write the failing mapper and routing tests for the new small read services**

Cover:

- gRPC request and response mapping
- participant-admin versus ledger-admin endpoint routing
- auth and timeout propagation
- JSON rejections
- lazy missing-endpoint failures

- [ ] **Step 2: Run the focused batch-2 transport tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-batch2-read-mappers.test.ts tests/unit/grpc/grpc-batch2-read-services.test.ts tests/unit/json/json-batch2-read-services.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `FAIL`

- [ ] **Step 3: Implement mapper, channel-factory, transport, JSON, and registry support**

Routing rules:

- `commandInspectionService` uses Ledger Admin
- `identityProviderConfigService` uses Ledger Admin
- `resourceManagementService` uses Participant Admin
- `topologyInitializationService` uses Participant Admin

Keep the gRPC operations explicit and reuse the existing call-options factories.

- [ ] **Step 4: Run the focused batch-2 transport tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-batch2-read-mappers.test.ts tests/unit/grpc/grpc-batch2-read-services.test.ts tests/unit/json/json-batch2-read-services.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc src/transports/json src/client DOCUMENTATION.md tests/unit/grpc tests/unit/json tests/unit/client tests/unit/core
git commit -m "feat: wire small phase 1 read services"
```

## Task 5: Add Participant-Admin Inspection Read DTOs And Public Clients

**Files:**
- Create: `src/core/types/requests/get-dar-request.ts`
- Create: `src/core/types/responses/get-dar-response.ts`
- Create: `src/core/types/requests/list-dars-request.ts`
- Create: `src/core/types/responses/list-dars-response.ts`
- Create: `src/core/types/requests/get-dar-contents-request.ts`
- Create: `src/core/types/responses/get-dar-contents-response.ts`
- Create: `src/core/types/requests/lookup-offset-by-time-request.ts`
- Create: `src/core/types/responses/lookup-offset-by-time-response.ts`
- Create: `src/core/types/requests/lookup-sent-acs-commitments-request.ts`
- Create: `src/core/types/responses/lookup-sent-acs-commitments-response.ts`
- Create: `src/core/types/requests/lookup-received-acs-commitments-request.ts`
- Create: `src/core/types/responses/lookup-received-acs-commitments-response.ts`
- Create: `src/core/types/requests/get-config-for-slow-counter-participants-request.ts`
- Create: `src/core/types/responses/get-config-for-slow-counter-participants-response.ts`
- Create: `src/core/types/requests/get-intervals-behind-for-counter-participants-request.ts`
- Create: `src/core/types/responses/get-intervals-behind-for-counter-participants-response.ts`
- Create: `src/core/types/requests/count-in-flight-request.ts`
- Create: `src/core/types/responses/count-in-flight-response.ts`
- Create: `src/core/types/requests/get-safe-pruning-offset-request.ts`
- Create: `src/core/types/responses/get-safe-pruning-offset-response.ts`
- Create: `src/core/types/requests/get-pruning-schedule-request.ts`
- Create: `src/core/types/responses/get-pruning-schedule-response.ts`
- Create: `src/core/types/requests/get-participant-pruning-schedule-request.ts`
- Create: `src/core/types/responses/get-participant-pruning-schedule-response.ts`
- Create: `src/core/types/requests/get-no-wait-commitments-from-request.ts`
- Create: `src/core/types/responses/get-no-wait-commitments-from-response.ts`
- Create: `src/core/types/requests/list-pending-operations-request.ts`
- Create: `src/core/types/responses/list-pending-operations-response.ts`
- Create: `src/core/types/requests/get-highest-offset-by-timestamp-request.ts`
- Create: `src/core/types/responses/get-highest-offset-by-timestamp-response.ts`
- Create: `src/core/types/requests/list-connected-synchronizers-request.ts`
- Create: `src/core/types/responses/list-connected-synchronizers-response.ts`
- Create: `src/core/types/requests/list-registered-synchronizers-request.ts`
- Create: `src/core/types/responses/list-registered-synchronizers-response.ts`
- Create: `src/core/types/requests/get-synchronizer-id-request.ts`
- Create: `src/core/types/responses/get-synchronizer-id-response.ts`
- Modify: `src/services/participant-package/participant-package-service-client.ts`
- Create: `src/services/participant-inspection/participant-inspection-service-client.ts`
- Create: `src/services/participant-pruning/participant-pruning-service-client.ts`
- Create: `src/services/participant-repair/participant-repair-service-client.ts`
- Create: `src/services/participant-party-management/participant-party-management-service-client.ts`
- Create: `src/services/synchronizer-connectivity/synchronizer-connectivity-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/services/participant-package-service-client.test.ts`
- Create: `tests/unit/services/participant-inspection-service-client.test.ts`
- Create: `tests/unit/services/participant-pruning-service-client.test.ts`
- Create: `tests/unit/services/participant-repair-service-client.test.ts`
- Create: `tests/unit/services/participant-party-management-service-client.test.ts`
- Create: `tests/unit/services/synchronizer-connectivity-service-client.test.ts`

- [ ] **Step 1: Write the failing service client tests for the participant-admin inspection services**

Cover:

- participant package DAR reads
- participant inspection lookups and counts
- participant pruning read methods
- participant repair pending-operation reads
- participant party-management timestamp lookup
- synchronizer connectivity list and lookup methods

- [ ] **Step 2: Run the focused participant-admin service tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/participant-package-service-client.test.ts tests/unit/services/participant-inspection-service-client.test.ts tests/unit/services/participant-pruning-service-client.test.ts tests/unit/services/participant-repair-service-client.test.ts tests/unit/services/participant-party-management-service-client.test.ts tests/unit/services/synchronizer-connectivity-service-client.test.ts
```

Expected:

- `FAIL`

- [ ] **Step 3: Add the DTOs and public client methods**

Implementation notes:

- keep DAR payloads as `Uint8Array` plus structural metadata fields
- keep inspection and update-like payloads structural instead of semantic
- avoid new deep domain hierarchies in this phase
- use the existing participant package service for DAR reads rather than introducing another package service

- [ ] **Step 4: Run the focused participant-admin service tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/participant-package-service-client.test.ts tests/unit/services/participant-inspection-service-client.test.ts tests/unit/services/participant-pruning-service-client.test.ts tests/unit/services/participant-repair-service-client.test.ts tests/unit/services/participant-party-management-service-client.test.ts tests/unit/services/synchronizer-connectivity-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/requests src/core/types/responses src/services src/core/transports/transport.interface.ts src/client src/index.ts tests/unit/services
git commit -m "feat: add participant admin phase 1 read clients"
```

## Task 6: Implement Participant-Admin Read Transport Support

**Files:**
- Create: `src/transports/grpc/mappers/participant-inspection-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-pruning-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-repair-mapper.ts`
- Create: `src/transports/grpc/mappers/participant-party-management-mapper.ts`
- Create: `src/transports/grpc/mappers/synchronizer-connectivity-mapper.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `DOCUMENTATION.md`
- Create: `tests/unit/grpc/grpc-batch3-read-mappers.test.ts`
- Create: `tests/unit/grpc/grpc-batch3-read-services.test.ts`
- Create: `tests/unit/json/json-batch3-read-services.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

- [ ] **Step 1: Write the failing mapper, transport, and JSON rejection tests for the participant-admin read batch**

Focus the tests on:

- request/response mapping correctness
- participant-admin auth and timeout propagation
- lazy missing-endpoint failures
- JSON `NotSupportedError` coverage
- no leakage of generated protobuf classes past the transport boundary

- [ ] **Step 2: Run the focused participant-admin transport tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-batch3-read-mappers.test.ts tests/unit/grpc/grpc-batch3-read-services.test.ts tests/unit/json/json-batch3-read-services.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `FAIL`

- [ ] **Step 3: Implement the participant-admin gRPC and JSON wiring**

Implementation notes:

- extend `packages-mapper.ts` for `GetDar`, `ListDars`, and `GetDarContents`
- keep the other participant-admin read families in dedicated mapper files
- add the generated client dependencies to `grpc-channel-factory.ts`
- route all of these methods through `buildCallOptionsForParticipantAdminSurfaceAsync(...)`
- reject them on JSON unless a real JSON surface exists

- [ ] **Step 4: Run the focused participant-admin transport tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-batch3-read-mappers.test.ts tests/unit/grpc/grpc-batch3-read-services.test.ts tests/unit/json/json-batch3-read-services.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc src/transports/json src/client DOCUMENTATION.md tests/unit/grpc tests/unit/json tests/unit/client tests/unit/core
git commit -m "feat: wire participant admin phase 1 reads"
```

## Task 7: Final Documentation And Full Verification

**Files:**
- Modify: `DOCUMENTATION.md`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`

- [ ] **Step 1: Finish the public documentation**

Update `DOCUMENTATION.md` so it:

- lists every new public service
- documents each new public read method
- states the endpoint surface for each service
- states JSON versus gRPC support clearly
- updates the transport support matrix for all batch-1, batch-2, and batch-3 additions

- [ ] **Step 2: Run lint**

Run:

```bash
rtk npm run lint
```

Expected:

- `PASS`

- [ ] **Step 3: Run the full unit suite**

Run:

```bash
rtk npm run test:unit
```

Expected:

- `PASS`

- [ ] **Step 4: Review the final diff for accidental public-surface drift**

Check:

- no generated protobuf classes are exported from `src/index.ts`
- new services are on the correct endpoint surface
- JSON unsupported methods throw `NotSupportedError`
- public method names remain literal and C#-style

- [ ] **Step 5: Commit**

```bash
git add DOCUMENTATION.md src/index.ts tests/unit/core tests/unit/client
git commit -m "docs: finalize phase 1 full node read surface"
```
