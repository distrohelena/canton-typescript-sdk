# Protobuf Test-Suite Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the complete TypeScript SDK test suite pass by finishing stale call-site migrations to generated protobuf-ts messages, without restoring compatibility wrappers or excluding tests.

**Architecture:** Generated protobuf modules remain the only RPC request/response boundary. Repair deterministic failures in three isolated batches (message factories, debugger fixtures, and Active Contracts operation wiring), then migrate the live harness and remove provably dead root DTO exports. Verify live behavior against the existing 3.5.7 localnet without restarting or modifying its checkout.

**Tech Stack:** TypeScript, protobuf-ts 2.11.1, Vitest 3.2.6, Node.js 22, gRPC, JSON Ledger API, Canton Participants 3.5.7 and 3.5.8.

**Design:** `docs/superpowers/specs/2026-07-31-protobuf-test-suite-repair-design.md`

---

## Baseline

The pre-implementation command is:

```bash
rtk ./node_modules/.bin/vitest run --maxWorkers=1 --testTimeout=15000 \
  --reporter=json --outputFile=/tmp/typescript-sdk-test-baseline.json
```

The captured baseline contains 829 tests, 27 failed assertions/setup paths, and
11 pending tests. The 24 failed files are:

```text
tests/contract/shared/operational-services.grpc.contract.test.ts
tests/contract/shared/operational-services.json.contract.test.ts
tests/integration/debugger/ledger-replay-debugger.integration.test.ts
tests/integration/grpc/grpc-transport.integration.test.ts
tests/integration/json/json-transport.integration.test.ts
tests/live/specs/live-connectivity.test.ts
tests/live/specs/live-external-party-management.test.ts
tests/live/specs/live-multi-node-connectivity.test.ts
tests/live/specs/live-package-management.test.ts
tests/live/specs/live-package-services.test.ts
tests/live/specs/live-participant-services.test.ts
tests/live/specs/live-party-management.test.ts
tests/live/specs/live-seeded-context.test.ts
tests/live/specs/live-system-services.test.ts
tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts
tests/unit/grpc/grpc-batch5-read-services.test.ts
tests/unit/grpc/grpc-command-runtime.test.ts
tests/unit/grpc/grpc-system-client.test.ts
tests/unit/json/json-batch3-read-services.test.ts
tests/unit/json/json-batch5-read-services.test.ts
tests/unit/json/json-system-client.test.ts
tests/unit/public/protobuf-rpc-inventory.test.ts
tests/unit/services/participant-party-management-service-client.test.ts
tests/unit/services/pruning-service-client.test.ts
```

Vitest separately reports suite and assertion totals. At capture time the
`canton` container was externally
restarting (`health: starting`), so `UNAVAILABLE` and `fetch failed` live errors
must be reclassified after deterministic request-shape fixes and a read-only
preflight.

## File map

- Generated request/response modules under
  `src/transports/grpc/generated/canton/**` are authoritative and are never
  edited.
- Unit and contract tests construct generated messages with `.create(...)`.
- `src/transports/grpc/grpc-channel-factory.ts` owns internal gRPC operation
  names; `src/transports/grpc/grpc-transport.ts` consumes those operations.
- `docs/protobuf-rpc-inventory.md` must exactly match `ITransport` and
  `GrpcOperations`.
- `tests/live/runtime/live-connectivity-preflight.ts` is the single live
  connectivity gate; downstream live suites should not duplicate legacy request
  construction.
- `src/index.ts` exports SDK-owned abstractions only. Generated messages remain
  public through the package `/protobuf` entry point.

### Task 1: Migrate deterministic service and contract tests to generated factories

**Files:**
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `tests/unit/grpc/grpc-batch5-read-services.test.ts`
- Modify: `tests/unit/json/json-batch3-read-services.test.ts`
- Modify: `tests/unit/json/json-batch5-read-services.test.ts`
- Modify: `tests/unit/grpc/grpc-system-client.test.ts`
- Modify: `tests/unit/json/json-system-client.test.ts`
- Modify: `tests/unit/services/participant-party-management-service-client.test.ts`
- Modify: `tests/unit/services/pruning-service-client.test.ts`

