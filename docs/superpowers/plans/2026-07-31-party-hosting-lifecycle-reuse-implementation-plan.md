# Party Hosting Lifecycle Reuse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve decentralized-party allocation controls across prepare/finalize and expose the examples' stable party-hosting readiness check as a reusable SDK API.

**Architecture:** Add immutable allocation metadata to `PreparedDecentralizedParty`, then forward it unchanged during finalization. Add a root-exported hosting-wait request plus an internal deadline-aware polling primitive; `TopologyAggregationServiceClient` will use filtered aggregate `ListParties` calls and exact result matching while preserving its existing generated protobuf API. Migrate the decentralized example to the SDK method and remove both obsolete example polling helpers.

**Tech Stack:** TypeScript 5.9, protobuf-ts generated Canton v30 messages, Vitest, Node.js ESM, Canton Participants 3.5.7 and 3.5.8.

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/core/types/requests/finalize-decentralized-party-request.ts` | Preserve immutable allocation metadata in prepared decentralized-party state. |
| `src/services/party-management/decentralized-party-lifecycle.ts` | Copy allocation metadata from creation request into prepared state. |
| `src/services/party-management/party-management-service-client.ts` | Forward prepared allocation metadata to `AllocateExternalPartyRequest`. |
| `src/core/polling/poll-until-async.ts` | Internal deterministic deadline/sleep polling primitive. |
| `src/core/types/requests/wait-for-party-hosting-request.ts` | Validate the public party-hosting wait contract. |
| `src/services/topology-aggregation/topology-aggregation-service-client.ts` | Poll filtered `ListParties` results and return the exact match. |
| `src/index.ts` | Root-export `WaitForPartyHostingRequest`. |
| `examples/30-decentralized-party-ed25519.ts` | Use the SDK waiter instead of example-local polling. |
| `examples/shared/party-hosting.ts` | Delete after migration. |
| `examples/shared/party-to-participant.ts` | Delete obsolete incompatible low-level helper. |
| `README.md` | Document explicit decentralized hosting observation and Canton's ignored flag. |
| `tests/unit/services/parties-client.test.ts` | Regression coverage for prepared/allocation field propagation. |
| `tests/unit/core/poll-until-async.test.ts` | Deterministic polling boundary coverage. |
| `tests/unit/services/topology-aggregation-service-client.test.ts` | Waiter validation, filters, exact match, options, retry, and diagnostics. |
| `tests/unit/smoke/package-shape.test.ts` | Public root and protobuf-subpath type exposure. |
| `tests/types/party-hosting-wait.test-d.ts` | `tsc`-checked package-consumer contracts for root and `/protobuf` imports. |
| `tests/unit/examples/decentralized-party-ed25519.test.ts` | Structural example migration coverage. |
| `tests/unit/examples/party-hosting.test.ts` | Delete after behavior migrates to service tests. |
| `tests/unit/examples/party-to-participant.test.ts` | Delete with obsolete helper. |

Do not stage the pre-existing `package.json` version bump or unrelated untracked
plan documents in any task commit.

### Task 1: Preserve decentralized allocation controls

**Files:**
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `src/core/types/requests/finalize-decentralized-party-request.ts`
- Modify: `src/services/party-management/decentralized-party-lifecycle.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`

- [ ] **Step 1: Write failing prepared-state and allocation-forwarding tests**

Add three distinct regression cases rather than relying on one online path:

1. A preparation test constructs a request with all three values, runs
   preparation, and asserts immutable prepared metadata, including explicit
   `false`:

```ts
expect(prepared.identityProviderId).toBe("idp-1");
expect(prepared.waitForAllocation).toBe(false);
expect(prepared.userId).toBe("user-1");
```

2. An offline finalization test constructs a valid prepared bundle with
   `waitForAllocation: true`, calls `finalizeDecentralizedPartyAsync` with valid
   detached signatures, and asserts the generated allocation contains all
   three values:

```ts
expect(allocateExternalPartyAsync).toHaveBeenCalledWith(
    expect.objectContaining({
        identityProviderId: "idp-1",
        waitForAllocation: true,
        userId: "user-1",
    }),
    options,
);
```

3. An online `createDecentralizedPartyAsync` test verifies the same forwarding
   path with explicit `false`, then repeats with `undefined` and asserts the
   generated optional protobuf field remains `undefined` rather than being
   defaulted. Together the three cases cover preparation, direct offline
   finalization, online creation, and all `true`/`false`/`undefined` states.

- [ ] **Step 2: Run the focused test and verify the regression fails**

Run:

```bash
rtk npm test -- tests/unit/services/parties-client.test.ts
```

Expected: FAIL because `PreparedDecentralizedParty` has no allocation metadata
and the decentralized finalizer omits it.

- [ ] **Step 3: Add immutable prepared metadata**

Add to `PreparedDecentralizedParty` and its constructor initializer:

```ts
public readonly identityProviderId?: string;
public readonly waitForAllocation?: boolean;
public readonly userId?: string;
```

Assign the values directly. These scalar fields do not participate in topology
hashing or signature validation.

- [ ] **Step 4: Populate and forward the fields**

When `prepareDecentralizedPartyAsync` constructs the prepared object, copy the
three values from `CreateDecentralizedPartyRequest`. When finalizing, add:

```ts
identityProviderId: prepared.identityProviderId,
waitForAllocation: prepared.waitForAllocation,
userId: prepared.userId,
```

to `AllocateExternalPartyRequest.create(...)`.

- [ ] **Step 5: Run the focused suite and verify it passes**

Run:

```bash
rtk npm test -- tests/unit/services/parties-client.test.ts
```

Expected: PASS with all party lifecycle tests green.

- [ ] **Step 6: Commit only lifecycle files**

```bash
rtk git add \
  src/core/types/requests/finalize-decentralized-party-request.ts \
  src/services/party-management/decentralized-party-lifecycle.ts \
  src/services/party-management/party-management-service-client.ts \
  tests/unit/services/parties-client.test.ts
