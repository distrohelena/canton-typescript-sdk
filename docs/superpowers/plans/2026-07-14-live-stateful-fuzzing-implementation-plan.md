# Live Stateful Fuzzing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in fast-check live property suite that executes valid create/query/fetch/archive sequences against two real Canton participants and checks cross-participant ledger invariants.

**Architecture:** Reuse the existing gRPC live-test environment and `Main:Iou` quickstart fixture. Generate bounded valid command grammars, execute every candidate sequence against Canton with `fc.asyncProperty`, maintain a lightweight model as the oracle, poll for eventual visibility, and clean up active contracts after each run. Keep all live fuzzing disabled unless explicitly enabled.

**Tech Stack:** TypeScript, Vitest, fast-check, existing `CantonClient` gRPC services, CN quickstart two-participant topology.

---

## File map

### New files

- `tests/live/fuzz/live-fuzz-config.ts` — opt-in gate, campaign limits, deterministic run ID, and endpoint/test timeout configuration.
- `tests/live/fuzz/live-fuzz-fixture.ts` — allocate one issuer on participant A and one owner on participant B; define the fixed `Main:Iou` payload and archive command.
- `tests/live/fuzz/live-fuzz-commands.ts` — valid command descriptors, model state, and a grammar that never emits fetch/exercise before create or after archive.
- `tests/live/fuzz/live-fuzz-runner.ts` — live execution, polling, invariant checks, ledger-end tracking, and cleanup.
- `tests/live/specs/live-stateful-fuzzing.test.ts` — opt-in async property and focused campaign configuration.
- `tests/unit/live/live-stateful-fuzzing.test.ts` — offline tests for command grammar, model transitions, deterministic run IDs, and option validation.

### Modified files

- `package.json` — add `test:live:fuzz`.
- `tests/property/property-test-options.ts` — allow callers to override the default run count while preserving the existing default of 100.
- `tests/property/property-test-options.test.ts` — cover the configurable default.

No SDK runtime/public API source files are expected to change.

## Task 1: Add live campaign configuration and runner entry point

**Files:**
- Modify: `package.json`
- Modify: `tests/property/property-test-options.ts`
- Modify: `tests/property/property-test-options.test.ts`
- Create: `tests/live/fuzz/live-fuzz-config.ts`
- Create: `tests/live/specs/live-stateful-fuzzing.test.ts`
- Test: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Write configuration tests first.**

Cover:

- `SDK_TEST_ENABLE_LIVE_FUZZING` absent => live property is disabled;
- `FUZZ_NUM_RUNS` defaults to 20 for live fuzzing but remains 100 for existing offline properties;
- `FUZZ_LIVE_MAX_COMMANDS` defaults to 8;
- `FUZZ_LIVE_POLL_TIMEOUT_MS` defaults to 10,000;
- `FUZZ_LIVE_POLL_INTERVAL_MS` defaults to 100;
- `FUZZ_LIVE_TEST_TIMEOUT_MS` defaults to 300,000;
- `FUZZ_LIVE_CLEANUP_TIMEOUT_MS` defaults to 5,000;
- `FUZZ_LIVE_REQUIRE_ARCHIVE` can force the optional archive segment for smoke runs;
- `FUZZ_LIVE_RUN_ID` is accepted and reused unchanged;
- `FUZZ_LIVE_ISSUER_PARTY` and `FUZZ_LIVE_OWNER_PARTY` can supply already allocated party IDs;
- zero, negative, decimal, non-numeric, or unsafe values fail before a live campaign starts.

- [ ] **Step 2: Run the focused unit test to establish the failure.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because the live fuzz configuration module and test are not implemented.

- [ ] **Step 3: Make the offline property option helper configurable.**

Change `propertyParameters` to accept an optional `{ defaultNumRuns?: number }` or equivalent named argument. Keep `100` as the default when no override is passed. The parser must continue to validate `FUZZ_NUM_RUNS`, `FUZZ_SEED`, and `FUZZ_PATH` exactly as the existing offline harness does.

- [ ] **Step 4: Implement live-fuzz configuration.**

Expose a small internal configuration object with:

```ts
{
    enabled: boolean;
    numRuns: number;
    seed?: number;
    path?: string;
    maxCommands: number;
    pollTimeoutMs: number;
    pollIntervalMs: number;
    cleanupTimeoutMs: number;
    testTimeoutMs: number;
    runId: string;
}
```

