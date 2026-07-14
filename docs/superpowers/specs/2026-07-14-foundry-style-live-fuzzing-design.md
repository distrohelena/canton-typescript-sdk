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
- `FUZZ_LIVE_DEPTH` — exact action count per campaign; defaults to `8` when the legacy maximum is not set. `FUZZ_LIVE_MAX_COMMANDS` remains a compatibility setting when depth is unset; if both are set to different values, setup fails.
- `FUZZ_LIVE_FAIL_ON_REVERT=true|false` — whether an expected command rejection fails the campaign; defaults to `false` to match Foundry.
- `FUZZ_LIVE_ACTION_WEIGHTS` — optional comma-separated weights such as `query=30,fetch=20,events=20,exercise=10,probe=20`.
- `FUZZ_LIVE_ACTORS` — optional comma-separated actor set, defaulting to `issuer,owner`.
- `FUZZ_LIVE_FAILURE_DIR` — optional directory for persisted JSON counterexamples; defaults to `tests/live/.artifacts/failures` and is gitignored.
- `FUZZ_LIVE_REPLAY_FILE` — optional exact counterexample file to replay instead of generating actions.
- Existing seed, shrink-path, timeout, run ID, party, endpoint, and smoke settings remain supported.

Boolean parsing accepts only `true` or `false` for the new revert setting. Invalid values fail before clients or parties are created.

The public offline property default remains 100 runs. Live campaigns use their own default of 20 runs and an exact depth of 8. `FUZZ_LIVE_REQUIRE_ARCHIVE=1|0` remains accepted for backward compatibility; its true/false equivalent is also accepted. When enabled, smoke mode requires exact depth 4 and fails on conflicting depth settings rather than silently truncating a campaign.

`runs` means the configured number of generated campaign cases. Fast-check shrink attempts are additional executions and are reported separately; they do not consume the configured run count. `depth` includes the mandatory first `create` slot and every later action slot, including slots consumed by rejected actions. If only `FUZZ_LIVE_MAX_COMMANDS` is present, the existing variable-length grammar remains available for backward compatibility and is marked deprecated; explicit `FUZZ_LIVE_DEPTH` selects exact-depth mode.

## Action model

The current fixed fixture remains the first target: one `Main:Iou`, issuer on participant A, owner on participant B. The generator changes from a fixed create-plus-variable-segments grammar to a state-aware action scheduler:

1. slot zero is always `create`;
2. each remaining slot samples an enabled action according to configured weights;
3. pre-archive actions are `query`, `fetch`, `events`, `exercise`, and a no-contract `probe` action;
4. after archive, only `query`, `events`, and `probe` are eligible;
5. `fetch` and `exercise` are never generated without a known active contract;
6. actor/participant selection is sampled from the configured actor set and the action’s valid routes; and
7. the exact smoke mode remains a deterministic four-action replay sequence.

The grammar must produce exactly `FUZZ_LIVE_DEPTH` slots, even when a command later reverts. This makes the depth dimension comparable to Foundry and ensures a failed action still consumes a slot. In the no-contract state, `probe` is a mandatory fallback action that reads ACS and ledger state without requiring a contract. Exact-depth mode therefore requires a positive `probe` weight whenever depth exceeds one; after archive it requires at least one positive weight among `query`, `events`, and `probe`. Configuration validation checks every reachable model state before live setup.

Weights use the grammar `action=non-negative-integer`, separated by commas, with surrounding whitespace trimmed. Empty entries, duplicate names, unknown names, malformed numbers, unsafe values, and a missing action name fail before live setup. The default weights are `query=30,fetch=20,events=20,exercise=10,probe=20`; `create` is fixed and not weighted. Weights are renormalized over currently eligible actions at each slot. Zero-weight actions are excluded, except that validation rejects a zero `probe` weight when exact depth could reach the no-contract state. A configuration with no positive eligible action weight fails before live setup. A rejected first create still consumes its slot; the remaining `probe` actions preserve exact depth without pretending a contract exists.

## Revert policy

Every command submission is attempted once. The runner classifies command rejection separately from transport failure, malformed response, timeout, and invariant failure.

