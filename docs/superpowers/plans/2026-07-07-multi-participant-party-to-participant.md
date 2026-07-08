# Multi-Participant PartyToParticipant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live-tested SDK support for creating and verifying raw `PartyToParticipant` topology mappings hosted on 2 participants and 3 participants.

**Architecture:** Keep the raw topology write API as the primary surface. Add live test/runtime helpers that can target multiple participant-admin endpoints, generate a fresh external-party-compatible `PartyToParticipant` mapping, submit it through the public SDK write surface, and verify it through the public topology read surface using synchronizer-scoped `baseQuery` requests.

**Tech Stack:** TypeScript, Vitest, Canton gRPC SDK surface, existing live test runtime

---

### Task 1: Add failing live coverage for 2-host and 3-host PartyToParticipant writes

**Files:**
- Create: `tests/live/specs/live-party-to-participant-multi-host.test.ts`
- Modify: `tests/live/coverage/canton-client-live-coverage.ts`
- Test: `tests/live/specs/live-party-to-participant-multi-host.test.ts`

- [ ] **Step 1: Write the failing live tests**

Add two live tests:
- `creates and reads back a fresh party-to-participant mapping on 2 participants`
- `creates and reads back a fresh party-to-participant mapping on 3 participants`

Each test should:
- create the required multi-node environment
- call a scenario helper through `CantonClient`
- assert the returned mapping includes the expected participant UIDs and threshold

- [ ] **Step 2: Run the targeted live test file to verify it fails**

Run: `rtk npm test -- tests/live/specs/live-party-to-participant-multi-host.test.ts`

Expected: FAIL because the multi-node runtime/scenario helper does not exist yet.

- [ ] **Step 3: Commit the red state if desired**

Optional local checkpoint only. Do not commit broken mainline code unless explicitly requested.

### Task 2: Add multi-node live runtime support

**Files:**
- Modify: `tests/live/fixtures/live-endpoint-defaults.ts`
- Modify: `tests/live/runtime/live-test-environment.ts`
- Modify: `tests/live/runtime/live-connectivity-preflight.ts`
- Create: `tests/live/runtime/live-multi-node-test-environment.ts`
- Create: `tests/live/runtime/live-multi-node-client-factory.ts`
- Test: `tests/live/specs/live-party-to-participant-multi-host.test.ts`

- [ ] **Step 1: Add environment model for additional participant-admin targets**

Introduce explicit optional overrides/defaults for:
- secondary node ledger endpoint
- secondary node ledger-admin endpoint
- secondary node participant-admin endpoint
- tertiary node ledger endpoint
- tertiary node ledger-admin endpoint
- tertiary node participant-admin endpoint

Keep the existing single-node environment unchanged.

- [ ] **Step 2: Add fail-fast connectivity helpers for multi-node tests**

Add helpers that:
- require exactly 2 or 3 configured nodes
- create a `CantonClient` per node
- validate each required surface before the topology test runs

- [ ] **Step 3: Run the targeted live test again**

Run: `rtk npm test -- tests/live/specs/live-party-to-participant-multi-host.test.ts`

Expected: FAIL later in the scenario because the raw topology multi-host submission helper does not exist yet.

### Task 3: Add scenario helper for raw multi-host PartyToParticipant creation

**Files:**
- Create: `tests/live/scenarios/create-live-multi-host-party-to-participant.ts`
- Modify: `tests/live/scenarios/create-live-external-party.ts` (only if shared helper extraction reduces duplication cleanly)
- Test: `tests/live/specs/live-party-to-participant-multi-host.test.ts`

- [ ] **Step 1: Implement the minimal scenario helper**

The helper should:
- discover participant IDs for each node
- discover the single healthy synchronizer ID from the primary node
- generate a fresh ED25519 public keypair
- construct a raw `PartyToParticipant` mapping with:
  - fresh party id format `ed25519_party::<fingerprint>`
  - explicit participants array for 2-host or 3-host cases
  - explicit threshold
  - party signing keys for the external party key
- submit through public SDK topology write methods

- [ ] **Step 2: Submit through public topology write surface only**

Use:
- `topologyManagerWriteService.generateTransactionsAsync(...)`
- `topologyManagerWriteService.addTransactionsAsync(...)`

Only add `authorizeAsync(...)` or signing steps if the live node requires them for this flow.

- [ ] **Step 3: Run the targeted live test again**

Run: `rtk npm test -- tests/live/specs/live-party-to-participant-multi-host.test.ts`

Expected: FAIL on read-back or assertion until the verification helper is added/finalized.

### Task 4: Add read-back verification helpers using synchronizer-scoped queries

**Files:**
- Modify: `tests/live/scenarios/create-live-multi-host-party-to-participant.ts`
- Possibly create: `tests/live/scenarios/read-live-party-to-participant.ts`
- Test: `tests/live/specs/live-party-to-participant-multi-host.test.ts`

- [ ] **Step 1: Add synchronizer-scoped read-back**

Read the created mapping back with:
- `topologyManagerReadService.listPartyToParticipantAsync(...)`

Always include:
- `TopologyBaseQuery`
- `TopologyStoreId`
- `TopologyStoreKind.synchronizer`
- `TopologyStoreSynchronizer`
- `headState: true`

- [ ] **Step 2: Assert stable host semantics**

Verify:
- exact party id
- expected participant UID count
- participant UID membership
- threshold
- permissions for each host

- [ ] **Step 3: Run the targeted live test to green**

Run: `rtk npm test -- tests/live/specs/live-party-to-participant-multi-host.test.ts`

Expected: PASS against a compatible local multi-node Canton quickstart environment.

### Task 5: Add concise public documentation

**Files:**
- Modify: `DOCUMENTATION.md`
- Possibly modify: `README.md`
- Test: none

- [ ] **Step 1: Document raw multi-host PartyToParticipant usage**

Add a concise example showing:
- constructing `PartyToParticipant`
- choosing 2 or 3 participants
- setting threshold
- reading back with `baseQuery`

- [ ] **Step 2: Document live test environment overrides**

List the new environment variables required for secondary and tertiary nodes.

### Task 6: Full verification

**Files:**
- Test only

- [ ] **Step 1: Run targeted unit tests if any helper/runtime logic gained unit coverage**

Run: `rtk npm test -- tests/unit`

- [ ] **Step 2: Run the new live topology test file**

Run: `rtk npm test -- tests/live/specs/live-party-to-participant-multi-host.test.ts`

- [ ] **Step 3: Run a full project build**

Run: `rtk npm run build`

- [ ] **Step 4: Commit**

```bash
git add DOCUMENTATION.md README.md docs/superpowers/plans/2026-07-07-multi-participant-party-to-participant.md tests/live src
git commit -m "Add live multi-host party-to-participant coverage"
```
