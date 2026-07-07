# Live CN Quickstart Integration Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated live integration suite that validates the public `CantonClient` against an already-running CN quickstart localnet, uses real SDK writes to seed meaningful reads, and records explicit coverage status for the full public SDK surface.

**Architecture:** Add a small `tests/live` runtime layer that loads quickstart-friendly endpoint defaults, creates real `CantonClient` instances for `grpc` and `json`, fails fast on connectivity problems, and caches seeded live context for downstream service specs. Keep the live suite honest by testing only through public SDK surfaces, and pair it with a machine-readable coverage matrix that classifies every public function as covered, transport-specific, or intentionally deferred with a reason.

**Tech Stack:** TypeScript, Vitest, existing public `CantonClient`, CN quickstart localnet, `@distrohelena/linter`

---

## File Structure

### Live runner and environment model

- Create: `tests/live/fixtures/live-endpoint-defaults.ts`
- Create: `tests/live/runtime/live-test-environment.ts`
- Create: `tests/live/runtime/live-client-factory.ts`
- Create: `tests/live/runtime/live-connectivity-preflight.ts`
- Create: `tests/live/specs/live-connectivity.test.ts`
- Modify: `package.json`
- Modify: `README.md`

### Coverage matrix and validation

- Create: `tests/live/coverage/canton-client-live-coverage.ts`
- Create: `tests/live/coverage/canton-client-live-coverage.test.ts`

### Seeded live context and reusable scenarios

- Create: `tests/live/assets/sdk-live-test-model.dar`
- Create: `tests/live/scenarios/read-live-dar-bytes.ts`
- Create: `tests/live/scenarios/seed-live-context.ts`
- Create: `tests/live/runtime/live-seeded-context.ts`
- Create: `tests/live/specs/live-seeded-context.test.ts`

### Service-level live specs

- Create: `tests/live/specs/live-system-services.test.ts`
- Create: `tests/live/specs/live-party-management.test.ts`
- Create: `tests/live/specs/live-package-management.test.ts`
- Create: `tests/live/specs/live-package-services.test.ts`
- Create: `tests/live/specs/live-participant-services.test.ts`

## Task 1: Add The Live Runner, Endpoint Defaults, And Fail-Fast Connectivity Harness

**Files:**
- Create: `tests/live/fixtures/live-endpoint-defaults.ts`
- Create: `tests/live/runtime/live-test-environment.ts`
- Create: `tests/live/runtime/live-client-factory.ts`
- Create: `tests/live/runtime/live-connectivity-preflight.ts`
- Create: `tests/live/specs/live-connectivity.test.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write the failing live connectivity spec**

Add a live test that expects the harness to:

```ts
const grpcEnvironment = createLiveTestEnvironment({
    transportKind: TransportKind.grpc,
});

await expect(
    assertLiveConnectivityAsync(grpcEnvironment),
).resolves.toBeUndefined();

const jsonEnvironment = createLiveTestEnvironment({
    transportKind: TransportKind.json,
});