- [ ] **Step 1: Re-run the focused red cluster**

Run:

```bash
rtk ./node_modules/.bin/vitest run \
  tests/contract/shared/operational-services.grpc.contract.test.ts \
  tests/contract/shared/operational-services.json.contract.test.ts \
  tests/unit/grpc/grpc-batch5-read-services.test.ts \
  tests/unit/json/json-batch3-read-services.test.ts \
  tests/unit/json/json-batch5-read-services.test.ts \
  tests/unit/grpc/grpc-system-client.test.ts \
  tests/unit/json/json-system-client.test.ts \
  tests/unit/services/participant-party-management-service-client.test.ts \
  tests/unit/services/pruning-service-client.test.ts
```

Expected: FAIL with `X is not a constructor` and legacy response
`instanceof` assertions.

- [ ] **Step 2: Replace root DTO imports with generated module imports**

Use the exact generated modules already named by the corresponding service
clients:

```ts
import {
    ListPackagesRequest as ParticipantListPackagesRequest,
    GetPackageContentsRequest,
    GetPackageReferencesRequest,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/package_service.js";

import {
    AddPartyAsyncRequest,
    AddPartyAsyncResponse,
    ClearPartyOnboardingFlagRequest,
    ClearPartyOnboardingFlagResponse,
    GetHighestOffsetByTimestampRequest,
    GetHighestOffsetByTimestampResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/party_management_service.js";

import {
    GetSafePruningOffsetRequest,
    GetSafePruningOffsetResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/participant/v30/pruning_service.js";

import {
    GetNoWaitCommitmentsFromRequest,
    GetNoWaitCommitmentsFromResponse,
    GetParticipantScheduleRequest,
    GetParticipantScheduleResponse,
    GetScheduleRequest,
    GetScheduleResponse,
} from "../../../src/transports/grpc/generated/canton/com/digitalasset/canton/admin/pruning/v30/pruning.js";

import { GetLedgerApiVersionResponse } from
    "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/version_service.js";
```

Adjust relative depth for contract tests. Use generated aliases only when two
services expose the same short name.

- [ ] **Step 3: Construct every generated request/response with `.create(...)`**

Representative replacements:

```ts
const request = AddPartyAsyncRequest.create({
    arguments: {
        partyId: "Alice",
        synchronizerId: "sync-1",
        sourceParticipantUid: "participant::source",
        topologySerial: 1,
        participantPermission: GeneratedParticipantPermission.CONFIRMATION,
    },
});

await client.getScheduleAsync(GetScheduleRequest.create(), options);

await client.participantPackageService.listPackagesAsync(
    ParticipantListPackagesRequest.create(),
);
```

Use protobuf timestamps such as `{ seconds: "1767225600", nanos: 0 }`; do not
pass JavaScript `Date` objects into generated messages.

- [ ] **Step 4: Replace legacy class-identity assertions**

Generated protobuf messages are structural values, not class instances. Replace:

```ts
expect(response).toBeInstanceOf(GetLedgerApiVersionResponse);
```

with:

```ts
expect(response).toEqual(GetLedgerApiVersionResponse.create({
    version: "3.4.0",
    features: {},
}));
```

For forwarding tests, assert the exact created object was forwarded with
`toHaveBeenCalledWith(request, options)`.

- [ ] **Step 5: Run the focused cluster to green**

Run the Step 1 command.

Expected: all nine files pass.

- [ ] **Step 6: Commit the deterministic message migration**

```bash
rtk git add tests/contract/shared/operational-services.grpc.contract.test.ts \
  tests/contract/shared/operational-services.json.contract.test.ts \
  tests/unit/grpc/grpc-batch5-read-services.test.ts \
  tests/unit/json/json-batch3-read-services.test.ts \
  tests/unit/json/json-batch5-read-services.test.ts \
  tests/unit/grpc/grpc-system-client.test.ts \
  tests/unit/json/json-system-client.test.ts \
  tests/unit/services/participant-party-management-service-client.test.ts \
  tests/unit/services/pruning-service-client.test.ts
rtk git commit -m "test: migrate service contracts to protobuf factories"
```

