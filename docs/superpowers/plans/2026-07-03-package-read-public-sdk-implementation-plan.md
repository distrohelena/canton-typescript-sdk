# Package Read Public SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose typed public package read APIs through a new ledger `packageService` and a renamed admin-oriented `participantPackageService`, removing the old `packageManagementService` surface.

**Architecture:** Add SDK-owned DTOs for ledger and participant package read shapes, split the public service layer into `packageService` and `participantPackageService`, extend the internal transport with explicit ledger/admin package methods, implement the full selected surface on gRPC, and keep JSON methods present but throwing `NotSupportedError` where unsupported. The public API intentionally becomes a breaking rename that better matches the intended gRPC-aligned model.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated gRPC clients, existing SDK service/transport layers

---

## File Structure

### Public service split and breaking rename

- Create: `src/services/package/package-service-client.ts`
- Create: `src/services/participant-package/participant-package-service-client.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `src/transports/json/json-ledger-client.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

### Ledger package DTOs and exports

- Create: `src/core/types/hash-function.ts`
- Create: `src/core/types/package-status.ts`
- Create: `src/core/types/package-reference.ts`
- Create: `src/core/types/package-metadata-filter.ts`
- Create: `src/core/types/topology-state-filter.ts`
- Create: `src/core/types/vetted-package.ts`
- Create: `src/core/types/vetted-packages.ts`
- Create: `src/core/types/requests/list-packages-request.ts`
- Create: `src/core/types/requests/get-package-request.ts`
- Create: `src/core/types/requests/get-package-status-request.ts`
- Create: `src/core/types/requests/list-vetted-packages-request.ts`
- Create: `src/core/types/responses/list-packages-response.ts`
- Create: `src/core/types/responses/get-package-response.ts`
- Create: `src/core/types/responses/get-package-status-response.ts`
- Create: `src/core/types/responses/list-vetted-packages-response.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/smoke/package-shape.test.ts`

### Participant package DTOs and exports

- Create: `src/core/types/participant-package-description.ts`
- Create: `src/core/types/participant-module-description.ts`
- Create: `src/core/types/participant-dar-description.ts`
- Create: `src/core/types/requests/participant-list-packages-request.ts`
- Create: `src/core/types/requests/get-package-contents-request.ts`
- Create: `src/core/types/requests/get-package-references-request.ts`
- Create: `src/core/types/responses/participant-list-packages-response.ts`
- Create: `src/core/types/responses/get-package-contents-response.ts`
- Create: `src/core/types/responses/get-package-references-response.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/smoke/package-shape.test.ts`

### Service and transport propagation

- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Create: `tests/unit/services/package-service-client.test.ts`
- Create: `tests/unit/services/participant-package-service-client.test.ts`

### gRPC package wiring and mappers

- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/unit/grpc/grpc-operational-mappers.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`

### JSON capability behavior and contract updates

- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/json/json-system-client.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`

### Documentation and public usage guide

- Modify: `DOCUMENTATION.md`

## Task 1: Split The Public Service Surface And Remove `packageManagementService`

**Files:**
- Create: `src/services/package/package-service-client.ts`
- Create: `src/services/participant-package/participant-package-service-client.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `src/transports/json/json-ledger-client.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

- [ ] **Step 1: Write the failing public surface tests**

Add assertions that:

```ts
expect(client.packageService).toBeDefined();
expect(client.participantPackageService).toBeDefined();
expect(client).not.toHaveProperty("packageManagementService");
```

Also update integration/public-shape tests to reference the new service names.

- [ ] **Step 2: Run the focused service-surface tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts
```

Expected:

- `FAIL`
- missing `packageService`
- missing `participantPackageService`
- stale `packageManagementService` assumptions

- [ ] **Step 3: Add the new public service clients and wire them into client construction**

Implement:

- `PackageServiceClient` for ledger package reads
- `ParticipantPackageServiceClient` for upload and participant-admin package reads
- updated `CantonClient`, service registry, and ledger wrapper classes
- root exports for both new service client classes

Do not preserve `packageManagementService` as a compatibility alias.

- [ ] **Step 4: Run the focused service-surface tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/services/package/package-service-client.ts src/services/participant-package/participant-package-service-client.ts src/client/canton-client.ts src/client/service-registry.ts src/transports/grpc/grpc-ledger-client.ts src/transports/json/json-ledger-client.ts src/index.ts tests/unit/client/canton-client-construction.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts
git commit -m "feat: split package services on the public sdk"
```

## Task 2: Add Ledger Package DTOs And Root Exports

