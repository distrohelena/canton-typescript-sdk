# Foundry-Style Live Fuzzing Design

**Date:** 2026-07-14  
**Status:** Proposed for implementation

## Goal

Extend the existing opt-in Canton live fuzz harness with the useful semantics of Foundry invariant campaigns while preserving Canton-specific eventual-consistency checks, deterministic cleanup, and fast-check shrinking.

The target is behavioral parity, not a Solidity or EVM compatibility layer. The SDK remains a TypeScript harness over real Canton participants.

## Foundry semantics mapped to Canton

| Foundry concept | SDK equivalent |
| --- | --- |
| `runs` | Number of generated live campaigns executed by `fc.asyncProperty` |
| `depth` | Exact number of generated action slots per campaign |
| Target selectors | Named SDK actions with configurable weights |
| Target senders | Configured issuer/owner actors and participant routing |
| Handler/ghost state | The live command model and per-run invariant state |
| Invariant hook | Centralized invariant evaluation after every action and at campaign end |
| `fail_on_revert` | Per-campaign `FUZZ_LIVE_FAIL_ON_REVERT=true\|false` |
| Counterexample replay | Persisted JSON failure artifacts containing seed, path, actions, actors, and run marker |
| `afterInvariant` | Bounded cleanup and final campaign invariant hook |

The harness will retain one important intentional difference: Canton runs share a live ledger and cannot be reset like an EVM snapshot. Every campaign therefore uses a unique run marker and bounded cleanup.

## Campaign configuration

The existing opt-in flag remains required. New settings are campaign-scoped and read once at test setup:

- `FUZZ_NUM_RUNS` — number of campaigns; retains the existing environment variable name.
- `FUZZ_LIVE_DEPTH` — exact action count per campaign; defaults to `8` and replaces variable-length-only semantics.
- `FUZZ_LIVE_FAIL_ON_REVERT=true|false` — whether an expected command rejection fails the campaign; defaults to `false` to match Foundry.
- `FUZZ_LIVE_ACTION_WEIGHTS` — optional comma-separated weights such as `query=30,fetch=20,events=20,exercise=10`.
- `FUZZ_LIVE_ACTORS` — optional comma-separated actor set, defaulting to `issuer,owner`.
- `FUZZ_LIVE_FAILURE_DIR` — optional directory for persisted JSON counterexamples; defaults to `tests/live/.artifacts/failures` and is gitignored.
- `FUZZ_LIVE_REPLAY_FILE` — optional exact counterexample file to replay instead of generating actions.
- Existing seed, shrink-path, timeout, run ID, party, endpoint, and smoke settings remain supported.

Boolean parsing accepts only `true` or `false` for the new revert setting. Invalid values fail before clients or parties are created.

The public offline property default remains 100 runs. Live campaigns use their own default of 20 runs and an exact depth of 8.

## Action model

The current fixed fixture remains the first target: one `Main:Iou`, issuer on participant A, owner on participant B. The generator changes from a fixed create-plus-variable-segments grammar to a state-aware action scheduler:

1. slot zero is always `create`;
2. each remaining slot samples an enabled action according to configured weights;
3. pre-archive actions are `query`, `fetch`, `events`, and `exercise`;
4. after archive, only `query` and `events` are eligible;
5. `fetch` and `exercise` are never generated without a known active contract;
6. actor/participant selection is sampled from the configured actor set and the action’s valid routes; and
7. the exact smoke mode remains a deterministic four-action replay sequence.

The grammar must produce exactly `FUZZ_LIVE_DEPTH` slots, even when a command later reverts. This makes the depth dimension comparable to Foundry and ensures a failed action still consumes a slot.

Weights are normalized once at setup. Zero-weight actions are excluded. A configuration with no positive enabled action weight fails before live setup.

## Revert policy

Every command submission is attempted once. The runner classifies command rejection separately from transport failure, malformed response, timeout, and invariant failure.