await expect(
    assertLiveConnectivityAsync(jsonEnvironment),
).resolves.toBeUndefined();
```

The spec should also assert the default transport assumptions:
- gRPC local defaults use:
  - `ledgerEndpoint = "http://localhost:6865"`
  - `ledgerAdminEndpoint = "http://localhost:8080"`
  - `participantAdminEndpoint = "http://localhost:8081"`
  - `grpcChannelSecurity = GrpcChannelSecurity.insecure`
- JSON local defaults use:
  - `ledgerEndpoint = "http://localhost:7575"`
  - `ledgerAdminEndpoint = "http://localhost:7575"`
  - `participantAdminEndpoint = undefined`

- [ ] **Step 2: Run the focused live connectivity spec to verify it fails**

Run:

```bash
rtk npm test -- tests/live/specs/live-connectivity.test.ts
```

Expected:

- `FAIL`
- missing live runtime helpers and `test:live` script

- [ ] **Step 3: Add the live environment loader, client factory, connectivity preflight, and runner script**

Implement:
- environment resolution with env var overrides:
  - `SDK_TEST_LEDGER_ENDPOINT`
  - `SDK_TEST_LEDGER_ADMIN_ENDPOINT`
  - `SDK_TEST_PARTICIPANT_ADMIN_ENDPOINT`
- `CantonClient` construction for `grpc` and `json`
- local quickstart gRPC defaults using `GrpcChannelSecurity.insecure`
- fast timeouts such as:
  - `defaultRequestTimeoutMs = 5_000`
  - `grpcConnectTimeoutMs = 3_000`
- a dedicated `test:live` script:

```json
{
    "test:live": "vitest run tests/live"
}
```

The connectivity preflight should:
- create real public clients
- call `versionService.getLedgerApiVersionAsync()` on both transports
- call `healthService.checkAsync()` on the gRPC client
- abort immediately with a clear error if any required endpoint is unreachable

- [ ] **Step 4: Update README with live-suite prerequisites and command usage**

Document:
- CN quickstart must already be running
- the suite fails fast when the node is unreachable
- default endpoints and the three override env vars
- `npm run test:live`

- [ ] **Step 5: Run the focused live connectivity spec to verify it passes**

Run:

```bash
rtk npm test -- tests/live/specs/live-connectivity.test.ts
```

Expected:

- `PASS` when local quickstart is running
- immediate hard failure when it is not

- [ ] **Step 6: Commit**

```bash
git add tests/live/fixtures/live-endpoint-defaults.ts tests/live/runtime/live-test-environment.ts tests/live/runtime/live-client-factory.ts tests/live/runtime/live-connectivity-preflight.ts tests/live/specs/live-connectivity.test.ts package.json README.md
git commit -m "test: add live quickstart connectivity harness"
```

## Task 2: Add A Machine-Readable Coverage Matrix For The Full Public `CantonClient` Surface

**Files:**
- Create: `tests/live/coverage/canton-client-live-coverage.ts`
- Create: `tests/live/coverage/canton-client-live-coverage.test.ts`

- [ ] **Step 1: Write the failing coverage matrix validation test**

Add a validation test that requires:

```ts
expect(cantonClientLiveCoverage.length).toBeGreaterThan(0);
expect(
    cantonClientLiveCoverage.find(
        (entry) =>
            entry.member === "versionService.getLedgerApiVersionAsync",
    ),
).toMatchObject({
    status: "covered",
    transports: ["grpc", "json"],
});
```

The test should also verify:
- no duplicate `member` values
- every entry has a valid `status`
- non-covered entries always include `reason`
- the matrix includes representative deferred entries such as:
  - `topologyManagerReadService.listPartyToParticipantAsync`
  - `commandService.submitAndWaitAsync`
  - `stateService.getActiveContractsPageAsync`

- [ ] **Step 2: Run the focused coverage matrix test to verify it fails**

Run:

```bash
rtk npm test -- tests/live/coverage/canton-client-live-coverage.test.ts
```

Expected:

- `FAIL`
- missing coverage matrix file

- [ ] **Step 3: Add the public live coverage matrix**

Implement a machine-readable structure such as:

```ts
export const cantonClientLiveCoverage = [
    {
        member: "versionService.getLedgerApiVersionAsync",
        transports: ["grpc", "json"],
        status: "covered",
    },
    {
        member: "healthService.checkAsync",
        transports: ["grpc"],
        status: "covered",
    },
    {
        member: "commandService.submitAndWaitAsync",
        transports: ["grpc", "json"],
        status: "deferred-needs-domain-setup",
        reason: "Phase 2 requires a DAR-backed command workflow.",
    },
];
```

The initial matrix should classify every current public function on:
- `CantonClient`
- its service clients
- `disposeAsync`

Expected phase-1 classifications:
- `covered`
  - `versionService.getLedgerApiVersionAsync`
  - `healthService.checkAsync`
  - `partyManagementService.allocatePartyAsync`
  - `partyManagementService.listKnownPartiesAsync`
  - `packageManagementService.uploadDarFileAsync`
  - `packageService.listPackagesAsync`
  - `packageService.getPackageAsync`
  - `packageService.getPackageStatusAsync`
  - `participantPackageService.listPackagesAsync`
  - `participantPackageService.getPackageContentsAsync`
  - `participantPackageService.getPackageReferencesAsync`
  - `participantStatusService.getParticipantStatusAsync`
  - `disposeAsync`
- `deferred-needs-write-path` or `deferred-needs-domain-setup`
  - topology reads
  - command/state/update/event/contract flows
  - user-rights flows that need a reliable user-creation/setup path
  - surfaces such as `listVettedPackagesAsync` if upload alone is not enough to make the result meaningful on quickstart

- [ ] **Step 4: Run the focused coverage matrix test to verify it passes**

Run:

```bash
rtk npm test -- tests/live/coverage/canton-client-live-coverage.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add tests/live/coverage/canton-client-live-coverage.ts tests/live/coverage/canton-client-live-coverage.test.ts
git commit -m "test: add live sdk coverage matrix"
```

## Task 3: Add Seeded Live Context And A Real DAR Fixture

**Files:**
- Create: `tests/live/assets/sdk-live-test-model.dar`
- Create: `tests/live/scenarios/read-live-dar-bytes.ts`
- Create: `tests/live/scenarios/seed-live-context.ts`
- Create: `tests/live/runtime/live-seeded-context.ts`
- Create: `tests/live/specs/live-seeded-context.test.ts`

- [ ] **Step 1: Write the failing seeded-context spec**

Add a live spec that expects a shared seeded context to:

```ts
const context = await getLiveSeededContextAsync();