Use `FUZZ_LIVE_RUN_ID` when set. Otherwise create one invocation-wide run ID, print it on campaign start, and reuse it for all runs and shrink candidates. Accept optional actual party IDs through `FUZZ_LIVE_ISSUER_PARTY` and `FUZZ_LIVE_OWNER_PARTY`; if both are set, do not allocate new parties. Use `propertyParameters({ defaultNumRuns: 20 })` for seed/path/run-count parsing. Parse `FUZZ_LIVE_REQUIRE_ARCHIVE` as a boolean used by the smoke campaign, and parse `FUZZ_LIVE_TEST_TIMEOUT_MS` with a default of `300000` separately from `FUZZ_LIVE_CLEANUP_TIMEOUT_MS` with a default of `5000`.

- [ ] **Step 5: Add the opt-in live test shell and npm script.**

Add:

```json
"test:live:fuzz": "vitest run tests/live/specs/live-stateful-fuzzing.test.ts --maxWorkers=1 --testTimeout=300000"
```

The Vitest spec must skip with a clear reason when `SDK_TEST_ENABLE_LIVE_FUZZING` is not `1`. It must not construct clients or allocate parties while disabled.

- [ ] **Step 6: Run offline configuration tests and the disabled live spec.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts tests/live/specs/live-stateful-fuzzing.test.ts`

Expected: configuration unit tests pass; the live spec is skipped when the opt-in flag is absent.

- [ ] **Step 7: Commit the configuration boundary.**

```bash
git add package.json tests/property/property-test-options.ts tests/property/property-test-options.test.ts tests/live/fuzz/live-fuzz-config.ts tests/live/specs/live-stateful-fuzzing.test.ts tests/unit/live/live-stateful-fuzzing.test.ts
git commit -m "test: add opt-in live fuzz campaign configuration"
```

## Task 2: Define the fixed two-participant Iou fixture

**Files:**
- Create: `tests/live/fuzz/live-fuzz-fixture.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Add failing fixture contract tests.**

Test that the fixture:

- builds exactly two gRPC live environments using `createLiveMultiNodeEnvironment({ transportKind: TransportKind.grpc, nodeCount: 2 })`;
- uses `Main:Iou`;
- allocates the issuer party through participant A and owner party through participant B;
- creates `{ issuer, owner, amount }` with a valid numeric amount containing the run ID and generated suffix;
- submits create as issuer without an owner `readAs` party because the owner is hosted on participant B;
- defines `Archive` with `{}`; and
- reuses the same parties for every generated command and shrink candidate.

Keep request-shape assertions offline by testing pure fixture builders; defer actual party allocation to the opt-in live setup.

- [ ] **Step 2: Run the focused unit test.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL with missing fixture exports or incorrect request shapes.

- [ ] **Step 3: Implement fixture setup and fixed command shapes.**

Use the existing `LiveMultiNodeClients` and `createLiveClient` helpers. Allocate two parties once per test invocation with deterministic hints derived from `runId`, for example `sdk-live-fuzz-${runId}-issuer` and `sdk-live-fuzz-${runId}-owner`, unless actual IDs are supplied through configuration. Do not allocate parties inside the property callback or during shrinking; print the actual IDs for exact replay.

Export:

- the two clients and party IDs;
- `templateId = "Main:Iou"`;
- `createPayloadArbitrary` for valid numeric amount suffixes;
- `buildCreateRequest(amountSuffix)` using `CreateCommand` and `SubmitCommandRequest`, deriving a valid run-marked numeric amount and using `actAs: [issuerParty]` without cross-participant `readAs`. Encode the run ID by hashing it with SHA-256, reducing a fixed prefix to a bounded integer component, and combining that component with a zero-padded generated suffix as a valid ten-decimal Numeric string. Keep this function deterministic and test the same inputs for the same output;
- `buildArchiveRequest(contractId)` using `ExerciseCommand`; and
- the participant/party routing used by query and fetch operations.

The setup must preflight both ledger endpoints and fail before property execution if either participant cannot connect or lacks the `Main:Iou` package. Prove package availability by listing package IDs and loading package contents on both participants, then finding the `Main.Iou` template in each package set. It must not upload `sdk-live-test-model.dar`; that asset is Splice utility code, not the Iou fixture.

- [ ] **Step 4: Add party and package preflight assertions.**

Verify both participants can query `Main:Iou` for their respective parties before running the campaign. A missing package, missing party, or unavailable second participant is a setup failure, never a skipped cross-participant assertion.

- [ ] **Step 5: Run offline fixture tests and build.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: PASS for request shapes and deterministic party hints. Live setup tests remain opt-in.

- [ ] **Step 6: Commit the fixture.**

```bash
git add tests/live/fuzz/live-fuzz-fixture.ts tests/unit/live/live-stateful-fuzzing.test.ts
git commit -m "test: add two-participant live fuzz fixture"
```

## Task 3: Add valid stateful command generation and model transitions