With `FUZZ_LIVE_FAIL_ON_REVERT=false`, a rejected action is recorded in the model and campaign trace, consumes its depth slot, and execution continues with the next state-valid action. No state transition is applied unless the command was accepted. Reads and invariants still run after the rejected action.

With `FUZZ_LIVE_FAIL_ON_REVERT=true`, the first rejected action fails the campaign after recording the full trace.

Transport errors, setup errors, polling timeouts, cleanup errors, and invariant mismatches always fail; they are not treated as protocol reverts.

## Invariant lifecycle

The runner exposes one central invariant evaluation path rather than embedding unrelated assertions only inside individual action handlers.

After every action, it evaluates:

- model state is internally valid;
- any known active contract matches the exact template, parties, and run-marked payload;
- participant visibility agrees with the model after bounded polling;
- ledger-end offsets are monotonic per participant; and
- accepted create/archive actions have the corresponding lifecycle evidence.

At campaign end, it evaluates the final model and cross-participant state before cleanup. Cleanup then archives remaining run-marked contracts and performs a final absence check. Cleanup diagnostics remain secondary to the original failure.

The invariant interface is internal to the test harness for now. It should accept a read-only campaign snapshot and return structured failures so future invariants can be added without changing action generation.

## Actors and routing

Actors are logical names, not arbitrary party creation during fuzzing. The fixture allocates or reuses the issuer and owner once per invocation. The actor configuration controls which logical parties may be selected for action metadata and valid command routes.

Actions must carry both actor and participant in their trace. The runner validates that the selected route is legal before submission. It must never manufacture cross-participant `readAs` values or silently reroute a requested action without recording the route actually used.

Future fixtures may register additional actors and actions, but the first implementation must keep the two-party `Main:Iou` setup and reject unsupported actor names during configuration parsing.

## Replay artifacts

On a failed campaign, the runner writes one JSON artifact atomically under the configured failure directory. The artifact includes:

- schema version;
- campaign run ID;
- fast-check seed and counterexample path;
- exact depth and action weights;
- actor and party IDs;
- generated amount suffix and canonical payload;
- full action list with actor, participant, command kind, accepted/reverted outcome, and error text;
- discovered contract ID when available; and
- last known ledger ends and invariant failures.

The artifact must not contain bearer tokens or endpoint credentials. Directory creation is bounded by normal filesystem errors and a failed artifact write must be reported without replacing the original property failure.

`FUZZ_LIVE_REPLAY_FILE` loads one artifact, validates its schema and campaign compatibility, and executes its exact action list. Seed/path remain recorded for comparison but do not regenerate or mutate the replayed action list.

Failure files are replayed before generated campaigns when a failure directory is configured, matching Foundry’s regression-oriented workflow. A command-line or environment switch can disable automatic persisted-failure replay for clean campaigns.

## Failure and cleanup behavior

The runner preserves the current bounded per-action polling, campaign timeout, and cleanup timeout. A rejected action does not trigger cleanup unless it may have produced an unknown partial contract; in that case the exact run marker scan is used.

The original failure is thrown after cleanup. If no primary failure exists and cleanup fails, cleanup is the campaign failure. Concurrent campaign execution remains disabled because all campaigns share the same two participant endpoints.

## Verification

Offline tests must cover:

- exact runs/depth behavior;
- action weight normalization and invalid configuration;
- actor and participant routing;
- permissive and strict revert transitions;
- centralized invariant aggregation;
- deterministic failure artifact serialization;
- replay loading without regeneration; and
- backward compatibility of existing live and offline property options.

Live smoke verification must run one exact-depth archive campaign with strict revert mode and an explicit failure directory. The default disabled live command must remain network-free.

## Non-goals

This milestone does not implement Solidity ABI compatibility, EVM snapshots, arbitrary DAML-LF/DAR generation, JSON transport fuzzing, reassignment fuzzing, multiple simultaneous contracts, or a public SDK fuzzing API.