With `FUZZ_LIVE_FAIL_ON_REVERT=false`, a rejected action is recorded in the model and campaign trace, consumes its depth slot, and execution continues with the next state-valid action. No state transition is applied unless the command was accepted. Reads and invariants still run after the rejected action.

With `FUZZ_LIVE_FAIL_ON_REVERT=true`, the first rejected action fails the campaign after recording the full trace.

The classifier recognizes only explicit Canton ledger command rejections as protocol reverts. Every action records a discriminated outcome:

```ts
type ActionOutcome =
    | { kind: "accepted"; transactionId?: string }
    | { kind: "protocol-revert"; message: string }
    | { kind: "transport-error"; message: string }
    | { kind: "timeout"; message: string }
    | { kind: "malformed-response"; message: string }
    | { kind: "unknown-commit-outcome"; message: string }
    | { kind: "invariant-failure"; message: string };
```

Transport errors, request timeouts, malformed responses, and unknown commit outcomes are distinct failure classes and always fail; an unknown outcome triggers the run-marker cleanup scan because the submission may have committed remotely. The outcome kind is persisted in traces and artifacts.

## Invariant lifecycle

The runner exposes one central invariant evaluation path rather than embedding unrelated assertions only inside individual action handlers. Its internal API is:

```ts
evaluateLiveInvariants(snapshot: LiveCampaignSnapshot): readonly InvariantFailure[]
```

The snapshot contains the model, per-participant ACS summaries, ledger ends, lifecycle evidence, the most recent action outcome, and the set of run-marked contract IDs. Each failure has a stable name, phase, participant, and diagnostic details.

After every action, it evaluates:

- model state is internally valid;
- any known active contract matches the exact template, parties, and run-marked payload;
- participant visibility agrees with the model after bounded polling;
- ledger-end offsets are monotonic per participant; and
- accepted create/archive actions have the corresponding lifecycle evidence;
- the run marker identifies at most one active contract per campaign; and
- final campaign state contains no run-marked active contracts after cleanup.

At campaign end, it evaluates the final model and cross-participant state before cleanup. Cleanup then archives remaining run-marked contracts and performs a final absence check. Cleanup diagnostics remain secondary to the original failure.

The invariant interface is internal to the test harness for now. It should accept a read-only campaign snapshot and return structured failures so future invariants can be added without changing action generation.

## Actors and routing

Actors are logical names, not arbitrary party creation during fuzzing. The fixture allocates or reuses the issuer and owner once per invocation. The actor configuration controls which logical parties may be selected for action metadata and valid command routes.

Actions must carry actor, participant, client route, `actAs`, and `readAs` in their trace. The first fixture’s route matrix is explicit:

| Action | Actor | Client | Read/query party | `actAs` | `readAs` | SDK operation |
| --- | --- | --- | --- | --- | --- | --- |
| create | issuer | A | — | `[issuer]` | `[]` | `CreateCommand` |
| query/fetch/events | issuer | A | issuer | — | — | state/contract/event read |
| query/fetch/events | owner | B | owner | — | — | state/contract/event read |
| exercise/archive | issuer | A | — | `[issuer]` | `[]` | `ExerciseCommand(Archive, {})` |
| probe | none | selected participant | selected party | — | — | ACS plus ledger-end read |

Owner is not a valid archive controller in this fixture. The runner validates this matrix before submission and never silently reroutes a requested action. `exercise` is the generated action name; its concrete command is the `Archive` choice shown in the table.

Future fixtures may register additional actors and actions, but the first implementation must keep the two-party `Main:Iou` setup and reject unsupported actor names during configuration parsing.

## Replay artifacts

The property runner uses `fc.check`/`RunDetails` rather than writing an artifact from an intermediate predicate failure. Each execution trace is keyed by its campaign ordinal and canonical generated input; shrink executions cannot overwrite another trace. After fast-check reports the final minimized counterexample, the runner selects that exact trace and writes one JSON artifact atomically under the configured failure directory. The artifact includes:

- schema version;
- campaign run ID;
- fast-check seed and counterexample path;
- exact depth and action weights;
- actor and party IDs;
- generated amount suffix, campaign ordinal, and canonical payload;
- full action list with actor, participant, command kind, accepted/reverted outcome, and error text;
- discovered contract ID when available;
- last known ledger ends and invariant failures;
- `RunDetails.numRuns`, `RunDetails.numShrinks`, and `RunDetails.counterexamplePath`; and
- the action outcome union for every executed slot.