expect(context.grpcAllocatedParty).toMatchObject({
    identifier: expect.stringContaining("sdk-live-party-"),
});
expect(context.jsonAllocatedParty).toMatchObject({
    identifier: expect.stringContaining("sdk-live-party-"),
});
expect(context.uploadedDarBytes.length).toBeGreaterThan(0);
expect(context.packageIds.length).toBeGreaterThan(0);
```

The seeded context should cache its work so repeated access does not reallocate parties or reread the DAR asset.

- [ ] **Step 2: Run the focused seeded-context spec to verify it fails**

Run:

```bash
rtk npm test -- tests/live/specs/live-seeded-context.test.ts
```

Expected:

- `FAIL`
- missing seeded context and live DAR fixture

- [ ] **Step 3: Add the real live seed scenario**

Implement:
- a committed minimal DAR fixture at `tests/live/assets/sdk-live-test-model.dar`
- a helper that reads its bytes into `Uint8Array`
- a seed scenario that creates:
  - one gRPC-allocated party
  - one JSON-allocated party
  - one gRPC DAR upload
  - one JSON DAR upload

Use public SDK writes only, for example:

```ts
const allocatedParty = await client.partyManagementService.allocatePartyAsync(
    new AllocatePartyRequest({
        partyIdHint: `sdk-live-party-${runId}`,
        displayName: `sdk-live-party-${runId}`,
    }),
);

await client.packageManagementService.uploadDarFileAsync(
    new UploadDarFileRequest({
        bytes: uploadedDarBytes,
    }),
);
```

For package-id discovery:
- capture `packageService.listPackagesAsync()` before and after the first successful upload
- compute the added package IDs from the diff
- store those package IDs in the seeded context for downstream read tests

Do not hardcode package IDs in the plan implementation.

- [ ] **Step 4: Run the focused seeded-context spec to verify it passes**

Run:

```bash
rtk npm test -- tests/live/specs/live-seeded-context.test.ts
```

Expected:

- `PASS`
- package IDs discovered from real live state

- [ ] **Step 5: Commit**

```bash
git add tests/live/assets/sdk-live-test-model.dar tests/live/scenarios/read-live-dar-bytes.ts tests/live/scenarios/seed-live-context.ts tests/live/runtime/live-seeded-context.ts tests/live/specs/live-seeded-context.test.ts
git commit -m "test: add seeded live quickstart context"
```

## Task 4: Add Live Specs For System, Party Management, And Disposal Behavior

**Files:**
- Create: `tests/live/specs/live-system-services.test.ts`
- Create: `tests/live/specs/live-party-management.test.ts`

- [ ] **Step 1: Write the failing live system and party specs**

Add service-level tests that:

```ts
await expect(
    grpcClient.versionService.getLedgerApiVersionAsync(),
).resolves.toBeDefined();

await expect(
    jsonClient.versionService.getLedgerApiVersionAsync(),
).resolves.toBeDefined();

await expect(
    grpcClient.healthService.checkAsync(
        new HealthCheckRequest({
            service: "grpc.health.v1.Health",
        }),
    ),
).resolves.toBeDefined();

