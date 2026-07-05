# Split Ledger And Admin Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single SDK `endpoint` option with separate `ledgerEndpoint` and `adminEndpoint` settings, route public services by API surface, support per-surface gRPC security overrides, and document which services belong to which endpoint.

**Architecture:** Keep one public `CantonClient`, but build two endpoint-bound transport contexts internally: one for ledger services and one for participant-admin services. Missing surfaces are represented by placeholder transports that throw a dedicated SDK error lazily on first use. gRPC transport creation resolves channel security per surface through a shared-default-plus-override model, while JSON reuses the same surface split without any security changes.

**Tech Stack:** TypeScript, Vitest, existing SDK service registry, existing gRPC/json transport factories, protobuf-ts

---

## File Structure

### Public options and missing-endpoint error surface

- Modify: `src/client/canton-client-options.ts`
- Create: `src/core/errors/endpoint-not-configured-error.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`
- Modify: `tests/unit/client/not-supported-signing.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

### Service registry split and lazy endpoint failure behavior

- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Create: `tests/unit/client/service-registry-endpoints.test.ts`

### gRPC and JSON surface routing

- Modify: `src/transports/grpc/grpc-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/json/json-transport-factory.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/unit/grpc/grpc-connect-timeout.test.ts`
- Modify: `tests/unit/grpc/grpc-package-services.test.ts`
- Modify: `tests/unit/grpc/grpc-parties-client.test.ts`
- Modify: `tests/unit/json/json-system-client.test.ts`
- Modify: `tests/unit/json/json-parties-client.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`

### Documentation

- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Replace `endpoint` With Split Endpoint Options And Add The New Error Type

**Files:**
- Modify: `src/client/canton-client-options.ts`
- Create: `src/core/errors/endpoint-not-configured-error.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/core/canton-client-options.test.ts`
- Modify: `tests/unit/client/not-supported-signing.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing options and export tests**

Add assertions for the new public options shape:

```ts
const options = new CantonClientOptions({
    transportKind: TransportKind.grpc,
    ledgerEndpoint: "https://ledger.example.com",
    adminEndpoint: "https://admin.example.com",
    grpcChannelSecurity: GrpcChannelSecurity.tls,
    adminGrpcChannelSecurity: GrpcChannelSecurity.insecure,
});

expect(options.ledgerEndpoint).toBe("https://ledger.example.com");
expect(options.adminEndpoint).toBe("https://admin.example.com");
expect(options.grpcChannelSecurity).toBe(GrpcChannelSecurity.tls);
expect(options.adminGrpcChannelSecurity).toBe(
    GrpcChannelSecurity.insecure,
);
```

Also add root-export coverage for:

```ts
expect(EndpointNotConfiguredError).toBeTypeOf("function");
```

And rewrite any `CantonClientOptions` construction in the touched tests to use `ledgerEndpoint` or `adminEndpoint` explicitly instead of `endpoint`.

- [ ] **Step 2: Run the focused public-surface tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/client/not-supported-signing.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- `ledgerEndpoint` and `adminEndpoint` do not exist yet
- `adminGrpcChannelSecurity` and `ledgerGrpcChannelSecurity` do not exist yet
- `EndpointNotConfiguredError` is not exported yet

- [ ] **Step 3: Implement the new options shape and error type**

Update `CantonClientOptions` to:

- remove `endpoint`
- add `ledgerEndpoint?: string`
- add `adminEndpoint?: string`
- add `ledgerGrpcChannelSecurity?: GrpcChannelSecurity`
- add `adminGrpcChannelSecurity?: GrpcChannelSecurity`
- keep `grpcChannelSecurity`, `defaultRequestTimeoutMs`, `grpcConnectTimeoutMs`, `authProvider`, and `commandSigner` shared

Add `EndpointNotConfiguredError` as an SDK-owned error extending the existing error hierarchy.

Export the new error from the root package.

- [ ] **Step 4: Run the focused public-surface tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/client/not-supported-signing.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/client/canton-client-options.ts src/core/errors/endpoint-not-configured-error.ts src/index.ts tests/unit/core/canton-client-options.test.ts tests/unit/client/not-supported-signing.test.ts tests/unit/smoke/package-shape.test.ts
git commit -m "feat: add split ledger and admin client options"
```

## Task 2: Split Service Construction By Surface And Fail Lazily On Missing Endpoints

**Files:**
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Create: `tests/unit/client/service-registry-endpoints.test.ts`

- [ ] **Step 1: Write the failing routing and lazy-failure tests**

Add a new focused service-registry test file that verifies:

- ledger services are constructed from the ledger transport
- admin services are constructed from the admin transport
- `CantonClient` still constructs when only one endpoint is configured
- calls on a missing surface fail lazily with `EndpointNotConfiguredError`

Example assertion shape:

```ts
const client = new CantonClient(
    new CantonClientOptions({
        transportKind: TransportKind.json,
        ledgerEndpoint: "https://ledger.example.com",
    }),
);

await expect(
    client.partyManagementService.listKnownPartiesAsync(
        new ListKnownPartiesRequest(),
    ),
).rejects.toThrow(EndpointNotConfiguredError);
```

Also add assertions that service instances still exist on the client even when the underlying endpoint is absent.

- [ ] **Step 2: Run the focused routing tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts
```

