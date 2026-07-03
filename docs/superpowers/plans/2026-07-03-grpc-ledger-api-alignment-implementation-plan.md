# gRPC Ledger API Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the invented public SDK surface with a gRPC Ledger API-shaped surface, keeping JSON as an adapter only where the semantics hold.

**Architecture:** First freeze the target public service map and method names around the generated gRPC service boundaries. Then move the existing implemented behavior into those service clients, add placeholders for future services, and finally remove the old domain-grouped API from exports, tests, and docs.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated Ledger API clients, existing JSON/gRPC transport adapters

---

## File Structure

The implementation should converge on the following public structure.

### Core client and exports

- Modify: `src/client/canton-client.ts`
  - Replace current domain-grouped properties with gRPC service-grouped properties.
- Modify: `src/client/service-registry.ts`
  - Build the new service registry around gRPC-shaped clients and placeholder services.
- Modify: `src/index.ts`
  - Re-export only the new service/client/type names.
- Modify: `src/grpc/index.ts`
  - Keep protocol-specific exports aligned with the new service boundaries.
- Modify: `src/json/index.ts`
  - Keep protocol-specific exports aligned with the new service boundaries.

### Service client layer

- Create: `src/services/version/version-service-client.ts`
- Create: `src/services/party-management/party-management-service-client.ts`
- Create: `src/services/user-management/user-management-service-client.ts`
- Create: `src/services/package-management/package-management-service-client.ts`
- Create: `src/services/update/update-service-client.ts`
- Create: `src/services/command/command-service-client.ts`
- Create: `src/services/command-submission/command-submission-service-client.ts`
- Create: `src/services/state/state-service-client.ts`
- Create: `src/services/event-query/event-query-service-client.ts`
- Create: `src/services/contract/contract-service-client.ts`
- Create: `src/services/command-completion/command-completion-service-client.ts`
- Create: placeholder clients for other reserved services if they are to appear immediately on `CantonClient`

Existing files to remove or stop exporting after migration:

- `src/services/system/system-client.ts`
- `src/services/parties/parties-client.ts`
- `src/services/users/users-client.ts`
- `src/services/packages/packages-client.ts`
- `src/services/contracts/contracts-client.ts`
- `src/services/events/events-client.ts`
- `src/services/commands/commands-client.ts`

### Request and response types

Existing request/response types that need gRPC-aligned replacements or renames:

- `src/core/types/requests/create-party-request.ts`
- `src/core/types/requests/list-parties-request.ts`
- `src/core/types/requests/grant-user-rights-request.ts`
- `src/core/types/requests/upload-package-request.ts`
- `src/core/types/requests/query-contracts-request.ts`
- `src/core/types/requests/stream-query-request.ts`
- `src/core/types/requests/stream-transactions-request.ts`
- `src/core/types/requests/submit-command-request.ts`
- `src/core/types/responses/create-party-response.ts`
- `src/core/types/responses/list-parties-response.ts`
- `src/core/types/responses/grant-user-rights-response.ts`
- `src/core/types/responses/upload-package-response.ts`
- `src/core/types/responses/query-contracts-response.ts`
- `src/core/types/responses/submit-command-response.ts`
- `src/core/types/responses/health-status-response.ts`

These should be replaced progressively with gRPC-shaped names such as:

- `get-ledger-api-version-request.ts`
- `get-ledger-api-version-response.ts`
- `allocate-party-request.ts`
- `allocate-party-response.ts`
- `list-known-parties-request.ts`
- `list-known-parties-response.ts`
- `grant-user-rights-request.ts` (name likely stays)
- `upload-dar-file-request.ts`
- `upload-dar-file-response.ts`
- command-service-aligned request and response names
- update/state/event-query-aligned request and observer names

### Transport layer

- Modify: `src/core/transports/transport.interface.ts`
  - Replace invented transport methods with gRPC-shaped methods.
- Modify: `src/transports/grpc/grpc-transport.ts`
  - Implement the new method names.
- Modify: `src/transports/json/json-transport.ts`
  - Implement or reject methods based on gRPC-semantic fit.

### Tests and docs