await expect(
    grpcClient.partyManagementService.listKnownPartiesAsync(
        new ListKnownPartiesRequest({
            filterParty: seeded.grpcAllocatedParty.identifier,
        }),
    ),
).resolves.toBeDefined();
```

The party-management tests should verify:
- gRPC allocation succeeds
- JSON allocation succeeds
- each transport can list the party it created
- the seeded party IDs are visible in readback results

Also add a disposal test using a real live client:

```ts
await grpcClient.disposeAsync();
await expect(grpcClient.disposeAsync()).resolves.toBeUndefined();
await expect(
    grpcClient.versionService.getLedgerApiVersionAsync(),
).rejects.toThrow();
```

- [ ] **Step 2: Run the focused live system and party specs to verify they fail**

Run:

```bash
rtk npm test -- tests/live/specs/live-system-services.test.ts tests/live/specs/live-party-management.test.ts
```

Expected:

- `FAIL`
- missing live specs or missing seeded-context wiring

- [ ] **Step 3: Implement the live system and party specs**

Use shared runtime helpers to:
- create one gRPC client and one JSON client per suite
- reuse the seeded context
- assert real response properties instead of only `toBeDefined()`

Examples:
- version response has a non-empty version string
- health response is `serving`
- known-party listing contains the seeded party identifier

Keep assertions narrow and stable. Do not assert the full quickstart world state.

- [ ] **Step 4: Run the focused live system and party specs to verify they pass**

Run:

```bash
rtk npm test -- tests/live/specs/live-system-services.test.ts tests/live/specs/live-party-management.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add tests/live/specs/live-system-services.test.ts tests/live/specs/live-party-management.test.ts
git commit -m "test: add live system and party management coverage"
```

## Task 5: Add Live Specs For Package Management, Package Reads, And Participant Services

**Files:**
- Create: `tests/live/specs/live-package-management.test.ts`
- Create: `tests/live/specs/live-package-services.test.ts`
- Create: `tests/live/specs/live-participant-services.test.ts`

- [ ] **Step 1: Write the failing live package and participant specs**

Add tests that exercise:
- `packageManagementService.uploadDarFileAsync()` on both `grpc` and `json`
- `packageService.listPackagesAsync()` on `grpc`
- `packageService.getPackageAsync()` on `grpc`
- `packageService.getPackageStatusAsync()` on `grpc`
- `participantPackageService.listPackagesAsync()` on `grpc`
- `participantPackageService.getPackageContentsAsync()` on `grpc`
- `participantPackageService.getPackageReferencesAsync()` on `grpc`
- `participantStatusService.getParticipantStatusAsync()` on `grpc`

Example assertions:

```ts
const packages = await grpcClient.packageService.listPackagesAsync(
    new ListPackagesRequest(),
);

expect(packages.packageIds).toEqual(
    expect.arrayContaining(seeded.packageIds),
);

const firstPackage = await grpcClient.packageService.getPackageAsync(
    new GetPackageRequest({
        packageId: seeded.packageIds[0],
    }),
);

expect(firstPackage.archivePayload.length).toBeGreaterThan(0);
```

The participant-package tests should not rely on global quickstart package names. They should use the package IDs discovered in the seeded context.

- [ ] **Step 2: Run the focused package and participant specs to verify they fail**

Run:

```bash
rtk npm test -- tests/live/specs/live-package-management.test.ts tests/live/specs/live-package-services.test.ts tests/live/specs/live-participant-services.test.ts
```

Expected:

- `FAIL`
- missing package/participant live specs or missing seeded package IDs

- [ ] **Step 3: Implement the live package and participant specs**

Implementation notes:
- prove `uploadDarFileAsync()` succeeds on both transports
- use the gRPC package-read surfaces for meaningful package inspection
- if `getPackageStatusAsync()` returns environment-specific enum details, assert stable package-specific facts rather than a fragile exact full object
- cover `participantStatusService.getParticipantStatusAsync()` with stable assertions such as:
  - `status?.uid` is non-empty
  - `status?.version` is non-empty
  - `status?.active` is `true`

If `listVettedPackagesAsync()` is not made meaningful by the seeded setup alone, leave it deferred in the coverage matrix rather than adding a weak assertion.

- [ ] **Step 4: Run the focused package and participant specs to verify they pass**

Run:

```bash
rtk npm test -- tests/live/specs/live-package-management.test.ts tests/live/specs/live-package-services.test.ts tests/live/specs/live-participant-services.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Run the full live suite and repository verification**

Run:

```bash
rtk npm run test:live
rtk npm run lint
rtk npm run build
rtk npm test
```

Expected:

- live suite passes against the already-running quickstart localnet
- lint passes
- build passes
- existing test suite remains green

- [ ] **Step 6: Commit**

```bash
git add tests/live/specs/live-package-management.test.ts tests/live/specs/live-package-services.test.ts tests/live/specs/live-participant-services.test.ts
git commit -m "test: add live package and participant coverage"
```