**Files:**
- Create: `tests/live/fuzz/live-fuzz-commands.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Write grammar and model tests first.**

Assert that generated sequences:

- always begin with `create`;
- contain no more than the configured maximum number of commands;
- only emit `query` and `fetch` while the model is active;
- emit at most one `exercise`/archive command;
- never emit `fetch` or `exercise` before the contract ID is known; and
- allow queries after archive.

Assert model transitions for create, query, fetch, events, exercise, and archive cleanup.

- [ ] **Step 2: Run the focused unit test.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because the command descriptors, grammar, and model are missing.

- [ ] **Step 3: Implement command descriptors and a shrink-friendly grammar.**

Define descriptors such as:

```ts
type LiveFuzzCommand =
    | { kind: "create" }
    | { kind: "query"; participant: "issuer" | "owner" }
    | { kind: "fetch"; participant: "issuer" | "owner" }
    | { kind: "events"; participant: "issuer" | "owner" }
    | { kind: "exercise"; participant: "issuer" | "owner" };
```

Use a fixed valid grammar rather than filtering arbitrary command arrays: `create`, followed by a bounded array of query/fetch/events operations, an optional exercise, and a bounded array of post-exercise query/events operations. When `requireArchive` is true, generate the exact four-step smoke sequence `create`, `query`, `fetch`, `exercise`; otherwise bound the total sequence with `maxCommands` and let fast-check shrink each segment and participant choice.

Define model state with `contractId?: string`, `active: boolean`, `createdSeenBy`, `lastLedgerEndByParticipant`, and expected payload/template. Model transitions must reject impossible operations in unit tests.

- [ ] **Step 4: Add deterministic seed/path replay coverage for command generation.**

Use the configured seed and shrink path in an offline property test to prove the same generated sequence is returned for the same campaign options. Do not use timestamps or random bytes in command generation.

- [ ] **Step 5: Run command/model tests.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: PASS, with no live network required.

- [ ] **Step 6: Commit the command model.**

```bash
git add tests/live/fuzz/live-fuzz-commands.ts tests/unit/live/live-stateful-fuzzing.test.ts
git commit -m "test: add valid live fuzz command model"
```

## Task 4: Implement live polling and invariant checks

**Files:**
- Create: `tests/live/fuzz/live-fuzz-runner.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Add failing helper tests.**

Test pure helpers for:

- decimal ledger-end comparison using `BigInt`, including values where lexical ordering differs;
- identifying the run’s created Iou from active-contract responses;
- matching template, issuer, owner, and amount;
- distinguishing active from archived state; and
- formatting polling timeout diagnostics.

- [ ] **Step 2: Run the helper tests.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because polling/invariant helpers are missing.

- [ ] **Step 3: Implement bounded polling.**

Implement a shared `pollUntilAsync` helper using the configured interval and timeout. Each poll reads the target participant’s active contracts and ledger end. On timeout, throw an error containing participant, expected state, run ID, contract ID if known, last active-contract summary, and last ledger-end offset.

Never retry a command submission. Only retry eventual-consistency reads.

- [ ] **Step 4: Implement create/query/fetch invariants.**

After create:

- poll participant A as issuer until the matching `Main:Iou` is present;
- poll participant B as owner until the same contract ID is present;
- compare payload fields and template IDs; and
- record the contract ID in the model.

For query, compare the observed active/archived state with the model. For fetch, call `contractService.getContractAsync` and compare the returned created event with the model.

- [ ] **Step 5: Implement archive/event/ledger-end invariants.**

For exercise, submit `Archive` through the selected participant, then poll every participant that previously observed the contract until it is absent. Continue polling `eventQueryService.getEventsByContractIdAsync` until both the created and archived lifecycle records are indexed; the `events` command uses the same bounded lifecycle polling helper. After every command and poll, compare each participant’s ledger-end offset to the prior recorded offset using `BigInt`.

- [ ] **Step 6: Implement cleanup.**

In `finally`, if the model has an active contract ID, submit one archive command using the issuer or owner route and poll until the contract is absent. If the contract ID is unknown, query both participants for active contracts matching the exact run-marked amount and parties, then archive every match. Wrap cleanup in an explicit `withTimeoutAsync(cleanupTimeoutMs, ...)`; include cleanup errors only as secondary diagnostics so the original property failure remains visible.

- [ ] **Step 7: Run offline runner-helper tests.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: PASS for pure helpers. The real client executor is exercised only by the opt-in live spec.

- [ ] **Step 8: Commit the runner.**

```bash
git add tests/live/fuzz/live-fuzz-runner.ts tests/unit/live/live-stateful-fuzzing.test.ts
git commit -m "test: add live fuzz polling and invariants"
```

## Task 5: Connect the async property and verify against Canton