### Task 2: Migrate debugger replay fixtures to generated contract/event messages

**Files:**
- Modify: `tests/integration/debugger/ledger-replay-debugger.integration.test.ts`
- Modify: `tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts`

- [ ] **Step 1: Verify the debugger tests fail at module loading**

Run:

```bash
rtk ./node_modules/.bin/vitest run \
  tests/integration/debugger/ledger-replay-debugger.integration.test.ts \
  tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts
```

Expected: FAIL because removed SDK DTO modules such as
`get-contract-response.js` cannot be resolved.

- [ ] **Step 2: Import the generated contract and event-query messages**

```ts
import {
    GetContractRequest,
    GetContractResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/contract_service.js";
import {
    GetEventsByContractIdRequest,
    GetEventsByContractIdResponse,
} from "../../../src/transports/grpc/generated/canton/com/daml/ledger/api/v2/event_query_service.js";
```

Use the additional `../` prefix in the unit test.

- [ ] **Step 3: Convert fixture responses to generated shapes**

Replace SDK constructors with generated factories:

```ts
return GetContractResponse.create({
    createdEvent: {
        contractId: "00abc",
        templateId: {
            packageId: "pkg-main",
            moduleName: "Main",
            entityName: "Vault",
        },
        createArguments: { owner: "Alice" },
    },
});

return GetEventsByContractIdResponse.create({
    created: {
        createdEvent: {
            contractId: "00abc",
            templateId,
            createArguments: { owner: "Alice" },
        },
        synchronizerId: "sync-1",
    },
});
```

Use `GetContractResponse.create()` and
`GetEventsByContractIdResponse.create()` for empty responses. Remove
`ContractCreated` fixture wrappers from these two files.

- [ ] **Step 4: Run the debugger tests to green**

Run the Step 1 command.

Expected: both files pass and exercise the real generated shapes consumed by
`LedgerReplayEnvironmentBuilder`.

- [ ] **Step 5: Commit the debugger migration**

```bash
rtk git add tests/integration/debugger/ledger-replay-debugger.integration.test.ts \
  tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts
rtk git commit -m "test: migrate debugger fixtures to protobuf messages"
```

### Task 3: Remove duplicate Active Contracts operation wiring

**Files:**
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/services/state/state-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `tests/integration/json/json-transport.integration.test.ts`
- Test: `tests/integration/grpc/grpc-transport.integration.test.ts`
- Test: `tests/unit/grpc/grpc-command-runtime.test.ts`
- Test: `tests/unit/public/protobuf-rpc-inventory.test.ts`
- Reference: `docs/protobuf-rpc-inventory.md`

- [ ] **Step 1: Verify the operation/inventory red cluster**

Run:

```bash
rtk ./node_modules/.bin/vitest run \
  tests/integration/grpc/grpc-transport.integration.test.ts \
  tests/integration/json/json-transport.integration.test.ts \
  tests/unit/grpc/grpc-command-runtime.test.ts \
  tests/unit/public/protobuf-rpc-inventory.test.ts
```

Expected: FAIL because `GrpcTransport` calls an unprovided duplicate
`getActiveContractsPageAsync`, the inventory lacks that duplicate operation,
and JSON incorrectly expects the gRPC-only page call to resolve.

- [ ] **Step 2: Consolidate `GrpcOperations` on `queryContractsAsync`**

Delete the optional `getActiveContractsPageAsync` declaration and its duplicate
factory implementation from `grpc-channel-factory.ts`. Change the transport to
the already-inventoried operation:

```ts
return (await this.operations.queryContractsAsync!(
    request,
    options,
)) as GetActiveContractsPageResponse;
```

Do not add a second inventory entry. The existing ITransport entry correctly
maps `getActiveContractsPageAsync` to `GrpcOperations.queryContractsAsync`.

- [ ] **Step 3: Correct JSON support expectations and comments**