**Files:**
- Create: `src/core/types/hash-function.ts`
- Create: `src/core/types/package-status.ts`
- Create: `src/core/types/package-reference.ts`
- Create: `src/core/types/package-metadata-filter.ts`
- Create: `src/core/types/topology-state-filter.ts`
- Create: `src/core/types/vetted-package.ts`
- Create: `src/core/types/vetted-packages.ts`
- Create: `src/core/types/requests/list-packages-request.ts`
- Create: `src/core/types/requests/get-package-request.ts`
- Create: `src/core/types/requests/get-package-status-request.ts`
- Create: `src/core/types/requests/list-vetted-packages-request.ts`
- Create: `src/core/types/responses/list-packages-response.ts`
- Create: `src/core/types/responses/get-package-response.ts`
- Create: `src/core/types/responses/get-package-status-response.ts`
- Create: `src/core/types/responses/list-vetted-packages-response.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing ledger package DTO/export tests**

Add assertions such as:

```ts
const request = new GetPackageRequest({ packageId: "pkg-1" });
expect(request.packageId).toBe("pkg-1");

expect(rootModule.PackageServiceClient).toBeTypeOf("function");
expect(rootModule.PackageStatus).toBeDefined();
```

Also verify the root package exports the new ledger request/response/value types.

- [ ] **Step 2: Run the focused DTO/export tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- missing ledger package DTO exports
- missing `PackageServiceClient`

- [ ] **Step 3: Add the ledger package DTOs and exports**

Implement SDK-owned classes/enums for:

- package archive reads
- package status reads
- vetted package listing and filters

Keep the shapes close to the protobuf semantics without exporting protobuf classes.

- [ ] **Step 4: Run the focused DTO/export tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/hash-function.ts src/core/types/package-status.ts src/core/types/package-reference.ts src/core/types/package-metadata-filter.ts src/core/types/topology-state-filter.ts src/core/types/vetted-package.ts src/core/types/vetted-packages.ts src/core/types/requests/list-packages-request.ts src/core/types/requests/get-package-request.ts src/core/types/requests/get-package-status-request.ts src/core/types/requests/list-vetted-packages-request.ts src/core/types/responses/list-packages-response.ts src/core/types/responses/get-package-response.ts src/core/types/responses/get-package-status-response.ts src/core/types/responses/list-vetted-packages-response.ts src/index.ts tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add ledger package sdk types"
```

## Task 3: Add Participant Package DTOs And Root Exports

**Files:**
- Create: `src/core/types/participant-package-description.ts`
- Create: `src/core/types/participant-module-description.ts`
- Create: `src/core/types/participant-dar-description.ts`
- Create: `src/core/types/requests/participant-list-packages-request.ts`
- Create: `src/core/types/requests/get-package-contents-request.ts`
- Create: `src/core/types/requests/get-package-references-request.ts`
- Create: `src/core/types/responses/participant-list-packages-response.ts`
- Create: `src/core/types/responses/get-package-contents-response.ts`
- Create: `src/core/types/responses/get-package-references-response.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing participant package DTO/export tests**

Add assertions such as:

```ts
const request = new ParticipantListPackagesRequest({ limit: 25 });
expect(request.limit).toBe(25);

expect(rootModule.ParticipantPackageServiceClient).toBeTypeOf("function");
```

Also verify the participant package DTOs are root-exported.

- [ ] **Step 2: Run the focused DTO/export tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- missing participant package DTO exports
- missing `ParticipantPackageServiceClient`

- [ ] **Step 3: Add the participant package DTOs and exports**

Implement SDK-owned request/response/value types for:

- participant package listing
- package contents
- package references

Keep them distinct from the ledger package DTOs where semantics differ.

- [ ] **Step 4: Run the focused DTO/export tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/participant-package-description.ts src/core/types/participant-module-description.ts src/core/types/participant-dar-description.ts src/core/types/requests/participant-list-packages-request.ts src/core/types/requests/get-package-contents-request.ts src/core/types/requests/get-package-references-request.ts src/core/types/responses/participant-list-packages-response.ts src/core/types/responses/get-package-contents-response.ts src/core/types/responses/get-package-references-response.ts src/index.ts tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add participant package sdk types"
```

## Task 4: Thread New Package Methods Through Service Clients And Transport Interfaces

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Create: `tests/unit/services/package-service-client.test.ts`
- Create: `tests/unit/services/participant-package-service-client.test.ts`

- [ ] **Step 1: Write the failing forwarding tests**

Add tests that verify:

- `packageService` forwards ledger package requests into transport methods unchanged
- `participantPackageService` forwards upload and participant-admin package requests unchanged
- `RequestOptions` still flows as the final optional parameter

Examples:

```ts
await client.getPackageAsync(request, options);
expect(transport.getPackageAsync).toHaveBeenCalledWith(request, options);
```

and:

```ts
await client.getPackageContentsAsync(request, options);
expect(transport.getParticipantPackageContentsAsync).toHaveBeenCalledWith(
    request,
    options,
);
```