**Files:**
- Modify: `tests/live/specs/live-stateful-fuzzing.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Add the failing live property contract.**

The property should:

1. load live config and skip before setup when disabled;
2. create the two-participant fixture once;
3. run `fc.assert(fc.asyncProperty(commandSequenceArbitrary, async sequence => executeSequenceAsync(...)))`;
4. use the same fixture parties and run ID for all shrink candidates;
5. execute every command against Canton; and
6. clean up in `finally`.

Wrap each generated sequence in `withTimeoutAsync` using the per-run timeout and wrap the complete `fc.assert` promise in a campaign timeout. The Vitest timeout is only an outer safety net; it does not implement these per-run or campaign limits.

Include the generated sequence, run ID, participant routing, seed, and shrink path in thrown errors where fast-check permits supplemental diagnostics.

- [ ] **Step 2: Run the disabled live property.**

Run: `rtk npm run test:live:fuzz`

Expected: the spec is skipped with a clear opt-in message and exits successfully without requiring Canton.

- [ ] **Step 3: Document opt-in usage.**

Add a README section covering:

```bash
SDK_TEST_ENABLE_LIVE_FUZZING=1 \
FUZZ_LIVE_RUN_ID=local-live-fuzz \
FUZZ_NUM_RUNS=20 \
npm run test:live:fuzz
```

Document that the CN quickstart must expose participant A and B, both must have `Main:Iou`, `FUZZ_LIVE_RUN_ID` plus the actual `FUZZ_LIVE_ISSUER_PARTY` and `FUZZ_LIVE_OWNER_PARTY` should be held constant for replay, and the existing ledger-only DAML Ops stack is not a substitute for the required quickstart ledger API fixture. Name the node-0 and node-1 endpoint variables explicitly, including `SDK_TEST_LEDGER_ENDPOINT`, `SDK_TEST_SECONDARY_LEDGER_ENDPOINT`, and their admin equivalents.

- [ ] **Step 4: Start/verify the correct live environment.**

Use the existing CN quickstart launcher and explicit endpoint variables for two participants. Run a connectivity preflight before fuzzing. Do not infer success from open TCP ports; verify SDK health and `Main:Iou` active-contract queries.

- [ ] **Step 5: Run a one-run live smoke campaign.**

Run:

```bash
SDK_TEST_ENABLE_LIVE_FUZZING=1 \
FUZZ_LIVE_RUN_ID=local-live-fuzz \
FUZZ_NUM_RUNS=1 \
FUZZ_LIVE_MAX_COMMANDS=4 \
FUZZ_LIVE_REQUIRE_ARCHIVE=1 \
rtk npm run test:live:fuzz
```

Expected: one complete create/query/fetch/archive lifecycle across both participants, followed by cleanup.

- [ ] **Step 6: Run a seeded live campaign.**

Run the smoke campaign again with a fixed `FUZZ_SEED`, capture its command sequence, then rerun with the reported `FUZZ_PATH` and the same `FUZZ_LIVE_RUN_ID`. Expected: the generated sequence and observed behavior are reproduced.

- [ ] **Step 7: Run offline verification.**

Run:

```bash
rtk npm test -- tests/unit tests/property
rtk npm run build
rtk npx eslint tests/live/fuzz tests/live/specs/live-stateful-fuzzing.test.ts tests/unit/live/live-stateful-fuzzing.test.ts --max-warnings=0
```

Expected: offline tests, build, and targeted lint pass. The full repository lint may continue to report unrelated pre-existing violations.

- [ ] **Step 8: Commit the live property and documentation.**

```bash
git add tests/live/specs/live-stateful-fuzzing.test.ts README.md
git commit -m "test: add opt-in live stateful fuzzing"
```

## Task 6: Final verification and handoff

**Files:**
- No additional files expected.

- [ ] **Step 1: Run the offline property campaign with the default settings.**

Run: `rtk npm run test:property`

Expected: all offline property tests pass.

- [ ] **Step 2: Run the deeper offline stress campaign.**

Run: `rtk env FUZZ_NUM_RUNS=10000 npm run test:property`

Expected: all generated offline cases pass.

- [ ] **Step 3: Run the live smoke and seeded campaigns when Canton is available.**

Use the commands from Task 5 and record the exact endpoint configuration, run ID, seed, path, and observed result.

- [ ] **Step 4: Inspect repository state and commit history.**

Run: `rtk git status --short && rtk git log --oneline -8`

Expected: only intentional commits are present and the working tree is clean.

- [ ] **Step 5: Report limitations explicitly.**

Mention whether live verification ran, which localnet topology was used, whether cross-participant visibility was proven, and any unrelated repository lint failures. Do not claim live readiness from a TCP-only or ledger-only startup check.