Keep `JsonTransport.getActiveContractsPageAsync` unsupported. Update
`StateServiceClient` and `ITransport` comments to say the page operation is
gRPC-only. In the JSON integration test, assert `NotSupportedError` for the page
call and continue testing JSON streaming through `getActiveContractsAsync`.

- [ ] **Step 4: Run the operation/inventory cluster to green**

Run the Step 1 command.

Expected: all four files pass, with the inventory still classifying every
method exactly once.

- [ ] **Step 5: Commit the operation repair**

```bash
rtk git add src/transports/grpc/grpc-channel-factory.ts \
  src/transports/grpc/grpc-transport.ts \
  src/services/state/state-service-client.ts \
  src/core/transports/transport.interface.ts \
  tests/integration/json/json-transport.integration.test.ts
rtk git commit -m "fix: consolidate active contract page operations"
```

### Task 4: Migrate live harnesses and examples to generated messages

**Files:**
- Modify: `tests/live/runtime/live-connectivity-preflight.ts`
- Modify: `tests/live/specs/live-connectivity.test.ts`
- Modify: `tests/live/specs/live-system-services.test.ts`
- Modify: `tests/live/specs/live-participant-services.test.ts`
- Modify: `tests/live/specs/live-multi-node-connectivity.test.ts`
- Verify: `tests/live/specs/live-external-party-management.test.ts`
- Verify: `tests/live/specs/live-package-management.test.ts`
- Verify: `tests/live/specs/live-package-services.test.ts`
- Verify: `tests/live/specs/live-party-management.test.ts`
- Verify: `tests/live/specs/live-seeded-context.test.ts`
- Modify: `tests/live/scenarios/create-live-external-party.ts`
- Modify: `tests/live/scenarios/create-live-multi-host-party-to-participant.ts`
- Modify: `tests/live/fuzz/live-fuzz-fixture.ts`
- Modify: `examples/01-client-initialization.ts`
- Modify: `examples/02-tls-connection.ts`
- Modify: `examples/03-jwt-authentication.ts`
- Modify: `examples/30-decentralized-party-ed25519.ts`

- [ ] **Step 1: Confirm localnet state without mutating it**

Run:

```bash
rtk docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
rtk env PARTICIPANT_358_LEDGER_ENDPOINT=localhost:3901 \
  node node/participant-358-synchronizer.mjs ledger-api-version
rtk env PARTICIPANT_358_LEDGER_ENDPOINT=localhost:8901 \
  PARTICIPANT_358_LEDGER_BEARER_TOKEN="$(<.generated/participant-358/ledger-api-user.token)" \
  node node/participant-358-synchronizer.mjs ledger-api-version
```

Expected before live acceptance: the existing `canton` container is healthy
and the two version commands report `3.5.7` and `3.5.8`, respectively. If
either participant is unavailable, continue deterministic migrations but do
not restart or edit CN quickstart or the SDK-owned sidecar.

- [ ] **Step 2: Reproduce the smallest live serialization failures**

Run:

```bash
rtk ./node_modules/.bin/vitest run \
  tests/live/specs/live-connectivity.test.ts \
  tests/live/specs/live-system-services.test.ts \
  --maxWorkers=1 --testTimeout=15000
```

Expected with a reachable participant: FAIL with request serialization errors
for health or user management. `UNAVAILABLE` is environmental and must not be
misclassified as a code failure.

- [ ] **Step 3: Replace legacy live requests with generated factories**

Import exact messages from:

```text
.../google/grpc/health/v1/health.js
.../com/daml/ledger/api/v2/admin/party_management_service.js
.../com/daml/ledger/api/v2/admin/user_management_service.js
.../com/digitalasset/canton/admin/participant/v30/participant_status_service.js
.../com/digitalasset/canton/admin/participant/v30/package_service.js
```

Then call, for example:

```ts
HealthCheckRequest.create()
GetParticipantIdRequest.create()
ParticipantStatusRequest.create()
ListUsersRequest.create({ pageSize: 1 })
ParticipantListPackagesRequest.create()
GetPackageContentsRequest.create({ packageId })
```