rtk git commit -m "fix: preserve decentralized allocation options"
```

### Task 2: Add the internal polling primitive

**Files:**
- Create: `src/core/polling/poll-until-async.ts`
- Create: `tests/unit/core/poll-until-async.test.ts`

- [ ] **Step 1: Write failing deadline tests**

Test an internal contract equivalent to:

```ts
await pollUntilAsync({
    timeoutMs: 10,
    pollIntervalMs: 7,
    now: () => now,
    sleepAsync: async milliseconds => { sleeps.push(milliseconds); now += milliseconds; },
    readAsync: async () => ++attempt,
    match: value => value === 3,
    createTimeoutError: last => new Error(`last=${last}`),
});
```

Cover immediate success without sleep, retry success, zero interval, sleep
clamping (`[7, 3]` for a ten-millisecond deadline), no read at/after the
deadline, and timeout error access to the last value. Add an in-flight case in
which `readAsync` starts before the deadline and advances the injected clock
past it before resolving; prove the read is not canceled and the helper throws
without another sleep or read.

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```bash
rtk npm test -- tests/unit/core/poll-until-async.test.ts
```

Expected: FAIL because the polling module does not exist.

- [ ] **Step 3: Implement the smallest internal primitive**

Create a non-root-exported generic helper with injected defaults:

```ts
export async function pollUntilAsync<T>(init: {
    timeoutMs: number;
    pollIntervalMs: number;
    readAsync: () => Promise<T>;
    match: (value: T) => boolean;
    createTimeoutError: (lastObserved: T | undefined) => Error;
    now?: () => number;
    sleepAsync?: (milliseconds: number) => Promise<void>;
}): Promise<T>;
```

Perform the first read immediately. After each failed match, compare the clock
to the fixed deadline. Throw without sleeping at the deadline; otherwise sleep
for `Math.min(pollIntervalMs, deadline - now())`. Begin no new read when the
deadline has been reached.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
rtk npm test -- tests/unit/core/poll-until-async.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the primitive and tests**

```bash
rtk git add src/core/polling/poll-until-async.ts tests/unit/core/poll-until-async.test.ts
rtk git commit -m "feat: add internal async polling primitive"
```

### Task 3: Add the public party-hosting waiter

**Files:**
- Create: `src/core/types/requests/wait-for-party-hosting-request.ts`
- Modify: `src/services/topology-aggregation/topology-aggregation-service-client.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/services/topology-aggregation-service-client.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Create: `tests/types/party-hosting-wait.test-d.ts`