- Modify: `tests/unit/**`
- Modify: `tests/contract/**`
- Modify: `tests/integration/**`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`
- Add or modify package-surface tests to assert the new export map

This plan assumes all public documentation and tests will be rewritten to the new surface and the old names will be removed entirely.

### Canonical Initial Mapping

The first implemented service and method mapping should be:

- `system.getHealthAsync()` -> `versionService.getLedgerApiVersionAsync()`
- `parties.createAsync()` -> `partyManagementService.allocatePartyAsync()`
- `parties.listAsync()` -> `partyManagementService.listKnownPartiesAsync()`
- `users.grantRightsAsync()` -> `userManagementService.grantUserRightsAsync()`
- `packages.uploadAsync()` -> `packageManagementService.uploadDarFileAsync()`
- `contracts.queryAsync()` -> reassess under `stateService`, `eventQueryService`, or `contractService` before renaming
- `contracts.streamQueryAsync()` -> reassess under `eventQueryService` or `stateService` before renaming
- `events.streamTransactionsAsync()` -> `updateService.getUpdatesAsync()` or another exact `UpdateService` method chosen from the protobuf surface
- `commands.submitAsync()` -> choose `commandService.submitAndWaitAsync()` or `commandSubmissionService.submitAsync()` as the canonical public path, then move current behavior there

Do not guess on the contract/query/update/command naming. Verify the target protobuf method first before implementation.

### Task 1: Freeze The New Public Service Map

**Files:**
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Modify: `src/grpc/index.ts`
- Modify: `src/json/index.ts`
- Create: placeholder service client files under `src/services/`
- Test: `tests/unit/smoke/package-shape.test.ts`
- Test: add or modify a root client construction/export test under `tests/unit/client/`

- [ ] **Step 1: Write the failing export and client-surface tests**

Add tests that assert:

- `CantonClient` exposes `versionService`, `partyManagementService`, `userManagementService`, `packageManagementService`, `commandService`, `commandSubmissionService`, `stateService`, `updateService`, `eventQueryService`, `contractService`, and `commandCompletionService`
- old properties like `system`, `parties`, `users`, `packages`, `contracts`, `events`, and `commands` are absent from the documented public surface
- the root package exports the new client/type names needed for the migrated services

Example assertion shape:

```ts
const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        endpoint: "http://localhost:7575",
    }),
);

expect(client).toHaveProperty("versionService");
expect(client).toHaveProperty("partyManagementService");
expect(client).not.toHaveProperty("system");
expect(client).not.toHaveProperty("parties");
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/unit/smoke/package-shape.test.ts tests/unit/client/canton-client-construction.test.ts`
Expected: FAIL because the new service names do not exist yet.

- [ ] **Step 3: Add placeholder service clients and wire them into the root client**

Create focused placeholder clients for the target public service map.

Each placeholder client should:

- accept `ITransport` in its constructor
- expose the target gRPC-shaped methods as async methods
- throw `NotSupportedError` or `TransportError` until implemented

Example placeholder shape:

```ts
export class VersionServiceClient {
    public constructor(private readonly transport: ITransport) {
        void this.transport;
    }

    public getLedgerApiVersionAsync(): Promise<GetLedgerApiVersionResponse> {
        return this.transport.getLedgerApiVersionAsync();
    }
}
```

Wire the new service clients into `createServiceRegistry(...)` and `CantonClient`.

- [ ] **Step 4: Update root and protocol-specific exports**

Export the new service clients and any new request/response types required by the first migrated services.

Remove or stop exporting old domain-grouped service clients from the main package surface once replacements exist.

- [ ] **Step 5: Run tests to verify the surface passes**

Run: `npm test -- tests/unit/smoke/package-shape.test.ts tests/unit/client/canton-client-construction.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/client/canton-client.ts src/client/service-registry.ts src/index.ts src/grpc/index.ts src/json/index.ts src/services tests/unit/smoke/package-shape.test.ts tests/unit/client/canton-client-construction.test.ts
git commit -m "feat: add grpc-shaped root service surface"
```

### Task 2: Migrate VersionService, PartyManagementService, UserManagementService, And PackageManagementService

**Files:**
- Create: `src/core/types/requests/get-ledger-api-version-request.ts`
- Create: `src/core/types/responses/get-ledger-api-version-response.ts`
- Create: `src/core/types/requests/allocate-party-request.ts`
- Create: `src/core/types/responses/allocate-party-response.ts`
- Create: `src/core/types/requests/list-known-parties-request.ts`
- Create: `src/core/types/responses/list-known-parties-response.ts`
- Create or rename: package-management and user-management aligned request/response files
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/services/version/version-service-client.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/services/user-management/user-management-service-client.ts`
- Modify: `src/services/package-management/package-management-service-client.ts`
- Modify: mapper files currently handling these operations
- Test: current unit/contract/integration tests for system, parties, users, packages