Apply the same rule to every stale `new XRequest(...)` found by:

```bash
rtk rg -n "new (HealthCheckRequest|GetParticipantIdRequest|GetParticipantStatusRequest|ParticipantListPackagesRequest|GetPackageContentsRequest|GetPackageReferencesRequest|ListUsersRequest)" tests/live examples
```

Expected after editing: no matches.

- [ ] **Step 4: Update participant-status assertions to the generated oneof**

Assert the actual generated response shape:

```ts
expect(response.kind.oneofKind).toBe("status");

if (response.kind.oneofKind !== "status") {
    throw new Error("participant did not return an initialized status");
}

expect(response.kind.status.commonStatus?.uid.length).toBeGreaterThan(0);
expect(response.kind.status.commonStatus?.version.length).toBeGreaterThan(0);
expect(response.kind.status.active).toBe(true);
```

- [ ] **Step 5: Run live preflight and examples compilation**

Run:

```bash
rtk ./node_modules/.bin/vitest run \
  tests/live/specs/live-connectivity.test.ts \
  tests/live/specs/live-system-services.test.ts \
  tests/live/specs/live-participant-services.test.ts \
  tests/live/specs/live-multi-node-connectivity.test.ts \
  tests/live/specs/live-external-party-management.test.ts \
  tests/live/specs/live-package-management.test.ts \
  tests/live/specs/live-package-services.test.ts \
  tests/live/specs/live-party-management.test.ts \
  tests/live/specs/live-seeded-context.test.ts \
  --maxWorkers=1 --testTimeout=15000
rtk npm run examples:check
```

Expected with a healthy localnet: all selected live files and examples compile
pass. If the participant is unavailable, preserve the deterministic test
results and wait for external readiness without changing quickstart.

- [ ] **Step 6: Commit the live generated-message migration**

```bash
rtk git add tests/live/runtime/live-connectivity-preflight.ts \
  tests/live/specs/live-connectivity.test.ts \
  tests/live/specs/live-system-services.test.ts \
  tests/live/specs/live-participant-services.test.ts \
  tests/live/specs/live-multi-node-connectivity.test.ts \
  tests/live/scenarios/create-live-external-party.ts \
  tests/live/scenarios/create-live-multi-host-party-to-participant.ts \
  tests/live/fuzz/live-fuzz-fixture.ts \
  examples/01-client-initialization.ts examples/02-tls-connection.ts \
  examples/03-jwt-authentication.ts examples/30-decentralized-party-ed25519.ts
rtk git commit -m "test: use protobuf messages in live harnesses"
```

### Task 5: Remove obsolete root protobuf DTO exports

**Files:**
- Modify: `src/index.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/grpc/mappers/parties-mapper.ts`
- Modify: `src/services/party-management/decentralized-party-lifecycle.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/grpc/grpc-package-services.test.ts`
- Modify: `tests/unit/grpc/grpc-batch1-read-services.test.ts`
- Modify: `tests/unit/json/json-batch1-read-services.test.ts`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/services/participant-status-service-client.test.ts`
- Modify: `tests/unit/services/participant-package-service-client.test.ts`
- Modify: `tests/unit/debugger/replay/replay-artifact-resolver.test.ts`
- Create: `tests/types/protobuf-first-root-surface.test-d.ts`
- Delete: `src/transports/grpc/mappers/health-mapper.ts`
- Delete: `src/transports/grpc/mappers/participant-status-mapper.ts`
- Delete candidates after zero-usage proof:
  - `src/core/types/health-check-status.ts`
  - `src/core/types/requests/health-check-request.ts`
  - `src/core/types/responses/health-check-response.ts`
  - `src/core/types/requests/get-ledger-api-version-request.ts`
  - `src/core/types/responses/get-ledger-api-version-response.ts`
  - `src/core/types/requests/get-participant-status-request.ts`
  - `src/core/types/responses/get-participant-status-response.ts`
  - `src/core/types/requests/get-participant-id-request.ts`
  - `src/core/types/responses/get-participant-id-response.ts`
  - `src/core/types/requests/get-package-references-request.ts`
  - `src/core/types/responses/get-package-references-response.ts`

- [ ] **Step 1: Add a failing package-surface type fixture**

Create:

```ts
import * as sdk from "@distrohelena/canton-typescript-sdk";
import { comDaml } from "@distrohelena/canton-typescript-sdk/protobuf";