- [ ] **Step 1: Write failing request-validation and export tests**

Import `WaitForPartyHostingRequest` from `../../../src` and assert its default
timing values. Table-test empty IDs, `NaN`, infinities, fractions, unsafe
integers, timeout values below one, and negative poll intervals. Assert
`ValidationError` is thrown before any transport call.

Add `WaitForPartyHostingRequest` to the runtime package-shape import and assert
it is a constructor.

Create `tests/types/party-hosting-wait.test-d.ts` as the real consumer compile
fixture. Import from the documented package self-references:

```ts
import {
    TopologyAggregationServiceClient,
    WaitForPartyHostingRequest,
} from "@distrohelena/canton-typescript-sdk";
import { comDigitalasset } from "@distrohelena/canton-typescript-sdk/protobuf";

declare const client: TopologyAggregationServiceClient;

const listRequest =
    comDigitalasset.canton.topology.admin.v30.ListPartiesRequest.create();

const listResult: Promise<
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse
> = client.listPartiesAsync(listRequest);

const waitResult: Promise<
    comDigitalasset.canton.topology.admin.v30.ListPartiesResponse_Result
> = client.waitForPartyHostingAsync(new WaitForPartyHostingRequest({
    partyId: "party::namespace",
    participantId: "participant::namespace",
    synchronizerId: "sync::namespace",
}));

void listResult;
void waitResult;
```

This fixture both protects the additive waiter and proves the existing
generated `listPartiesAsync` request/response contract did not change.

- [ ] **Step 2: Write failing waiter behavior tests**

Configure `topologyListPartiesAsync` to return generated protobuf responses and
assert the waiter sends:

```ts
expect.objectContaining({
    limit: 1,
    filterParty: "party::namespace",
    filterParticipant: "participant::namespace",
    synchronizerIds: ["sync::namespace"],
})
```

Cover:

- immediate exact match and returned result identity;
- forwarding the same `RequestOptions` on every attempt;
- a decoy party with matching participant/synchronizer does not succeed;
- retry until the exact synchronizer permission appears;
- timeout message contains party, participant, synchronizer, and the last
  observed aggregate summary;
- a timeout after empty responses says no hosting was observed;
- transport rejection is propagated unchanged.

Use Vitest fake timers for service-level retry tests; deadline math itself is
already deterministic in Task 2.

- [ ] **Step 3: Run the focused suites and verify they fail**

Run:

```bash
rtk npm test -- \
  tests/unit/services/topology-aggregation-service-client.test.ts \
  tests/unit/smoke/package-shape.test.ts
rtk npm run build
rtk npx tsc -p tsconfig.type-tests.json --noEmit
```

Expected: Vitest FAILS because the request and method do not exist. The normal
SDK build still succeeds before implementation, but the consumer `tsc` command
FAILS with missing `WaitForPartyHostingRequest`/`waitForPartyHostingAsync`
errors. This records a real red state for both runtime and declaration surfaces.

- [ ] **Step 4: Implement `WaitForPartyHostingRequest`**

Create the public request with required trimmed identifiers and defaults of
`30_000`/`500`. Validate timing with `Number.isSafeInteger`; require a positive
timeout and non-negative interval. Throw `ValidationError` messages naming the
invalid field without including credentials or unrelated state.

- [ ] **Step 5: Implement exact filtered waiting**

Keep the existing `listPartiesAsync` signature unchanged. Add
`waitForPartyHostingAsync`, using the generated
`ListPartiesRequest.create(...)`, the internal poller, and an exact matcher:

```ts
const match = response.results.find(result =>
    result.party === request.partyId &&
    result.participants.some(participant =>
        participant.participantUid === request.participantId &&
        participant.synchronizers.some(permission =>
            permission.synchronizerId === request.synchronizerId,
        ),
    ),
);
```

Return the matched generated result. Forward `RequestOptions` to every
`listPartiesAsync` call. Format bounded last-observation diagnostics.

- [ ] **Step 6: Export and verify package shape**

Export `WaitForPartyHostingRequest` from `src/index.ts`. Do not root-export the
internal poller and do not change existing topology aggregation DTO signatures.

- [ ] **Step 7: Run focused tests and build**

Run:

```bash
rtk npm test -- \
  tests/unit/core/poll-until-async.test.ts \
  tests/unit/services/topology-aggregation-service-client.test.ts \
  tests/unit/smoke/package-shape.test.ts
rtk npm run build
rtk npx tsc -p tsconfig.type-tests.json --noEmit
```

Expected: all focused tests pass and the ESM/CJS declaration build exits zero.

- [ ] **Step 8: Commit the public waiter**

```bash
rtk git add \
  src/core/types/requests/wait-for-party-hosting-request.ts \
  src/services/topology-aggregation/topology-aggregation-service-client.ts \
  src/index.ts \
  tests/unit/services/topology-aggregation-service-client.test.ts \
  tests/unit/smoke/package-shape.test.ts \
  tests/types/party-hosting-wait.test-d.ts
rtk git commit -m "feat: wait for aggregated party hosting"
```

### Task 4: Migrate the example and remove obsolete helpers

**Files:**
- Modify: `examples/30-decentralized-party-ed25519.ts`
- Modify: `tests/unit/examples/decentralized-party-ed25519.test.ts`
- Delete: `examples/shared/party-hosting.ts`
- Delete: `tests/unit/examples/party-hosting.test.ts`
- Delete: `examples/shared/party-to-participant.ts`
- Delete: `tests/unit/examples/party-to-participant.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Change the structural test first**

Require the example to construct `WaitForPartyHostingRequest` and call
`topologyAggregationService.waitForPartyHostingAsync`. Assert it no longer
contains either obsolete helper import path or constructs `ListPartiesRequest`.

- [ ] **Step 2: Run the structural test and verify it fails**

Run:

```bash
rtk npm test -- tests/unit/examples/decentralized-party-ed25519.test.ts
```

Expected: FAIL because the example still imports `waitForPartyHostingAsync`
from `examples/shared/party-hosting.ts`.

- [ ] **Step 3: Migrate the example**

Import `WaitForPartyHostingRequest` from the package root and replace the local
callback wrapper with:

```ts
await client.topologyAggregationService.waitForPartyHostingAsync(
    new WaitForPartyHostingRequest({
        partyId,
        participantId: localParticipant.participantId,
        synchronizerId: synchronizer,
    }),
);
```

Keep the submitted party-signing fingerprint output; the aggregate endpoint
proves hosting, not party-signing-key contents.

- [ ] **Step 4: Delete obsolete helpers and migrate their tests**

Delete both example helper files and their direct tests. Their reusable hosting
behavior is now covered by service tests; the raw `PartyToParticipant` helper
must not be retained because it uses the 3.5.7-incompatible low-level surface.

- [ ] **Step 5: Document semantics**

Update the README to state that:

- the SDK preserves `waitForAllocation` in decentralized allocation requests;
- Canton ignores that flag for decentralized parties;
- `waitForPartyHostingAsync` is the explicit, cross-version hosting proof used
  by the standalone example.

- [ ] **Step 6: Run example and focused regression checks**

Run:

```bash
rtk npm test -- \
  tests/unit/examples/decentralized-party-ed25519.test.ts \
  tests/unit/services/topology-aggregation-service-client.test.ts \
  tests/unit/services/parties-client.test.ts