The artifact must not contain bearer tokens or endpoint credentials. Directory creation is bounded by normal filesystem errors and a failed artifact write must be reported without replacing the original property failure.

`FUZZ_LIVE_REPLAY_FILE` loads one artifact, validates its schema and a fixture/configuration fingerprint, and executes its exact action list and payload marker. Seed/path remain recorded for comparison but do not regenerate or mutate the replayed action list. Stored party IDs and run ID must either match explicitly supplied configuration or be used directly from the artifact; otherwise replay fails before live setup. A fingerprint mismatch marks the artifact stale or foreign; explicit replay rejects it, while automatic failure-directory replay reports it and continues with valid artifacts only. Corrupt and schema-unknown artifacts follow the same rules. Automatic replay never overwrites the original failure.

Failure files are replayed before generated campaigns when a failure directory is configured, matching Foundry’s regression-oriented workflow. A command-line or environment switch can disable automatic persisted-failure replay for clean campaigns.

Artifact serialization is allowlisted and excludes endpoint URLs, bearer tokens, request headers, and arbitrary error object fields. Files use safe generated names, a `0o700` failure directory, `0o600` files, and exclusive atomic creation that rejects symlink/path traversal targets. Every existing parent component is checked with `lstat` and must not be a symlink; directory and file modes are verified after creation. Writes use a same-directory temporary file, `fsync`, atomic rename, and directory `fsync`. The failure directory is gitignored.

## Failure and cleanup behavior

The runner preserves the current bounded per-action polling, campaign timeout, and cleanup timeout. A rejected action does not trigger cleanup unless it may have produced an unknown partial contract; in that case the exact run marker scan is used.

Invariant evaluation has three explicit phases: `after-action` snapshots validate the live model after each slot; `end-of-campaign` validates the model and observed ledger state before cleanup, allowing the model’s known active contract; and `post-cleanup` validates the same invariant API with the additional requirement that no run-marked active contracts remain.

The original failure is thrown after cleanup. If no primary failure exists and cleanup fails, cleanup is the campaign failure. Concurrent campaign execution remains disabled because all campaigns share the same two participant endpoints. A unique user-supplied or invocation-generated `runId` is required for each live campaign invocation. Each fast-check execution receives a monotonically increasing campaign ordinal, including shrink executions. The payload marker includes a deterministic digest of the run ID, ordinal, generated amount input, and action sequence; the runner rejects a marker collision within the invocation. The exact marker is persisted in the artifact and used during replay and ambiguous-outcome cleanup. Shrink candidates reuse the invocation namespace but have distinct ordinals and therefore distinct markers.

## Verification

Offline tests must cover:

- exact runs/depth behavior, including rejected first creates and fast-check shrink accounting;
- action weight normalization and invalid configuration;
- actor and participant routing;
- permissive and strict revert transitions;
- centralized invariant aggregation;
- deterministic failure artifact serialization and redaction;
- replay loading without regeneration, including stale/corrupt artifact handling; and
- trace association with the final minimized `RunDetails` counterexample, including run and shrink counts; and
- backward compatibility of existing live and offline property options.

Live smoke verification must run one exact-depth archive campaign with strict revert mode and an explicit failure directory. The default disabled live command must remain network-free.

Legacy option precedence is tested explicitly: `FUZZ_LIVE_DEPTH` selects exact-depth mode; when it is unset, `FUZZ_LIVE_MAX_COMMANDS` preserves the prior maximum-length behavior and emits a deprecation notice; when both are set, equal values are accepted and conflicting values fail setup. Existing `FUZZ_LIVE_REQUIRE_ARCHIVE=1|0` behavior remains valid. In smoke mode, exact depth must be 4: a legacy maximum must be exactly 4, and an explicit depth must be exactly 4.

## Non-goals

This milestone does not implement Solidity ABI compatibility, EVM snapshots, arbitrary DAML-LF/DAR generation, JSON transport fuzzing, reassignment fuzzing, multiple simultaneous contracts, or a public SDK fuzzing API.