const generated = comDaml.ledger.api.v2.VersionService;
void generated;

// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetLedgerApiVersionResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.HealthCheckRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantStatusRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantIdRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetPackageReferencesRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.HealthCheckResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetLedgerApiVersionRequest;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantStatusResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetParticipantIdResponse;
// @ts-expect-error generated RPC messages are not root SDK constructors
sdk.GetPackageReferencesResponse;
// @ts-expect-error generated RPC enums are not root SDK enums
sdk.HealthCheckStatus;
```

- [ ] **Step 2: Run the type fixture red**

Run:

```bash
rtk npx tsc -p tsconfig.type-tests.json --noEmit
```

Expected: FAIL with unused `@ts-expect-error` directives because the legacy
root symbols still exist.

- [ ] **Step 3: Migrate remaining production and test callers**

Use generated participant-ID types in `service-registry.ts`,
`json-transport.ts`, `decentralized-party-lifecycle.ts`,
`parties-client.test.ts`, both batch-1 read-service tests, and the service
registry endpoint test. Migrate the package and participant-status service
tests to generated request/response factories and structural assertions. In
`parties-mapper.ts`, remove the unused
`mapGrpcGetParticipantIdRequest` and `mapGrpcGetParticipantId` functions and
their legacy imports; the live transport already passes generated participant
ID messages directly. Remove the empty import of
`participant-status-mapper.ts` from `grpc-transport.ts`, then delete that unused
mapper and the unused `health-mapper.ts`.

Migrate `replay-artifact-resolver.test.ts` to the generated participant package
messages already used by `ReplayArtifactResolver`. Generated imports already
present in `service-registry.ts` and `json-transport.ts` for package references,
health, version, and participant status must remain generated; do not replace
them with core DTO imports merely because their short names match.

- [ ] **Step 4: Prove each candidate has no supported caller**

Run `rg` for each candidate symbol across `src`, `tests`, and `examples`,
excluding its candidate file and `src/index.ts`. After the migrations above,
every remaining source occurrence must resolve to a generated-module import.
Remove a candidate only after there is no import from `core/types` and no root
SDK import. Keep SDK-specific high-level request types such as
`AllocatePartyRequest` and `ListKnownPartiesRequest`; those still serve the
shared JSON/gRPC abstraction and are not generated-message aliases.

- [ ] **Step 5: Remove verified exports/files and update package-shape tests**

Delete only the zero-usage candidates above. Remove their `src/index.ts`
exports. Replace package-shape construction with generated `/protobuf` imports
and structural assertions. Do not add aliases or constructor adapters.

- [ ] **Step 6: Run package/type/build checks to green**

Run:

```bash
rtk ./node_modules/.bin/vitest run tests/unit/smoke/package-shape.test.ts
rtk ./node_modules/.bin/vitest run \
  tests/unit/client/service-registry-endpoints.test.ts \
  tests/unit/grpc/grpc-package-services.test.ts \
  tests/unit/grpc/grpc-batch1-read-services.test.ts \
  tests/unit/json/json-batch1-read-services.test.ts \
  tests/unit/services/participant-status-service-client.test.ts \
  tests/unit/services/participant-package-service-client.test.ts
