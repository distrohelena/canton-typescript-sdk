# Three API Surface Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the SDK around the real three API families by splitting Ledger, Ledger Admin, and Participant Admin endpoints/auth/security, adding `packageManagementService` to the public surface, and moving DAR upload off `participantPackageService`.

**Architecture:** Keep the public SDK top-level and gRPC-shaped by exposing service clients directly rather than adding admin wrappers. Rebuild `CantonClientOptions`, service registry routing, transport factory auth/security selection, and docs/tests so every public service belongs to exactly one real protobuf family. Treat this as a strict breaking cleanup with no aliases from the old two-surface `adminEndpoint` model.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated gRPC clients, JSON transport adapters, `@distrohelena/linter`

---

## File Structure

### Public options and root service surface

- Modify: `src/client/canton-client-options.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/index.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `src/transports/json/json-ledger-client.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`

### Service ownership cleanup

- Modify: `src/services/participant-package/participant-package-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: `tests/unit/services/participant-package-service-client.test.ts`
- Create: `tests/unit/services/package-management-service-client.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`

### Three-surface routing and transport selection

- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/json/json-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/unit/grpc/grpc-connect-timeout.test.ts`

### Transport contract and auth/security wiring

- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/transports/grpc/grpc-call-options-factory.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`
- Modify: `tests/unit/services/health-client.test.ts`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/services/package-service-client.test.ts`
- Modify: `tests/unit/services/participant-status-service-client.test.ts`
- Modify: `tests/unit/services/contracts-client.test.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `tests/unit/services/json-command-signing-not-supported.test.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Modify: `tests/unit/services/events-client.test.ts`

### Documentation cleanup

- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Replace The Two-Surface Client Options With The Strict Three-Surface Model

**Files:**
- Modify: `src/client/canton-client-options.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`

- [ ] **Step 1: Write the failing client-options tests**

Extend `tests/unit/core/canton-client-options.test.ts` so it asserts:

```ts
const options = new CantonClientOptions({
    transportKind: TransportKind.grpc,
    ledgerEndpoint: "https://ledger.example.com",
    ledgerAdminEndpoint: "https://ledger-admin.example.com",
    participantAdminEndpoint: "https://participant-admin.example.com",
});

expect(options.ledgerAdminEndpoint).toBe("https://ledger-admin.example.com");
expect(options.participantAdminEndpoint).toBe(
    "https://participant-admin.example.com",
);
expect("adminEndpoint" in options).toBe(false);
```

Also add coverage for:

- `ledgerAuthProvider`
- `ledgerAdminAuthProvider`
- `participantAdminAuthProvider`
- `ledgerGrpcChannelSecurity`
- `ledgerAdminGrpcChannelSecurity`
- `participantAdminGrpcChannelSecurity`

- [ ] **Step 2: Run the focused client-options test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts
```

Expected:

- `FAIL`
- missing `ledgerAdminEndpoint`
- missing `participantAdminEndpoint`
- old `adminEndpoint` still present

- [ ] **Step 3: Update `CantonClientOptions` to the new strict model**

Implement the new shape:

- remove `adminEndpoint`
- remove `adminGrpcChannelSecurity`
- remove shared `authProvider`
- add `ledgerAdminEndpoint`
- add `participantAdminEndpoint`
- add `ledgerAuthProvider`
- add `ledgerAdminAuthProvider`
- add `participantAdminAuthProvider`
- add `ledgerAdminGrpcChannelSecurity`
- add `participantAdminGrpcChannelSecurity`

Keep these shared:

- `grpcChannelSecurity`
- `defaultRequestTimeoutMs`
- `grpcConnectTimeoutMs`
- `commandSigner`

- [ ] **Step 4: Re-run the focused client-options test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/client/canton-client-options.ts tests/unit/core/canton-client-options.test.ts
git commit -m "feat: split client options into three api surfaces"
```

## Task 2: Expose The Literal Public Service Surface And Move DAR Upload To Ledger Admin

**Files:**
- Modify: `src/client/canton-client.ts`
- Modify: `src/index.ts`
- Modify: `src/transports/grpc/grpc-ledger-client.ts`
- Modify: `src/transports/json/json-ledger-client.ts`
- Modify: `src/services/participant-package/participant-package-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Modify: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`
- Modify: `tests/unit/services/participant-package-service-client.test.ts`
- Create: `tests/unit/services/package-management-service-client.test.ts`

- [ ] **Step 1: Write the failing public-surface and service-forwarding tests**

Update construction and smoke tests to assert:

```ts
expect(client.packageManagementService).toBeDefined();
expect(client).not.toHaveProperty("adminEndpoint");
```

Update participant package tests so `uploadDarFileAsync(...)` no longer exists there:

```ts
expect("uploadDarFileAsync" in client).toBe(false);
```

Add a new `PackageManagementServiceClient` forwarding test:

```ts
await client.uploadDarFileAsync(request, options);

