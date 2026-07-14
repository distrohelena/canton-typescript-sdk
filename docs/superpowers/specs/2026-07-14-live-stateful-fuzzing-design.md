# Live Stateful Fuzzing Design

**Date:** 2026-07-14  
**Status:** Approved design

## Goal

Add an opt-in, live-ledger property harness that exercises real SDK command and query APIs against two Canton participants. The harness should find ordering, visibility, and state-transition defects while preserving fast-check shrinking and reproducible failures.

## Scope

The first milestone is a gRPC-only live suite using the existing multi-node live-test runtime and the `Main:Iou` template already required by the CN quickstart live suite. The committed `sdk-live-test-model.dar` is a Splice utility archive and is not used as the command fixture. Both participants must already have the same `Main:Iou` package installed.

Generated sequences use only valid operations against that fixed model:

1. create a run-scoped contract;
2. query active contracts;
3. fetch the created contract;
4. query its lifecycle events;
5. exercise its archive choice; and
6. query its lifecycle events again.

The suite checks behavior through public `CantonClient` services. It does not generate arbitrary DAML-LF ASTs, upload arbitrary DARs, test JSON transport, test reassignment, or maintain a persistent corpus in this milestone.

## Live-first architecture

`fast-check` generates a bounded command sequence. The test executes every generated step against real participants and updates a lightweight expected-state model after each successful operation. The model is an oracle for expected active/archived state and payload identity; it is not a substitute for network execution.

When a property fails, fast-check shrinks the command sequence. Every shrink candidate is executed against Canton, so the minimized failure still includes live ordering, participant routing, visibility delays, and service behavior.

The implementation uses `fc.asyncProperty` and the existing property-runner seed/path options. Each run records its command sequence, participant target, generated payload marker, and observed contract ID so failure output is actionable.

## Command model and invariants

The generated command grammar always starts with `create`. While the model says the contract is active, it may generate `query`, `fetch`, `events`, or `exercise`; after `exercise`, only queries and lifecycle reads remain valid. The generator encodes these preconditions instead of filtering invalid commands inside the property. A forced smoke mode emits `create`, `query`, `fetch`, and `exercise` in that order.

The live executor uses:

- `commandService.submitAndWaitAsync` for create and exercise;
- `stateService.getActiveContractsPageAsync` for participant-specific visibility;
- `contractService.getContractAsync` for contract hydration; and
- `eventQueryService.getEventsByContractIdAsync` for lifecycle validation;
- `stateService.getLedgerEndAsync` for monotonic offset checks.

The invariants are:

- A successful create eventually appears in the creator’s active-contract query with the expected template and run marker.
- The second participant is mandatory, not conditional: the fixture allocates the issuer party on participant A and the owner party on participant B, creates an `Main:Iou` with `{ issuer, owner, amount }`, and requires the resulting contract to be observable from both parties.
- Fetch returns the same contract identity, template, and payload as the active-contract observation.
- A successful archive exercise eventually removes the contract from active-contract queries on all participants where it was visible.
- Lifecycle events contain the expected create and archive transitions for the contract.
- Participant ledger-end offsets never move backwards during a sequence. Offsets are compared as non-negative decimal `BigInt` values, not lexicographically.
- A command response and subsequent reads remain consistent with the model’s active/archived state.

Visibility assertions are eventual rather than immediate. Polling has a bounded timeout and reports the participant, expected state, last response, and ledger end when it expires.

## Fixtures and generated data

The fixture table is fixed:

| Field | Value |
| --- | --- |
| Template | `Main:Iou` |
| Create payload | `{ issuer: issuerParty, owner: ownerParty, amount: runMarkedGeneratedAmount }` |
| Create submitter | participant A, `actAs: [issuerParty]`, no cross-participant `readAs` |
| Cross-participant reader | participant B, queried as `ownerParty` |
| Archive choice | `Archive` with `{}` argument |
| Package setup | pre-installed CN quickstart package on both participants; no per-run DAR upload |