rtk npm run build
rtk npx tsc -p tsconfig.type-tests.json --noEmit
```

Expected: package-shape test passes, build passes, and the type fixture consumes
all `@ts-expect-error` directives.

- [ ] **Step 7: Stage exact cleanup paths and commit**

Stage only verified files; never use broad staging:

```bash
rtk git add src/index.ts src/client/service-registry.ts \
  src/transports/json/json-transport.ts \
  src/transports/grpc/grpc-transport.ts \
  src/transports/grpc/mappers/parties-mapper.ts \
  src/transports/grpc/mappers/health-mapper.ts \
  src/transports/grpc/mappers/participant-status-mapper.ts \
  src/services/party-management/decentralized-party-lifecycle.ts \
  tests/unit/smoke/package-shape.test.ts \
  tests/unit/client/service-registry-endpoints.test.ts \
  tests/unit/grpc/grpc-package-services.test.ts \
  tests/unit/grpc/grpc-batch1-read-services.test.ts \
  tests/unit/json/json-batch1-read-services.test.ts \
  tests/unit/services/parties-client.test.ts \
  tests/unit/services/participant-status-service-client.test.ts \
  tests/unit/services/participant-package-service-client.test.ts \
  tests/unit/debugger/replay/replay-artifact-resolver.test.ts \
  tests/types/protobuf-first-root-surface.test-d.ts \
  src/core/types/health-check-status.ts \
  src/core/types/requests/health-check-request.ts \
  src/core/types/responses/health-check-response.ts \
  src/core/types/requests/get-ledger-api-version-request.ts \
  src/core/types/responses/get-ledger-api-version-response.ts \
  src/core/types/requests/get-participant-status-request.ts \
  src/core/types/responses/get-participant-status-response.ts \
  src/core/types/requests/get-participant-id-request.ts \
  src/core/types/responses/get-participant-id-response.ts \
  src/core/types/requests/get-package-references-request.ts \
  src/core/types/responses/get-package-references-response.ts
rtk git commit -m "refactor: remove legacy protobuf root DTOs"
```

### Task 6: Re-run the complete deterministic suite and investigate residuals

**Files:**
- Modify only files named by a newly reproduced deterministic failure
- Possible timeout file: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

- [ ] **Step 1: Run all non-live tests**

Run:

```bash
rtk ./node_modules/.bin/vitest run tests/unit tests/integration tests/contract tests/property \
  --maxWorkers=1 --testTimeout=15000
```

Expected: zero failures.

- [ ] **Step 2: Diagnose any residual failure before editing**

For each failure, run its single file. Compare it with the generated service
signature and a passing sibling test. Do not batch speculative changes.

- [ ] **Step 3: Measure the materialization test only if it times out again**

Run the isolated file three times with timing:

```bash
rtk /usr/bin/time -f '%e seconds' ./node_modules/.bin/vitest run \
  tests/integration/daml-interface/generated-template-materialization.integration.test.ts \
  --maxWorkers=1 --testTimeout=15000
rtk /usr/bin/time -f '%e seconds' ./node_modules/.bin/vitest run \
  tests/integration/daml-interface/generated-template-materialization.integration.test.ts \
  --maxWorkers=1 --testTimeout=15000
rtk /usr/bin/time -f '%e seconds' ./node_modules/.bin/vitest run \
  tests/integration/daml-interface/generated-template-materialization.integration.test.ts \
  --maxWorkers=1 --testTimeout=15000
```

If it passes under 15 seconds,
make no timeout change. If correct behavior consistently exceeds 15 seconds,
set a per-test timeout of 30 seconds on only the slow test and record the three
observed durations in the commit message. Do not change the global timeout.

- [ ] **Step 4: Commit any evidence-backed residual repair**

Stage only the file named by the reproduced failure, then use a focused `fix:`
or `test:` commit naming the repaired boundary. For the known timeout candidate,
the complete command is:

```bash
rtk git add tests/integration/daml-interface/generated-template-materialization.integration.test.ts
rtk git commit -m "test: allow measured template materialization runtime"
```

For any other residual, substitute only that reproduced residual file in the
`rtk git add` command. Skip this commit when no residual exists. Never stage
`package.json` or unrelated plan files.

### Task 7: Full live and repository verification

**Files:**
- No planned source changes

- [ ] **Step 1: Verify the existing localnet is healthy without restarting it**

Run:

```bash
rtk docker ps --format '{{.Names}} {{.Status}} {{.Ports}}'
rtk env PARTICIPANT_358_LEDGER_ENDPOINT=localhost:3901 \
  node node/participant-358-synchronizer.mjs ledger-api-version