expect(transport.uploadDarFileAsync).toHaveBeenCalledWith(request, options);
```

- [ ] **Step 2: Run the focused public-surface and service tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/smoke/package-shape.test.ts tests/unit/services/participant-package-service-client.test.ts tests/unit/services/package-management-service-client.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts
```

Expected:

- `FAIL`
- missing `packageManagementService`
- `participantPackageService` still exposes DAR upload
- protocol-specific clients still miss the new service

- [ ] **Step 3: Clean up the public service surface**

Implement:

- add `packageManagementService` to `CantonClient`
- root-export `PackageManagementServiceClient`
- expose `packageManagementService` from `GrpcLedgerClient` and `JsonLedgerClient`
- remove `uploadDarFileAsync(...)` from `ParticipantPackageServiceClient`
- keep `uploadDarFileAsync(...)` on `PackageManagementServiceClient`
- update smoke/integration expectations so the new service is part of the public API

- [ ] **Step 4: Re-run the focused public-surface and service tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/smoke/package-shape.test.ts tests/unit/services/participant-package-service-client.test.ts tests/unit/services/package-management-service-client.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/client/canton-client.ts src/index.ts src/transports/grpc/grpc-ledger-client.ts src/transports/json/json-ledger-client.ts src/services/participant-package/participant-package-service-client.ts src/services/package-management/package-management-service-client.ts tests/unit/client/canton-client-construction.test.ts tests/unit/smoke/package-shape.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts tests/unit/services/participant-package-service-client.test.ts tests/unit/services/package-management-service-client.test.ts
git commit -m "feat: align public services to ledger and participant admin"
```

## Task 3: Rebuild Service Registry Routing Around Ledger, Ledger Admin, And Participant Admin

**Files:**
- Modify: `src/client/service-registry.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`

- [ ] **Step 1: Write the failing three-surface routing tests**

Extend the registry tests to build three transports and assert:

```ts
await services.versionService.getLedgerApiVersionAsync();
await services.partyManagementService.listKnownPartiesAsync(
    new ListKnownPartiesRequest(),
);
await services.participantStatusService.getParticipantStatusAsync(
    new GetParticipantStatusRequest(),
);

expect(ledgerTransport.getLedgerApiVersionAsync).toHaveBeenCalledTimes(1);
expect(ledgerAdminTransport.listKnownPartiesAsync).toHaveBeenCalledTimes(1);
expect(participantAdminTransport.getParticipantStatusAsync).toHaveBeenCalledTimes(1);
```

Add lazy missing-endpoint tests for all three surfaces:

- missing `ledgerEndpoint`
- missing `ledgerAdminEndpoint`
- missing `participantAdminEndpoint`

Also assert precise error messages:

- `The ledger admin endpoint is not configured for packageManagementService.`
- `The participant admin endpoint is not configured for participantStatusService.`

- [ ] **Step 2: Run the focused routing tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/client/service-registry-endpoints.test.ts
```

Expected:

- `FAIL`
- two-surface routing assumptions still present
- missing precise ledger-admin vs participant-admin failures

- [ ] **Step 3: Rework the service registry for three surfaces**

Implement:

- `createLedgerTransport(...)`
- `createLedgerAdminTransport(...)`
- `createParticipantAdminTransport(...)`
- separate missing-endpoint placeholder transports per surface
- exact service ownership:
  - Ledger: version/health/command/state/update/event/contracts/package reads
  - Ledger Admin: party/user/package management
  - Participant Admin: participant package reads/status

Ensure `transport` disposal still aggregates all created transports.

- [ ] **Step 4: Re-run the focused routing tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/client/service-registry-endpoints.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/client/service-registry.ts tests/unit/client/service-registry-endpoints.test.ts
git commit -m "feat: route sdk services across three api surfaces"
```

## Task 4: Split Auth And gRPC Security Selection Three Ways

**Files:**
- Modify: `src/transports/json/json-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-call-options-factory.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/unit/grpc/grpc-connect-timeout.test.ts`

- [ ] **Step 1: Write the failing auth/security selection tests**

Update gRPC tests to assert:

- Ledger calls use `ledgerAuthProvider`
- Ledger Admin calls use `ledgerAdminAuthProvider`
- Participant Admin calls use `participantAdminAuthProvider`
- each surface resolves the correct gRPC security override

Representative expectations:

```ts
expect(capturedLedgerOptions.meta.authorization).toBe("Bearer ledger-token");
expect(capturedLedgerAdminOptions.meta.authorization).toBe(
    "Bearer ledger-admin-token",
);
expect(capturedParticipantAdminOptions.meta.authorization).toBe(
    "Bearer participant-admin-token",
);
```

Also extend connect-timeout tests so the three-surface split does not regress shared `grpcConnectTimeoutMs`.

- [ ] **Step 2: Run the focused transport-factory tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts
```