- [ ] **Step 1: Write the failing renamed service tests**

Rewrite the current tests so they use only:

- `versionService.getLedgerApiVersionAsync()`
- `partyManagementService.allocatePartyAsync()`
- `partyManagementService.listKnownPartiesAsync()`
- `userManagementService.grantUserRightsAsync()`
- `packageManagementService.uploadDarFileAsync()`

Do not preserve tests for the old method names.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
npm test -- tests/unit/json/json-system-client.test.ts tests/unit/grpc/grpc-system-client.test.ts tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/contract/shared/operational-services.json.contract.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts
```

Expected: FAIL due to missing service and method names.

- [ ] **Step 3: Rename the transport contract for these operations**

Replace invented methods in `ITransport`:

- `getHealthAsync()` -> `getLedgerApiVersionAsync()`
- `createPartyAsync()` -> `allocatePartyAsync()`
- `listPartiesAsync()` -> `listKnownPartiesAsync()`
- `uploadPackageAsync()` -> `uploadDarFileAsync()`

Keep `grantUserRightsAsync()` if it already matches the gRPC method name.

- [ ] **Step 4: Implement the renamed service clients and type mappings**

Rename or replace the public request and response types so the new services consume gRPC-shaped names.

Example:

```ts
public allocatePartyAsync(
    request: AllocatePartyRequest,
): Promise<AllocatePartyResponse> {
    return this.transport.allocatePartyAsync(request);
}
```

Update the JSON and gRPC transports to implement the renamed methods using the same underlying behavior they already support.

- [ ] **Step 5: Rewrite docs and exports for these migrated services**

Update:

- `src/index.ts`
- `README.md`
- `DOCUMENTATION.md`

to only mention the new names for these operations.

- [ ] **Step 6: Run tests to verify the migrated services pass**

Re-run the targeted test set from Step 2 plus any export-surface tests.

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/core src/services src/transports src/index.ts README.md DOCUMENTATION.md tests
git commit -m "refactor: align version party user and package services"
```

### Task 3: Decide And Migrate The Command Surface

**Files:**
- Inspect and modify: `src/services/commands/command-submission-pipeline.ts`
- Create: `src/services/command/command-service-client.ts`
- Create: `src/services/command-submission/command-submission-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify or replace: `src/core/types/requests/submit-command-request.ts`
- Modify or replace: `src/core/types/responses/submit-command-response.ts`
- Test: command unit, contract, and integration tests

- [ ] **Step 1: Choose the canonical public command method from the protobuf surface**

Before coding, verify whether the current behavior most honestly maps to:

- `CommandService.submitAndWait(...)`, or
- `CommandSubmissionService.submit(...)`

Pick one as the primary migrated implementation and document why in code comments or the commit message.

- [ ] **Step 2: Write the failing tests against the chosen gRPC-shaped service**

If choosing `CommandService`, write tests such as:

```ts
await client.commandService.submitAndWaitAsync(request);
```

If choosing `CommandSubmissionService`, write tests such as:

```ts
await client.commandSubmissionService.submitAsync(request);
```

Also add tests for whichever sibling service exists only as a placeholder in this phase.

- [ ] **Step 3: Run tests to verify they fail**

Run the command-related test files only.

Expected: FAIL because the new service/method names are not fully wired.

- [ ] **Step 4: Implement the chosen command migration minimally**

Move the current command submission pipeline under the chosen new service client and rename transport methods if needed.

Examples:

- `submitCommandAsync(...)` -> `submitAndWaitAsync(...)`
- or `submitCommandAsync(...)` -> `submitAsync(...)`

Preserve external signing behavior only where it is still semantically valid under the chosen gRPC method.

- [ ] **Step 5: Add placeholder behavior for the sibling command service**

If `CommandService` becomes real first, keep `CommandSubmissionService` present and unsupported until implemented, or vice versa.

- [ ] **Step 6: Run the command test set to verify pass**

Run the targeted command unit, contract, and integration tests.

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/services src/core src/transports tests README.md DOCUMENTATION.md
git commit -m "refactor: align command services to grpc api"
```

### Task 4: Decide And Migrate State, Update, EventQuery, And Contract Reads