Expected:

- `FAIL`
- service construction still assumes one shared transport
- missing-surface calls do not raise the dedicated endpoint error yet

- [ ] **Step 3: Split the service registry into ledger and admin transport contexts**

Refactor `createServiceRegistry(...)` so it:

- builds a ledger-bound transport when `ledgerEndpoint` is configured
- builds an admin-bound transport when `adminEndpoint` is configured
- builds a dedicated missing-endpoint placeholder transport per surface when the endpoint is absent
- binds services literally by surface

Target binding:

- ledger: `versionService`, `healthService`, `packageService`, `commandService`, `commandSubmissionService`, `commandCompletionService`, `stateService`, `updateService`, `eventQueryService`, `contractService`
- admin: `partyManagementService`, `userManagementService`, `participantPackageService`

The missing-endpoint placeholder must throw `EndpointNotConfiguredError` with a message that names both the surface and the service.

- [ ] **Step 4: Run the focused routing tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/client/canton-client.ts src/client/service-registry.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts
git commit -m "feat: split sdk service construction by endpoint surface"
```

## Task 3: Route gRPC And JSON Through The Correct Surface Endpoint

**Files:**
- Modify: `src/transports/grpc/grpc-transport-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/json/json-transport-factory.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `tests/unit/grpc/grpc-connect-timeout.test.ts`
- Modify: `tests/unit/grpc/grpc-package-services.test.ts`
- Modify: `tests/unit/grpc/grpc-parties-client.test.ts`
- Modify: `tests/unit/json/json-system-client.test.ts`
- Modify: `tests/unit/json/json-parties-client.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`

- [ ] **Step 1: Write the failing surface-routing transport tests**

Extend the gRPC tests so they prove:

- ledger operations use `ledgerEndpoint`
- admin operations use `adminEndpoint`
- ledger gRPC security resolves via:

```ts
ledgerGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls
```

- admin gRPC security resolves via:

```ts
adminGrpcChannelSecurity ?? grpcChannelSecurity ?? GrpcChannelSecurity.tls
```

Also extend JSON and contract tests so they construct clients with split endpoints and verify:

- ledger JSON calls work with only `ledgerEndpoint`
- admin JSON calls work with only `adminEndpoint`
- unsupported JSON methods still throw `NotSupportedError`

- [ ] **Step 2: Run the focused transport and contract tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts tests/unit/grpc/grpc-package-services.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/unit/json/json-system-client.test.ts tests/unit/json/json-parties-client.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `FAIL`
- gRPC still reads one shared `endpoint`
- JSON still reads one shared `endpoint`
- split-endpoint client construction in tests does not compile or route correctly yet

- [ ] **Step 3: Make both transport factories surface-aware**

Refactor transport creation so the factory inputs are endpoint-specific instead of reading everything from one shared endpoint on `CantonClientOptions`.

Implement:

- gRPC transport creation with explicit surface endpoint and resolved surface security
- JSON transport creation with explicit surface endpoint
- continued support for shared auth provider and request timeout behavior on both surfaces
- continued support for shared gRPC connect timeout behavior

Update the relevant tests and contract fixtures to construct `CantonClientOptions` with the new fields only.

- [ ] **Step 4: Run the focused transport and contract tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts tests/unit/grpc/grpc-package-services.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/unit/json/json-system-client.test.ts tests/unit/json/json-parties-client.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/grpc-transport-factory.ts src/transports/grpc/grpc-transport.ts src/transports/grpc/grpc-channel-factory.ts src/transports/json/json-transport-factory.ts tests/unit/grpc/grpc-channel-factory.test.ts tests/unit/grpc/grpc-connect-timeout.test.ts tests/unit/grpc/grpc-package-services.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/unit/json/json-system-client.test.ts tests/unit/json/json-parties-client.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
git commit -m "feat: route grpc and json surfaces to split endpoints"
```

## Task 4: Document The Surface Split And Re-Verify The SDK End To End

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Write the docs assertions and update plan checklist**

Before editing docs, make a checklist from the approved spec and verify the docs will cover:

- `CantonClientOptions` now uses `ledgerEndpoint` and `adminEndpoint`
- ledger/admin service ownership is explicit
- gRPC security override fallback rules are documented
- examples no longer mention `endpoint`

- [ ] **Step 2: Update the public docs**

Update `README.md` to:

- show `ledgerEndpoint` and `adminEndpoint` in the main example
- describe which services belong to the ledger surface and which belong to the admin surface

Update `DOCUMENTATION.md` to:

- replace the old constructor docs for `endpoint`
- add a dedicated endpoint-surface section
- add an “Endpoint Surface” column to the service map
- document the `ledgerGrpcChannelSecurity` and `adminGrpcChannelSecurity` fallback rules

- [ ] **Step 3: Run the full verification commands**

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

- [ ] **Step 4: Commit**

```bash
git add README.md DOCUMENTATION.md
git commit -m "docs: describe split ledger and admin endpoints"
```

- [ ] **Step 5: Finish the branch work**

After the final commit, verify the working tree is clean:

```bash
rtk git status --short
```

Expected:

- no unexpected tracked changes remain