rtk env PARTICIPANT_358_LEDGER_ENDPOINT=localhost:8901 \
  PARTICIPANT_358_LEDGER_BEARER_TOKEN="$(<.generated/participant-358/ledger-api-user.token)" \
  node node/participant-358-synchronizer.mjs ledger-api-version
```

Expected: existing Canton and sidecar report healthy and Ledger API versions
`3.5.7` and `3.5.8`, respectively.

- [ ] **Step 2: Run the live suite**

Run:

```bash
rtk npm run test:live
```

Expected: zero failures and only intentional configuration-gated skips.

- [ ] **Step 3: Run the complete suite**

Run:

```bash
rtk npm test
```

Expected: zero failed files and zero failed tests.

- [ ] **Step 4: Run build, examples, type contract, and hygiene gates**

Run sequentially because builds clean `dist`:

```bash
rtk npm run build
rtk npm run examples:check
rtk npx tsc -p tsconfig.type-tests.json --noEmit
```

Then run scoped ESLint over every changed TypeScript file:

```bash
rtk npx eslint \
  src/index.ts src/client/service-registry.ts \
  src/core/transports/transport.interface.ts \
  src/services/party-management/decentralized-party-lifecycle.ts \
  src/services/state/state-service-client.ts \
  src/transports/grpc/grpc-channel-factory.ts \
  src/transports/grpc/grpc-transport.ts \
  src/transports/grpc/mappers/parties-mapper.ts \
  src/transports/json/json-transport.ts \
  examples/01-client-initialization.ts examples/02-tls-connection.ts \
  examples/03-jwt-authentication.ts examples/30-decentralized-party-ed25519.ts \
  tests/contract/shared/operational-services.grpc.contract.test.ts \
  tests/contract/shared/operational-services.json.contract.test.ts \
  tests/integration/debugger/ledger-replay-debugger.integration.test.ts \
  tests/integration/json/json-transport.integration.test.ts \
  tests/live/runtime/live-connectivity-preflight.ts \
  tests/live/scenarios/create-live-external-party.ts \
  tests/live/scenarios/create-live-multi-host-party-to-participant.ts \
  tests/live/specs/live-connectivity.test.ts \
  tests/live/specs/live-multi-node-connectivity.test.ts \
  tests/live/specs/live-participant-services.test.ts \
  tests/live/specs/live-system-services.test.ts \
  tests/live/fuzz/live-fuzz-fixture.ts \
  tests/unit/client/service-registry-endpoints.test.ts \
  tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts \
  tests/unit/debugger/replay/replay-artifact-resolver.test.ts \
  tests/unit/grpc/grpc-batch1-read-services.test.ts \
  tests/unit/grpc/grpc-batch5-read-services.test.ts \
  tests/unit/grpc/grpc-package-services.test.ts \
  tests/unit/grpc/grpc-system-client.test.ts \
  tests/unit/json/json-batch1-read-services.test.ts \
  tests/unit/json/json-batch3-read-services.test.ts \
  tests/unit/json/json-batch5-read-services.test.ts \
  tests/unit/json/json-system-client.test.ts \
  tests/unit/services/participant-package-service-client.test.ts \
  tests/unit/services/participant-party-management-service-client.test.ts \
  tests/unit/services/participant-status-service-client.test.ts \
  tests/unit/services/parties-client.test.ts \
  tests/unit/services/pruning-service-client.test.ts \
  tests/unit/smoke/package-shape.test.ts \
  tests/types/protobuf-first-root-surface.test-d.ts \
  --max-warnings=0
```

Finally run:

```bash
rtk git diff --check
rtk git status --short
```

Expected: all commands pass. `git status` may still show only the user's
pre-existing `package.json` version change and unrelated untracked plan files;
do not stage them.

- [ ] **Step 5: Record final evidence**

Report exact test counts, intentional skips, live runtime version, commits, and
the unchanged user-owned files. Store the outcome in persistent Graphiti memory
when its MCP tools are available.