- [ ] **Step 2: Run the focused forwarding tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/package-service-client.test.ts tests/unit/services/participant-package-service-client.test.ts
```

Expected:

- `FAIL`
- missing package methods on service clients
- missing transport signatures

- [ ] **Step 3: Extend the service clients and transport interface**

Add transport methods for:

- `listPackagesAsync`
- `getPackageAsync`
- `getPackageStatusAsync`
- `listVettedPackagesAsync`
- `listParticipantPackagesAsync`
- `getParticipantPackageContentsAsync`
- `getParticipantPackageReferencesAsync`

Also wire the new service clients through the service registry.

- [ ] **Step 4: Run the focused forwarding tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/package-service-client.test.ts tests/unit/services/participant-package-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/transports/transport.interface.ts src/client/service-registry.ts tests/unit/services/package-service-client.test.ts tests/unit/services/participant-package-service-client.test.ts
git commit -m "feat: thread package read methods through services"
```

## Task 5: Implement gRPC Ledger Package Reads And Participant Package Reads

**Files:**
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/mappers/packages-mapper.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/unit/grpc/grpc-operational-mappers.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`

- [ ] **Step 1: Write the failing gRPC package tests**

Add focused assertions for:

- ledger package reads calling the generated ledger package service client
- participant package reads calling the generated participant-admin package service client
- upload remaining on the admin-oriented public service
- mapping generated payloads into SDK DTOs only

Examples:

```ts
await transport.getPackageStatusAsync(new GetPackageStatusRequest({
    packageId: "pkg-1",
}));

expect(capturedCallOptions).toMatchObject({
    meta: expect.any(Object),
});
```

and:

```ts
expect(result.packageStatus).toBe(PackageStatus.registered);
expect(result).not.toBeInstanceOf(ProtobufMessageClass);
```

- [ ] **Step 2: Run the focused gRPC package tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts
```

Expected:

- `FAIL`
- missing generated client dependencies for package reads
- missing mapper coverage
- stale `PackageManagementServiceClient` expectations

- [ ] **Step 3: Add gRPC channel wiring, transport methods, and package mappers**

Implement:

- ledger package service generated client dependency in `grpc-channel-factory`
- participant-admin package service generated client dependency in `grpc-channel-factory`
- package read operation methods in `GrpcOperations`
- transport methods that map SDK DTOs to generated requests and generated payloads back to SDK DTOs

Keep admin-oriented public service naming in the SDK layer even if the underlying admin methods come from more than one generated admin client.

- [ ] **Step 4: Run the focused gRPC package tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts src/transports/grpc/mappers/packages-mapper.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-operational-mappers.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts
git commit -m "feat: add grpc package read apis"
```

## Task 6: Implement JSON Capability Behavior For The New Package Surface

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/json/json-system-client.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`

- [ ] **Step 1: Write the failing JSON capability tests**

Add assertions that:

- `participantPackageService.uploadDarFileAsync` continues to work on JSON
- unsupported ledger/admin package read methods throw `NotSupportedError`
- the shared public service surface exists even on JSON

Examples:

```ts
await expect(
    packageService.listPackagesAsync(new ListPackagesRequest()),
).rejects.toThrow(NotSupportedError);
```

- [ ] **Step 2: Run the focused JSON capability tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/json/json-system-client.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `FAIL`
- missing new service/client methods
- incorrect JSON package capability behavior

- [ ] **Step 3: Add JSON transport behavior for the new package methods**

Implement:

- `uploadDarFileAsync` remaining functional on the participant package service path
- unsupported ledger/admin package read methods throwing `NotSupportedError`
- clear method-specific messages that describe the transport limitation

- [ ] **Step 4: Run the focused JSON capability tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/json/json-system-client.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-transport.ts tests/unit/json/json-system-client.test.ts tests/contract/shared/operational-services.json.contract.test.ts
git commit -m "feat: add json package capability surface"
```

## Task 7: Update Public Documentation

**Files:**
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Write the failing documentation assertions mentally and enumerate the required sections**

Update sections for:

- `packageService`
- `participantPackageService`
- all new package read functions
- transport support matrix
- breaking removal of `packageManagementService`

- [ ] **Step 2: Update `DOCUMENTATION.md`**

Document every new method with:

- purpose
- request/response DTOs
- gRPC/JSON support
- runtime `NotSupportedError` behavior where relevant

- [ ] **Step 3: Verify the documentation references the new services only**

Run:

```bash
rtk rg -n "packageManagementService|packageService|participantPackageService" DOCUMENTATION.md
```

Expected:

- only intentional references remain
- old public service name removed or discussed only as a breaking change

- [ ] **Step 4: Commit**

```bash
git add DOCUMENTATION.md
git commit -m "docs: document package read sdk services"
```

## Task 8: Run Full Verification

**Files:**
- Modify as needed from previous tasks

- [ ] **Step 1: Run build verification**

Run:

```bash
rtk npm run build
```

Expected:

- `PASS`

- [ ] **Step 2: Run lint verification**

Run:

```bash
rtk npm run lint
```

Expected:

- `PASS`

- [ ] **Step 3: Run full unit verification**

Run:

```bash
rtk npm run test:unit
```

Expected:

- `PASS`

- [ ] **Step 4: Run focused contract verification for package services**

Run:

```bash
rtk npm test -- tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit final verification-safe tree**

```bash
git add src tests DOCUMENTATION.md
git commit -m "feat: expose package read apis on the public sdk"
```