Expected:

- `FAIL`
- factories still read the removed shared `authProvider`
- transport creation still assumes one generic admin surface

- [ ] **Step 3: Implement three-way auth/security selection**

Implement the transport-factory wiring so each created transport receives the correct per-surface auth configuration while preserving:

- shared `defaultRequestTimeoutMs`
- shared `grpcConnectTimeoutMs`

Do not add new public timeout settings in this task.

- [ ] **Step 4: Re-run the focused transport-factory tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-transport-factory.ts src/transports/grpc/grpc-transport-factory.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-call-options-factory.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts
git commit -m "feat: split auth and grpc security by api surface"
```

## Task 5: Reassign Upload DAR And Finish The Transport Contract Cleanup

**Files:**
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`
- Modify: `tests/unit/services/health-client.test.ts`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/services/package-service-client.test.ts`
- Modify: `tests/unit/services/participant-status-service-client.test.ts`
- Modify: `tests/unit/services/contracts-client.test.ts`
- Modify: `tests/unit/services/grpc-command-signing.test.ts`
- Modify: `tests/unit/services/json-command-signing-not-supported.test.ts`
- Modify: `tests/unit/services/command-submission-pipeline.test.ts`
- Modify: `tests/unit/services/events-client.test.ts`

- [ ] **Step 1: Write the failing transport-contract and contract tests**

Move DAR upload assertions from `participantPackageService` to `packageManagementService` in both JSON and gRPC contract tests.

Update transport-surface tests so the service contract reflects:

- `uploadDarFileAsync(...)` is a Ledger Admin concern
- `participantPackageService` only exposes participant package reads

- [ ] **Step 2: Run the focused transport-contract tests to verify they fail**

Run:

```bash
rtk npm test -- tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/unit/core/transport-surface.test.ts tests/unit/services/package-service-client.test.ts tests/unit/services/participant-status-service-client.test.ts
```

Expected:

- `FAIL`
- contract tests still call DAR upload through `participantPackageService`
- transport/client tests still assume the old mixed surface

- [ ] **Step 3: Complete the contract and transport cleanup**

Implement the transport/client updates needed so:

- `PackageManagementServiceClient.uploadDarFileAsync(...)` is the public path
- participant package service only forwards participant package read operations
- existing helper tests compile under the updated transport interface and client shape

- [ ] **Step 4: Re-run the focused transport-contract tests to verify they pass**

Run:

```bash
rtk npm test -- tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/unit/core/transport-surface.test.ts tests/unit/services/package-service-client.test.ts tests/unit/services/participant-status-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/transports/transport.interface.ts src/transports/grpc/grpc-transport.ts src/transports/json/json-transport.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/unit/core/transport-surface.test.ts tests/unit/services/health-client.test.ts tests/unit/services/parties-client.test.ts tests/unit/services/package-service-client.test.ts tests/unit/services/participant-status-service-client.test.ts tests/unit/services/contracts-client.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/services/json-command-signing-not-supported.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/events-client.test.ts
git commit -m "feat: move dar upload to ledger admin package management"
```

## Task 6: Update Docs And Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Update the docs to use the real family names**

Update `README.md` and `DOCUMENTATION.md` so they:

- use `ledgerEndpoint`, `ledgerAdminEndpoint`, `participantAdminEndpoint`
- use `ledgerAuthProvider`, `ledgerAdminAuthProvider`, `participantAdminAuthProvider`
- classify services as `Ledger`, `Ledger Admin`, or `Participant Admin`
- add `packageManagementService`
- move upload DAR docs from `participantPackageService` to `packageManagementService`
- remove generic “Admin endpoint” wording where a precise family name is required

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
git commit -m "docs: describe ledger admin and participant admin split"
```

- [ ] **Step 4: Finish the branch work**

After the final commit, verify the working tree is in the expected state:

```bash
rtk git status --short
```

Expected:

- no unexpected tracked changes remain
- unrelated untracked files, if any, are explicitly called out rather than silently included