**Files:**
- Create: `src/services/state/state-service-client.ts`
- Create: `src/services/update/update-service-client.ts`
- Create: `src/services/event-query/event-query-service-client.ts`
- Create: `src/services/contract/contract-service-client.ts`
- Modify or replace:
  - `src/core/types/requests/query-contracts-request.ts`
  - `src/core/types/requests/stream-query-request.ts`
  - `src/core/types/requests/stream-transactions-request.ts`
  - `src/core/types/responses/query-contracts-response.ts`
  - `src/services/contracts/contract-observer.interface.ts`
  - `src/services/events/transaction-observer.interface.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Test:
  - `tests/unit/services/contracts-client.test.ts`
  - `tests/unit/services/events-client.test.ts`
  - `tests/contract/shared/ledger-read-services.contract.test.ts`
  - `tests/integration/json/json-transport.integration.test.ts`
  - `tests/integration/grpc/grpc-transport.integration.test.ts`

- [ ] **Step 1: Choose the canonical target methods for each current read surface**

Before renaming, verify the exact protobuf method targets for:

- current point-in-time contract queries
- current JSON query stream behavior
- current gRPC ledger update stream behavior

Use the generated clients for:

- `StateService`
- `UpdateService`
- `EventQueryService`
- `ContractService`

Do not code until each current public method has a decided target or an explicit removal decision.

- [ ] **Step 2: Rewrite the failing tests to the chosen gRPC-shaped services**

Examples could become:

- `client.updateService.getUpdatesAsync(...)`
- `client.eventQueryService.<exactMethod>Async(...)`
- `client.stateService.<exactMethod>Async(...)`

Only use exact protobuf-derived names once the mapping is chosen.

- [ ] **Step 3: Run tests to verify they fail**

Run the targeted ledger-read test set.

Expected: FAIL because the new read services are not implemented yet.

- [ ] **Step 4: Implement the minimal renamed read services**

Move existing behavior to the chosen service clients:

- gRPC update streaming under the `UpdateService`-derived client
- JSON query streaming only if it honestly fits the chosen service/method
- point-in-time query under the service that best matches the current semantics

Reject unsupported transport combinations with `NotSupportedError`.

- [ ] **Step 5: Remove old contracts/events service exports**

Once the new services pass, remove the old client files from the public export surface.

- [ ] **Step 6: Run the targeted ledger-read tests to verify pass**

Run the test set from Step 3.

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/services src/core src/transports src/index.ts tests README.md DOCUMENTATION.md
git commit -m "refactor: align read services to grpc api"
```

### Task 5: Remove The Old Surface And Rewrite All Public Documentation

**Files:**
- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`
- Modify: all public-facing tests under `tests/unit`, `tests/contract`, and `tests/integration`
- Delete or stop exporting obsolete domain-grouped service client files

- [ ] **Step 1: Write the failing absence tests**

Add or update tests to assert that old public names are gone from the package surface.

Examples:

```ts
expect(indexModule).not.toHaveProperty("SystemClient");
expect(indexModule).not.toHaveProperty("PartiesClient");
```

- [ ] **Step 2: Run tests to verify they fail if old exports still remain**

Run the export/package-surface tests.

Expected: FAIL until the old names are fully removed.

- [ ] **Step 3: Remove old exports, examples, and docs**

Delete or stop exporting:

- `SystemClient`
- `PartiesClient`
- `UsersClient`
- `PackagesClient`
- `ContractsClient`
- `EventsClient`
- `CommandsClient`

Rewrite docs so they teach only the new gRPC-shaped service map and method names.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run build
npm run lint
npm test
```

Expected: all commands PASS

- [ ] **Step 5: Commit**

```bash
git add src README.md DOCUMENTATION.md tests
git commit -m "refactor: remove legacy sdk surface"
```

### Task 6: Final Surface Audit

**Files:**
- Review: `src/index.ts`
- Review: `README.md`
- Review: `DOCUMENTATION.md`
- Review: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Audit the final public export surface against the spec**

Confirm the final package surface reflects the service list in:

- `docs/superpowers/specs/2026-07-03-grpc-ledger-api-alignment-design.md`

Check that no removed names remain in docs or package exports.

- [ ] **Step 2: Run a final targeted grep**

Run:

```bash
rg -n "getHealthAsync|system\\.|parties\\.|users\\.|packages\\.|contracts\\.|events\\.|commands\\." src README.md DOCUMENTATION.md tests
```

Expected: no matches in the public surface except historical design docs or intentionally preserved internal comments that still need cleanup.

- [ ] **Step 3: Commit any final cleanup**

```bash
git add src README.md DOCUMENTATION.md tests
git commit -m "chore: finalize grpc api surface cleanup"
```