rtk npm run examples:check
! rtk rg -n \
  'from ".*shared/(party-hosting|party-to-participant)\.js"' \
  examples tests/unit/examples
```

Expected: tests and type-check pass; the import-specific `rg` finds no obsolete
helper imports, so its negated command exits zero even if structural tests name
the old files in negative assertions.

- [ ] **Step 7: Commit the migration**

```bash
rtk git add \
  README.md \
  examples/30-decentralized-party-ed25519.ts \
  examples/shared/party-hosting.ts \
  examples/shared/party-to-participant.ts \
  tests/unit/examples/decentralized-party-ed25519.test.ts \
  tests/unit/examples/party-hosting.test.ts \
  tests/unit/examples/party-to-participant.test.ts
rtk git commit -m "refactor: reuse SDK party hosting waiter"
```

### Task 5: Verify the complete change and both Canton versions

**Files:**
- Verify only; modify implementation/tests only if a failing check exposes a
  scoped defect.

- [ ] **Step 1: Run all static and unit verification**

Run:

```bash
rtk npm run build
rtk npm run examples:check
rtk npx tsc -p tsconfig.type-tests.json --noEmit
rtk npm test
rtk npm run lint
rtk git diff --check
```

Expected: every command exits zero with no failed tests or lint errors.

- [ ] **Step 2: Run the decentralized example against Participant 3.5.7**

Verify the already-running normal localnet reports the expected version, mint a
short-lived shared-secret token into a temporary file, and run:

```bash
proof_token_357="$(mktemp)"
version_357="$(PARTICIPANT_358_LEDGER_ENDPOINT=localhost:3901 \
  rtk node node/participant-358-synchronizer.mjs ledger-api-version)"
[[ "$version_357" == 3.5.7* ]]
rtk echo "Participant 3.5.7 Ledger API response: $version_357"
PARTICIPANT_358_LEDGER_TOKEN_FILE="$proof_token_357" \
  rtk node node/participant-358-synchronizer.mjs mint-ledger-token
SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:3901 \
SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:3901 \
SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:3902 \
SDK_EXAMPLE_BEARER_TOKEN="$(<"$proof_token_357")" \
  rtk npm run example:party:decentralized
rtk rm "$proof_token_357"
```

Expected: the version command prints a value beginning with `3.5.7`; the
example exits zero, prints a newly created decentralized Ed25519 party ID, and
prints an explicit PartyToParticipant hosting confirmation for that participant.

- [ ] **Step 3: Run the identical example against Participant 3.5.8**

Restart the SDK-owned isolated sidecar for reproducibility, verify its Ledger
API version, run the exact same example command against its printed endpoint
layout/token file, and stop only the sidecar afterward:

```bash
rtk npm run stop:local-participant-358
rtk npm run start:local-participant-358
version_358="$(PARTICIPANT_358_LEDGER_ENDPOINT=localhost:8901 \
PARTICIPANT_358_LEDGER_BEARER_TOKEN="$(<.generated/participant-358/ledger-api-user.token)" \
  rtk node node/participant-358-synchronizer.mjs ledger-api-version)"
[[ "$version_358" == 3.5.8* ]]
rtk echo "Participant 3.5.8 Ledger API response: $version_358"
SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:8901 \
SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:8901 \
SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:8902 \
SDK_EXAMPLE_BEARER_TOKEN="$(<.generated/participant-358/ledger-api-user.token)" \
  rtk npm run example:party:decentralized
rtk npm run stop:local-participant-358
```

Expected: the version command prints a value beginning with `3.5.8`; the
example exits zero, prints a newly created decentralized Ed25519 party ID, and
prints an explicit hosting confirmation for that participant. Do not add any
version-specific creation branch. If the example fails, stop the sidecar before
debugging; the normal 3.5.7 localnet remains untouched.

- [ ] **Step 4: Inspect commit scope**

Run:

```bash
rtk git status --short
rtk git log --oneline --decorate -6
```

Expected: implementation files are committed; the pre-existing `package.json`
version bump and unrelated untracked plan files remain untouched and uncommitted.