Setup proves package availability by listing package IDs on both participants, loading their package contents through the public package services, and confirming that each participant exposes the `Main.Iou` template. A template-filtered ACS query alone is not considered sufficient package proof.

Arbitraries generate only the amount suffix and sequence choices. The fixture hashes the run ID to a bounded integer component and combines it with the generated suffix to form a valid ten-decimal `Numeric` amount, so old contracts cannot satisfy the current run’s exact payload match. The two test parties are allocated once per test invocation—issuer on participant A and owner on participant B—and reused across all property runs and shrink candidates. For exact replay, the actual party IDs can be supplied through configuration; when they are not supplied, the suite reports the allocated IDs for a subsequent replay. Parties are intentionally not recreated for every candidate; Canton does not provide a general party deletion operation.

Contract IDs are discovered from active-contract or contract-service responses rather than inferred from command IDs. The run ID and generated amount together distinguish this invocation from old contracts while remaining a valid numeric value for `Main:Iou`.

## Cleanup and failure handling

Each property run is isolated with a unique marker and wrapped in `try/finally`. If contract discovery fails, cleanup searches both participants for active `Main:Iou` contracts matching the exact run-marked amount and parties, then attempts to archive each match through the same public command API. Cleanup is bounded independently from command execution and the campaign has an overall timeout. Cleanup failures are reported without hiding the original property failure.

The suite treats command rejection, malformed SDK responses, invariant mismatches, and polling timeouts as property failures. It does not silently retry failed commands; polling is reserved for eventual-consistency reads. Lifecycle event queries are also polled after archive until the created and archived records are indexed or the bounded timeout expires.

## Execution and CI boundary

Live fuzzing is disabled by default and enabled explicitly with `SDK_TEST_ENABLE_LIVE_FUZZING=1`. It uses the existing `SDK_TEST_*` endpoint variables and exactly two configured participant nodes. Defaults are: 20 property runs, maximum sequence length 8, 10 seconds per polling operation, 100 ms polling interval, 5 minutes per campaign, and 5 seconds for cleanup. The implementation exposes `FUZZ_NUM_RUNS`, `FUZZ_SEED`, `FUZZ_PATH`, `FUZZ_LIVE_MAX_COMMANDS`, `FUZZ_LIVE_POLL_TIMEOUT_MS`, `FUZZ_LIVE_POLL_INTERVAL_MS`, `FUZZ_LIVE_TEST_TIMEOUT_MS`, `FUZZ_LIVE_CLEANUP_TIMEOUT_MS`, `FUZZ_LIVE_RUN_ID`, `FUZZ_LIVE_ISSUER_PARTY`, `FUZZ_LIVE_OWNER_PARTY`, and `FUZZ_LIVE_REQUIRE_ARCHIVE`.

`FUZZ_LIVE_RUN_ID` is included in party hints and the numeric payload marker. `FUZZ_LIVE_ISSUER_PARTY` and `FUZZ_LIVE_OWNER_PARTY` may provide already allocated parties for exact replay without allocating new parties. For exact replay, hold these values, `FUZZ_LIVE_RUN_ID`, `FUZZ_SEED`, and `FUZZ_PATH` constant; when any are unset, the suite prints the generated run ID and actual party IDs. Shrink candidates reuse the same parties and run ID.

Offline unit and property suites remain independent of Canton. The live suite skips with a clear reason when the opt-in flag is absent and fails fast when the required participant endpoints are unavailable.

## Verification

The milestone is complete when:

1. the live property suite is opt-in and does not alter offline test behavior;
2. generated valid sequences execute against two real participants;
3. a failure can be reproduced from its seed, shrink path, and command sequence;
4. active, fetched, archived, lifecycle, cross-participant visibility, and ledger-end invariants are checked;
5. cleanup is attempted for every run; and
6. existing unit/property/build checks remain green.

## Deferred work

JSON live fuzzing, arbitrary template/DAR generation, multi-synchronizer reassignment, persistent regression corpora, and a public fuzzing package are separate follow-up milestones.
