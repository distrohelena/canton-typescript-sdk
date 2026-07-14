# Foundry-Style Live Fuzzing Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Extend the existing opt-in Canton live fuzz harness with Foundry-style runs/depth, weighted actions, actor routing, configurable revert handling, centralized invariants, and persisted counterexample replay.

**Architecture:** Preserve the existing `Main:Iou` two-participant fixture, polling, and cleanup APIs. Add a campaign layer that owns exact-depth action generation, typed outcomes, invariant snapshots, and replay identity; keep artifact serialization in a separate security-focused module. Use `fc.check` so the final minimized counterexample, rather than an intermediate execution, determines the persisted artifact.

**Tech Stack:** TypeScript, Vitest, fast-check, Node `fs/promises` and `crypto`, existing Canton gRPC SDK services.

---

## File map

### New files

- `tests/live/fuzz/live-fuzz-artifacts.ts` — allowlisted failure artifact schema, canonical JSON, fingerprinting, secure no-clobber writes, and replay loading.
- `tests/live/fuzz/live-fuzz-campaign.ts` — exact-depth campaign inputs, action weights, actor eligibility, campaign nonce/marker construction, and typed action outcomes.

### Modified files

- `tests/live/fuzz/live-fuzz-config.ts` — parse depth/legacy maximum precedence, revert policy, actors, action weights, failure/replay paths, and validation.
- `tests/live/fuzz/live-fuzz-commands.ts` — add `probe`, exact-depth generation, route-aware action descriptors, and model transitions after accepted/reverted actions.
- `tests/live/fuzz/live-fuzz-fixture.ts` — expose the explicit action route matrix and campaign-specific payload marker builder.
- `tests/live/fuzz/live-fuzz-runner.ts` — return campaign traces, classify command outcomes, evaluate centralized invariant snapshots, and support permissive reverts.
- `tests/live/specs/live-stateful-fuzzing.test.ts` — run persisted failures first, use `fc.check`, associate final counterexamples with traces, and write artifacts.
- `tests/unit/live/live-stateful-fuzzing.test.ts` — extend offline coverage for every new pure parser, generator, model, routing, artifact, and replay behavior.
- `.gitignore` — ignore `tests/live/.artifacts/`.
- `README.md` — document Foundry-style settings, replay, legacy compatibility, and strict smoke configuration.

No SDK runtime/public API files change.

## Task 1: Add campaign configuration and compatibility parsing

**Files:**
- Modify: `tests/live/fuzz/live-fuzz-config.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`
- Test: `tests/property/property-test-options.test.ts`

- [ ] **Step 1: Write failing configuration tests.**

Cover:

- `FUZZ_LIVE_DEPTH` defaults to exact depth 8 when legacy maximum is absent;
- only `FUZZ_LIVE_MAX_COMMANDS` selects deprecated variable-length compatibility mode;
- both settings equal is accepted, conflicting values fail;
- `FUZZ_LIVE_FAIL_ON_REVERT` accepts only `true`/`false` and defaults false;
- `FUZZ_LIVE_ACTION_WEIGHTS` parses whitespace, non-negative integers, duplicates, unknown actions, empty entries, and unsafe values;
- default weights include `query`, `fetch`, `events`, `exercise`, and `probe`;
- `FUZZ_LIVE_ACTORS` defaults to issuer/owner, rejects unsupported names, and requires issuer;
- `FUZZ_LIVE_FAILURE_DIR` and `FUZZ_LIVE_REPLAY_FILE` are returned without exposing credentials;
- archive smoke mode requires strict revert mode and preserves legacy maximum behavior; and
- existing offline property defaults remain unchanged.

- [ ] **Step 2: Run the focused test to establish failure.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because the new configuration fields and validation are absent.

- [ ] **Step 3: Implement configuration parsing.**

Add explicit `depthMode: "exact" | "legacy-max"`, `depth`, `maxCommands?`, `failOnRevert`, `actionWeights`, `actors`, `failureDir`, and `replayFile` fields. Parse `FUZZ_LIVE_DEPTH` first; retain `FUZZ_LIVE_MAX_COMMANDS` only as the old maximum-length mode. Validate reachable-state action weights: exact-depth campaigns need a positive `probe` fallback and at least one eligible post-archive read action; actor subsets remove invalid routes before weight validation.

- [ ] **Step 4: Run configuration tests, build, and lint.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts tests/property/property-test-options.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint tests/live/fuzz/live-fuzz-config.ts tests/unit/live/live-stateful-fuzzing.test.ts --max-warnings=0`

- [ ] **Step 5: Commit the configuration boundary.**

```bash
rtk git add tests/live/fuzz/live-fuzz-config.ts tests/unit/live/live-stateful-fuzzing.test.ts
rtk git commit -m "test: add Foundry-style live fuzz configuration"
```

## Task 2: Add exact-depth weighted action generation and typed outcomes

**Files:**
- Create: `tests/live/fuzz/live-fuzz-campaign.ts`
- Modify: `tests/live/fuzz/live-fuzz-commands.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Write failing generator/model tests.**

Assert that exact mode:

- always emits exactly `depth` actions with `create` in slot zero;
- emits `probe` after a rejected create without inventing a contract;
- renormalizes weights over eligible actions and never emits actor-ineligible routes;
- never emits fetch/exercise without an active contract;
- preserves the deterministic four-action smoke sequence;
- includes a 128-bit campaign nonce in generated inputs; and
- produces deterministic inputs from the same seed and path.

Assert the discriminated command outcome union distinguishes accepted, protocol-revert, transport, timeout, malformed-response, and unknown-commit outcomes. Model transitions must apply state changes only for accepted commands.

- [ ] **Step 2: Run the focused test to establish failure.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because exact-depth campaign inputs, probe actions, and typed outcomes are missing.

- [ ] **Step 3: Implement the campaign input and scheduler.**

Define a generated input containing `commands`, `amountSuffix`, and `campaignNonce: bigint`. Keep the existing legacy arbitrary available when `depthMode` is `legacy-max`. In exact mode, use a fixed-length state-aware scheduler with a guaranteed no-contract `probe` fallback and state-dependent weight normalization. Validate collision-free campaign markers within one invocation and derive the numeric payload marker from run ID, nonce, amount input, and canonical action sequence.

- [ ] **Step 4: Implement typed outcomes and model transitions.**

Add pure classification and transition helpers. A protocol revert records an outcome and leaves model state unchanged in permissive mode; all other failure classes remain fatal. Keep invariant failures separate from command outcomes.

- [ ] **Step 5: Run tests, build, and lint.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint tests/live/fuzz/live-fuzz-campaign.ts tests/live/fuzz/live-fuzz-commands.ts tests/unit/live/live-stateful-fuzzing.test.ts --max-warnings=0`

- [ ] **Step 6: Commit the action model.**

```bash
rtk git add tests/live/fuzz/live-fuzz-campaign.ts tests/live/fuzz/live-fuzz-commands.ts tests/unit/live/live-stateful-fuzzing.test.ts
rtk git commit -m "test: add exact-depth live fuzz campaign model"
```

## Task 3: Make routing and invariants explicit in the live runner

**Files:**
- Modify: `tests/live/fuzz/live-fuzz-fixture.ts`
- Modify: `tests/live/fuzz/live-fuzz-runner.ts`
- Modify: `tests/live/fuzz/live-fuzz-campaign.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Write failing route and invariant tests.**

Assert the route matrix:

- create: participant A, issuer `actAs`, empty `readAs`;
- issuer reads: participant A and issuer party;
- owner reads: participant B and owner party;
- archive: participant A, issuer `actAs`, empty `readAs`; and
- probe: selected participant ACS plus ledger end.

Test `evaluateLiveInvariants(phase, snapshot)` for after-action, end-of-campaign, and post-cleanup policies. Include accepted/reverted outcomes, uniqueness of run-marked active contracts, ledger-end monotonicity, lifecycle evidence, and final absence.

- [ ] **Step 2: Run the focused tests to establish failure.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because routes and the centralized snapshot API are not implemented.

- [ ] **Step 3: Implement explicit route descriptors.**

Replace implicit participant handling with descriptors carrying actor, participant, client route, querying party, `actAs`, `readAs`, and concrete SDK operation. Reject unsupported routes during generation/configuration rather than silently rerouting archive through issuer.

- [ ] **Step 4: Implement campaign snapshots and invariant aggregation.**

Add a read-only snapshot containing model state, ACS summaries, ledger ends, lifecycle records, run-marked contract IDs, and the latest action record. Route all action handlers through `evaluateLiveInvariants`; keep polling and cleanup diagnostics intact. On unknown commit outcomes, always run the exact marker scan before deciding cleanup is complete.

- [ ] **Step 5: Run offline tests, build, and lint.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint tests/live/fuzz/live-fuzz-fixture.ts tests/live/fuzz/live-fuzz-runner.ts tests/live/fuzz/live-fuzz-campaign.ts tests/unit/live/live-stateful-fuzzing.test.ts --max-warnings=0`

- [ ] **Step 6: Commit routing and invariants.**

```bash
rtk git add tests/live/fuzz/live-fuzz-fixture.ts tests/live/fuzz/live-fuzz-runner.ts tests/live/fuzz/live-fuzz-campaign.ts tests/unit/live/live-stateful-fuzzing.test.ts
rtk git commit -m "test: add explicit live fuzz routes and invariants"
```

## Task 4: Implement secure persisted counterexamples and replay loading

**Files:**
- Create: `tests/live/fuzz/live-fuzz-artifacts.ts`
- Modify: `.gitignore`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Write failing artifact tests.**

Cover:

- canonical JSON and SHA-256 fixture/configuration fingerprints;
- allowlisted artifact serialization with no endpoint, token, headers, or arbitrary error fields;
- schema validation and stale/foreign fingerprint rejection;
- replay identity matching for run ID and party IDs;
- safe filename generation;
- `0700` directory and `0600` file modes;
- symlinked parent/destination rejection;
- no-clobber atomic writes using same-directory temporary files, `fsync`, hard-link destination, cleanup, and directory `fsync`; and
- replay loading of exact actions/payload without regeneration.

- [ ] **Step 2: Run the focused test to establish failure.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because the artifact module is missing.

- [ ] **Step 3: Implement the artifact schema and canonicalization.**

Define a versioned JSON schema containing fixture/config fingerprint, run ID, parties, nonce, payload marker, actions, typed outcomes, invariant failures, ledger diagnostics, fast-check seed/path, `numRuns`, `numShrinks`, and counterexample path. Serialize only allowlisted fields.

- [ ] **Step 4: Implement secure persistence and loading.**

Validate every parent component with `lstat`, create/verify restrictive modes, write a same-directory temporary file, `fsync`, atomically hard-link to a non-existing destination, unlink the temporary file, and `fsync` the directory. Reject path traversal, symlinks, destination collisions, corrupt JSON, unknown schema, and fingerprint mismatches according to explicit replay versus automatic-replay policy.

- [ ] **Step 5: Add the artifact directory to gitignore and verify.**

Add `tests/live/.artifacts/` to `.gitignore`, then run the focused unit test and targeted lint.

- [ ] **Step 6: Commit artifact support.**

```bash
rtk git add tests/live/fuzz/live-fuzz-artifacts.ts tests/unit/live/live-stateful-fuzzing.test.ts .gitignore
rtk git commit -m "test: persist secure live fuzz counterexamples"
```

## Task 5: Integrate `fc.check`, final shrink traces, and replay-first campaigns

**Files:**
- Modify: `tests/live/specs/live-stateful-fuzzing.test.ts`
- Modify: `tests/live/fuzz/live-fuzz-runner.ts`
- Modify: `tests/live/fuzz/live-fuzz-campaign.ts`
- Modify: `tests/live/fuzz/live-fuzz-artifacts.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`

- [ ] **Step 1: Write failing integration-shape tests.**

Test pure orchestration helpers that:

- key traces by the complete generated input including nonce;
- associate the final `RunDetails.counterexample` with exactly one trace;
- report `numRuns`, `numShrinks`, and counterexample path;
- replay stored actions before generated campaigns; and
- preserve the original property failure when artifact writing or cleanup fails.

- [ ] **Step 2: Run the focused test to establish failure.**

Run: `rtk npm test -- tests/unit/live/live-stateful-fuzzing.test.ts`

Expected: FAIL because the live spec still uses `fc.assert` and has no replay/artifact orchestration.

- [ ] **Step 3: Replace `fc.assert` with `fc.check`.**

Run replay artifacts first when configured, then execute generated exact-depth inputs with `fc.check`. Record each candidate trace before live execution, use the final `RunDetails.counterexample` as the sole artifact source, and persist only after shrinking completes. Keep live setup once per invocation and reuse parties across all campaigns.

- [ ] **Step 4: Implement permissive and strict revert execution.**

Classify command failures, continue only for protocol reverts when `failOnRevert=false`, consume the depth slot, run probes/invariants, and preserve strict failure behavior when true. Ensure smoke mode requires strict reverts and fixed four-step behavior.

- [ ] **Step 5: Run offline tests, disabled live command, build, and lint.**

Run: `rtk npm test -- tests/unit tests/property`

Run: `rtk npm run test:live:fuzz`

Run: `rtk npm run build`

Run: `rtk npx eslint tests/live/fuzz tests/live/specs/live-stateful-fuzzing.test.ts tests/unit/live/live-stateful-fuzzing.test.ts --max-warnings=0`

- [ ] **Step 6: Commit the campaign integration.**

```bash
rtk git add tests/live/specs/live-stateful-fuzzing.test.ts tests/live/fuzz tests/unit/live/live-stateful-fuzzing.test.ts
rtk git commit -m "test: integrate Foundry-style live fuzz replay"
```

## Task 6: Document parity controls and run final verification

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-14-foundry-style-live-fuzzing-parity-implementation-plan.md`

- [ ] **Step 1: Update README usage.**

Document exact-depth mode, legacy maximum compatibility, `FUZZ_LIVE_FAIL_ON_REVERT=true|false`, action weights, actor subsets, failure directory, replay file, artifact redaction, and strict smoke invocation.

- [ ] **Step 2: Mark the plan and verify the complete repository.**

Run:

```bash
rtk npm test -- tests/unit tests/property
rtk npm run test:property
rtk npm run test:live:fuzz
rtk npm run build
rtk npx eslint tests/live/fuzz tests/live/specs/live-stateful-fuzzing.test.ts tests/unit/live/live-stateful-fuzzing.test.ts --max-warnings=0
rtk git diff --check
rtk git status --short
```

Expected: offline tests, property tests, build, targeted lint, and disabled live fuzz pass; the working tree is clean after the final commit. The opt-in live smoke may only be attempted when the CN quickstart preflight is available.

- [ ] **Step 3: Commit documentation and final plan state.**

```bash
rtk git add README.md docs/superpowers/plans/2026-07-14-foundry-style-live-fuzzing-parity-implementation-plan.md
rtk git commit -m "Document Foundry-style live fuzz controls"
```

