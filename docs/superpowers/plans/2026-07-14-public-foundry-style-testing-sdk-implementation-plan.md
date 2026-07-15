# Public Foundry-Style Testing SDK Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an experimental public `@distrohelena/canton-typescript-sdk/testing` API for Foundry-style fuzzing and invariant testing on Canton, combining declarative DAML targets with typed TypeScript handlers.

**Architecture:** Build a public, pure campaign core before connecting it to Canton. The core owns immutable definitions, runs/depth scheduling, handlers, invariants, metrics, replay, and safe artifacts; a runtime adapter owns actors, ledger reconciliation, and explicit isolation. A DAML-LF catalog then supplies declarative template/choice actions and well-typed value arbitraries. Finally, migrate the existing `Main:Iou` live fuzz suite onto the public engine as an integration proof.

**Tech Stack:** TypeScript 5.9, fast-check 4, Vitest, existing Canton gRPC clients, existing DAML-LF loader/semantic model, Node `crypto` and `fs/promises`.

---

## Delivery order

1. Public core and typed handlers — useful without DAR discovery or a live participant.
2. Canton runtime and isolation — turns the core into a safe live testing engine.
3. DAML-LF declarative coverage — broadens the action surface automatically.
4. Migration, CLI ergonomics, and hardening — proves the public API against the current live fixture.

Do not begin a later delivery checkpoint until the preceding checkpoint's focused tests, full build, lint, and package-content checks pass. The existing `tests/live/fuzz` modules remain intact until Task 10; they are the behavior oracle during migration.

## File map

### New public modules

- `src/testing/index.ts` — only the public experimental testing exports.
- `src/testing/campaign/campaign-definition.ts` — immutable campaign configuration and definition validation.
- `src/testing/campaign/campaign-types.ts` — public interfaces, branded names, outcomes, traces, failures, and results.
- `src/testing/campaign/campaign-scheduler.ts` — pure exact-depth target selection, weights, discard accounting, and probe fallback.
- `src/testing/campaign/campaign-runner.ts` — `fc.check` orchestration, hook order, shrinking, and replay execution.
- `src/testing/campaign/campaign-model.ts` — ledger projection/ghost-state separation and reconciliation transitions.
- `src/testing/campaign/campaign-metrics.ts` — deterministic per-target/actor/outcome metrics.
- `src/testing/campaign/campaign-artifact.ts` — versioned allowlisted replay artifacts and secure no-clobber persistence.
- `src/testing/handlers/handler.ts` — typed handler construction, `assume`, `bound`, and cleanup contracts.
- `src/testing/targets/target.ts` — declarative target builders and target/exclusion precedence.
- `src/testing/runtime/canton-test-runtime.ts` — actor routes, command/read adapter, polling, and capability detection.
- `src/testing/runtime/campaign-isolation.ts` — snapshot, cleanup, and external reset policies.
- `src/testing/daml/daml-testing-catalog.ts` — selected-template/choice catalog from a DAML-LF compilation.
- `src/testing/daml/daml-value-arbitrary.ts` — recursive, bounded fast-check arbitraries for supported DAML-LF values.
- `src/testing/errors/invariant-campaign-failure.ts` — failure carrying a safe result summary and optional artifact path.
- `src/testing/errors/testing-configuration-error.ts` — public invalid-definition and unsupported-capability error.

### Existing modules to integrate, not duplicate

- `src/index.ts` and `package.json` — package boundary; add only the `./testing` export.
- `src/daml-lf/daml-lf-package-loader.ts`, `src/daml-lf/daml-lf-compilation.ts`, and `src/daml-lf/semantics/daml-lf-semantic-model.ts` — metadata input for declarative targets.
- `src/client/canton-client.ts` and the command/state/update service clients — live command and ledger-read implementations behind the runtime adapter.
- `tests/live/fuzz/live-fuzz-*.ts` — current implementation used as migration oracle, then slimmed to public-API fixture helpers.
- `README.md` — experimental API, isolation warning, Foundry mapping, and replay guidance.

### New tests

- `tests/unit/testing/campaign-definition.test.ts`
- `tests/unit/testing/campaign-scheduler.test.ts`
- `tests/unit/testing/campaign-model.test.ts`
- `tests/unit/testing/campaign-runner.test.ts`
- `tests/unit/testing/campaign-artifact.test.ts`
- `tests/unit/testing/canton-test-runtime.test.ts`
- `tests/unit/testing/campaign-isolation.test.ts`
- `tests/unit/testing/daml-testing-catalog.test.ts`
- `tests/unit/testing/daml-value-arbitrary.test.ts`
- `tests/unit/testing/public-testing-api.test.ts`
- `tests/property/testing/campaign-property.test.ts`
- `tests/live/specs/public-invariant-campaign.test.ts`

## Task 1: Establish the public package boundary and immutable types

**Files:**
- Create: `src/testing/index.ts`
- Create: `src/testing/campaign/campaign-types.ts`
- Create: `src/testing/campaign/campaign-definition.ts`
- Create: `src/testing/errors/testing-configuration-error.ts`
- Modify: `package.json`
- Test: `tests/unit/testing/public-testing-api.test.ts`
- Test: `tests/unit/testing/campaign-definition.test.ts`

- [ ] **Step 1: Write the failing public-import and type-boundary tests.**

Assert that `@distrohelena/canton-typescript-sdk/testing` is an exported package entry, that it does not leak internal client fields, and that a campaign cannot be mutated after construction. Use `@ts-expect-error` assertions for invalid actor names, missing cleanup under cleanup isolation, and handler mutation attempts.

- [ ] **Step 2: Run the focused tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/public-testing-api.test.ts tests/unit/testing/campaign-definition.test.ts`

Expected: FAIL because the public package entry and definition types do not exist.

- [ ] **Step 3: Define the minimal public contracts.**

Create immutable interfaces and factories, not a mutable builder:

```ts
export interface CantonTestActor {
  readonly party: string;
  readonly participant: string;
  readonly actAs?: readonly string[];
  readonly readAs?: readonly string[];
}

export interface InvariantCampaignConfig {
  readonly runs: number;
  readonly depth: number;
  readonly failOnRevert?: boolean;
  readonly seed?: number;
  readonly timeoutMs?: number;
}

export function defineInvariantCampaign<Model, Ghost>(init: {
  readonly runtime: CampaignRuntime;
  readonly config: InvariantCampaignConfig;
  readonly targets: readonly CampaignTarget[];
  readonly handlers?: readonly CampaignHandler<Model, Ghost, unknown>[];
  readonly invariants: readonly CampaignInvariant<Model, Ghost>[];
}): InvariantCampaign<Model, Ghost>;
```

Freeze copied arrays/configuration at definition time and reject duplicate target keys, duplicate handler names, unknown actor references, non-positive `runs`/`depth`, and an empty executable target set. Keep runtime implementation details out of this task.

- [ ] **Step 4: Add the package export and runtime dependency.**

Add `./testing` to `package.json` exports and move `fast-check` from `devDependencies` to `dependencies`. Do not add it to `src/index.ts`; consumers must opt into the testing subpath.

- [ ] **Step 5: Run focused verification.**

Run: `rtk npm test -- tests/unit/testing/public-testing-api.test.ts tests/unit/testing/campaign-definition.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing tests/unit/testing/public-testing-api.test.ts tests/unit/testing/campaign-definition.test.ts --max-warnings=0`

Expected: PASS and `dist/testing/index.{js,d.ts}` exists after the build.

- [ ] **Step 6: Commit the boundary.**

```bash
rtk git add package.json src/testing tests/unit/testing/public-testing-api.test.ts tests/unit/testing/campaign-definition.test.ts
rtk git commit -m "feat: add experimental testing package boundary"
```

## Task 2: Build the pure scheduler, outcomes, and metrics

**Files:**
- Create: `src/testing/campaign/campaign-scheduler.ts`
- Create: `src/testing/campaign/campaign-metrics.ts`
- Modify: `src/testing/campaign/campaign-types.ts`
- Test: `tests/unit/testing/campaign-scheduler.test.ts`
- Test: `tests/property/testing/campaign-property.test.ts`

- [ ] **Step 1: Write failing exact-depth scheduling tests.**

Cover fixed `depth`, weight renormalization, target/actor exclusions, deterministic selection from the same seed values, no contract-dependent choice when no active contract is known, and a mandatory read-only probe fallback when no mutating target is eligible. Test these distinct outcomes:

```ts
type CampaignActionOutcome =
  | { readonly kind: "accepted"; readonly updateId: string }
  | { readonly kind: "discarded"; readonly reason: string }
  | { readonly kind: "protocol-revert"; readonly reason: string }
  | { readonly kind: "timeout"; readonly reason: string }
  | { readonly kind: "transport-error"; readonly reason: string }
  | { readonly kind: "malformed-response"; readonly reason: string }
  | { readonly kind: "unknown-commit-outcome"; readonly reason: string };
```

- [ ] **Step 2: Run the focused scheduler test to establish failure.**

Run: `rtk npm test -- tests/unit/testing/campaign-scheduler.test.ts`

Expected: FAIL because no public scheduler exists.

- [ ] **Step 3: Implement pure action eligibility and weighted selection.**

Keep all ledger reads outside this module. Accept an immutable scheduling snapshot with active contract handles, enabled actors, target filters, and handler-provided eligibility. Represent a generated slot as a target key, actor key, input, route requirement, and probe flag. Ensure rejected commands consume slots; only `protocol-revert` may be nonfatal later in the runner.

- [ ] **Step 4: Implement deterministic metric aggregation.**

Aggregate actions by target, template/choice, actor, outcome, discard reason, and invariant checkpoint. Sort metric keys before exposing results so artifacts and test snapshots are reproducible.

- [ ] **Step 5: Add scheduler property tests.**

Use fast-check to generate legal target graphs and assert: every schedule has exact depth; no emitted slot violates its eligibility predicate; all non-negative weights are renormalized without changing relative positive weights; and no slot is omitted after a discard/revert outcome.

- [ ] **Step 6: Run verification.**

Run: `rtk npm test -- tests/unit/testing/campaign-scheduler.test.ts tests/property/testing/campaign-property.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/campaign tests/unit/testing/campaign-scheduler.test.ts tests/property/testing/campaign-property.test.ts --max-warnings=0`

- [ ] **Step 7: Commit scheduler and metrics.**

```bash
rtk git add src/testing/campaign tests/unit/testing/campaign-scheduler.test.ts tests/property/testing/campaign-property.test.ts
rtk git commit -m "feat: add invariant campaign scheduler and metrics"
```

## Task 3: Add typed handlers, assumptions, cleanup declarations, and model semantics

**Files:**
- Create: `src/testing/handlers/handler.ts`
- Create: `src/testing/campaign/campaign-model.ts`
- Modify: `src/testing/campaign/campaign-definition.ts`
- Modify: `src/testing/campaign/campaign-types.ts`
- Test: `tests/unit/testing/campaign-model.test.ts`
- Test: `tests/unit/testing/campaign-definition.test.ts`

- [ ] **Step 1: Write failing handler and model tests.**

Test that `assume(false)` becomes a `discarded` outcome without submission, `bound` is inclusive for `number` and `bigint`, handlers may replace an automatic action by target key, and handlers cannot invent ledger contracts in `apply`. Test cleanup construction validation: cleanup isolation accepts only `discover + archive` contracts; `trackCreated` is optional optimization; `cleanup: "none"` is rejected unless isolation is snapshot or external.

- [ ] **Step 2: Run focused tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/campaign-model.test.ts tests/unit/testing/campaign-definition.test.ts`

Expected: FAIL because handler and model modules are missing.

- [ ] **Step 3: Implement handler helpers and cleanup contracts.**

Define `handler(name, init)` with immutable inputs. Provide `context.assume(condition, reason)` and overloads for `context.bound(value, min, max)`. Require every mutating handler to declare either `cleanup: "none"` or `{ discover, archive, trackCreated? }`; defer live authorization to runtime validation.

- [ ] **Step 4: Implement the two-layer campaign model.**

Represent ledger projection separately from ghost state. `hydrate` and `reconcile` replace only the ledger projection from runtime observations. Apply a handler's ghost transition only after a successful reconciled command. An unknown commit outcome may reconcile for diagnostics and cleanup discovery but must never apply ghost state.

- [ ] **Step 5: Run verification.**

Run: `rtk npm test -- tests/unit/testing/campaign-model.test.ts tests/unit/testing/campaign-definition.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/handlers src/testing/campaign tests/unit/testing/campaign-model.test.ts --max-warnings=0`

- [ ] **Step 6: Commit handlers and model.**

```bash
rtk git add src/testing/handlers src/testing/campaign tests/unit/testing/campaign-model.test.ts tests/unit/testing/campaign-definition.test.ts
rtk git commit -m "feat: add typed invariant handlers and campaign model"
```

## Task 4: Generalize secure counterexample artifacts and replay

**Files:**
- Create: `src/testing/campaign/campaign-artifact.ts`
- Create: `src/testing/errors/invariant-campaign-failure.ts`
- Modify: `src/testing/campaign/campaign-types.ts`
- Test: `tests/unit/testing/campaign-artifact.test.ts`
- Verify only: `tests/live/fuzz/live-fuzz-artifacts.ts`

- [ ] **Step 1: Write failing artifact tests.**

Cover canonical JSON fingerprints; allowlisted serialization; no endpoints, tokens, auth headers, or arbitrary error values; `0700` parent directories; `0600` files; symlink and traversal rejection; atomic no-clobber behavior; corrupt/schema-unknown/stale replay rejection; and deterministic trace selection from a final `fc.check` counterexample.

- [ ] **Step 2: Run the artifact test to establish failure.**

Run: `rtk npm test -- tests/unit/testing/campaign-artifact.test.ts`

Expected: FAIL because public artifacts do not exist.

- [ ] **Step 3: Extract generic artifact primitives without weakening the existing harness.**

Port the security properties of `tests/live/fuzz/live-fuzz-artifacts.ts` into the public module, but use a new `CampaignReplayArtifact` schema with a campaign definition fingerprint, action route/input records, outcomes, metric summary, run metadata, and shrink details. Do not import test files from `src`.

- [ ] **Step 4: Implement replay validation and failure type.**

Require exact schema/version/fingerprint match before runtime setup. Make `InvariantCampaignFailure` carry only safe diagnostics, `CampaignMetrics`, final trace, and optional artifact path; retain the original thrown invariant/transport cause internally.

- [ ] **Step 5: Run security and build verification.**

Run: `rtk npm test -- tests/unit/testing/campaign-artifact.test.ts tests/unit/live/live-stateful-fuzzing.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/campaign/campaign-artifact.ts src/testing/errors/invariant-campaign-failure.ts tests/unit/testing/campaign-artifact.test.ts --max-warnings=0`

Expected: public artifact tests pass and existing live artifact behavior remains unchanged.

- [ ] **Step 6: Commit secure replay support.**

```bash
rtk git add src/testing/campaign/campaign-artifact.ts src/testing/errors/invariant-campaign-failure.ts src/testing/campaign/campaign-types.ts tests/unit/testing/campaign-artifact.test.ts
rtk git commit -m "feat: add secure public campaign replay artifacts"
```

## Task 5: Implement the Canton runtime adapter and actor-route contract

**Files:**
- Create: `src/testing/runtime/canton-test-runtime.ts`
- Modify: `src/testing/campaign/campaign-types.ts`
- Test: `tests/unit/testing/canton-test-runtime.test.ts`
- Verify only: `src/client/canton-client.ts`, `src/services/command/command-service-client.ts`, `src/services/state/state-service-client.ts`, `src/services/update/update-service-client.ts`

- [ ] **Step 1: Write failing route-resolution tests using fake service clients.**

Assert that a named actor resolves to the configured participant, default `actAs` is `[actor.party]`, configured `readAs` is preserved, missing/unknown actor routes fail before submission, and generated party values never become submitters. Test `readActiveContracts`, ledger-end reads, bounded polling, and the mapping from gRPC failures to the public outcome union.

- [ ] **Step 2: Run focused runtime tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/canton-test-runtime.test.ts`

Expected: FAIL because the runtime adapter does not exist.

- [ ] **Step 3: Implement `createCantonTestRuntime`.**

Accept explicitly named participant clients and `CantonTestActor` values. Expose only `submit`, ACS/query reads, event/offset reads, polling, and capability reporting through `CampaignRuntime`. Keep construction synchronous and fail immediately for an actor whose participant is absent. Do not expose raw credentials in runtime result/trace types.

- [ ] **Step 4: Implement command classification.**

Classify only known ledger rejections as `protocol-revert`; classify deadline, transport, malformed response, and ambiguous commit separately. Preserve gRPC details as sanitized strings. Unit-test real status-code/details fixtures from the current live fuzz classifier before deleting or changing that classifier.

- [ ] **Step 5: Run verification.**

Run: `rtk npm test -- tests/unit/testing/canton-test-runtime.test.ts tests/unit/live/live-stateful-fuzzing.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/runtime tests/unit/testing/canton-test-runtime.test.ts --max-warnings=0`

- [ ] **Step 6: Commit the runtime adapter.**

```bash
rtk git add src/testing/runtime src/testing/campaign/campaign-types.ts tests/unit/testing/canton-test-runtime.test.ts
rtk git commit -m "feat: add Canton invariant test runtime"
```

## Task 6: Implement explicit isolation and cleanup recovery

**Files:**
- Create: `src/testing/runtime/campaign-isolation.ts`
- Modify: `src/testing/runtime/canton-test-runtime.ts`
- Modify: `src/testing/campaign/campaign-model.ts`
- Test: `tests/unit/testing/campaign-isolation.test.ts`
- Test: `tests/unit/testing/campaign-model.test.ts`

- [ ] **Step 1: Write failing isolation tests.**

Cover snapshot create/restore ordering, external reset ordering, cleanup discovery before/after archive, tracked-created optimization, ambiguous-submit recovery through `discover`, cleanup failure precedence, and the rule that cleanup policy rejects every mutating action without `discover + archive`.

- [ ] **Step 2: Run focused tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/campaign-isolation.test.ts tests/unit/testing/campaign-model.test.ts`

Expected: FAIL because isolation policies are absent.

- [ ] **Step 3: Implement policy factories.**

Implement discriminated policies:

```ts
type CampaignIsolation =
  | { readonly kind: "snapshot"; readonly create: () => Promise<string>; readonly restore: (id: string) => Promise<void> }
  | { readonly kind: "cleanup" }
  | { readonly kind: "external"; readonly reset: (phase: "before-run" | "after-run") => Promise<void> };
```

For cleanup, execute every target's `discover` even after unknown outcomes, deduplicate contract IDs, invoke each supplied authorized archive/close callback, and confirm absence through the runtime. Retain the original campaign failure when cleanup also fails.

- [ ] **Step 4: Add runtime capability checks.**

Require callers to supply snapshot and ledger-time adapters; never probe an arbitrary participant for hidden snapshot support. Expose `ledgerTime` only when supplied and report unavailable capabilities in `TestingConfigurationError`.

- [ ] **Step 5: Run verification.**

Run: `rtk npm test -- tests/unit/testing/campaign-isolation.test.ts tests/unit/testing/campaign-model.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/runtime src/testing/campaign tests/unit/testing/campaign-isolation.test.ts --max-warnings=0`

- [ ] **Step 6: Commit isolation.**

```bash
rtk git add src/testing/runtime src/testing/campaign/campaign-model.ts tests/unit/testing/campaign-isolation.test.ts tests/unit/testing/campaign-model.test.ts
rtk git commit -m "feat: add explicit invariant campaign isolation"
```

## Task 7: Run campaigns with fast-check, lifecycle hooks, and replay

**Files:**
- Create: `src/testing/campaign/campaign-runner.ts`
- Modify: `src/testing/campaign/campaign-definition.ts`
- Modify: `src/testing/campaign/campaign-model.ts`
- Modify: `src/testing/campaign/campaign-artifact.ts`
- Test: `tests/unit/testing/campaign-runner.test.ts`
- Test: `tests/property/testing/campaign-property.test.ts`

- [ ] **Step 1: Write failing runner-order tests.**

Use a fake runtime/handler to assert this exact per-run order: isolation setup, initial ACS hydration, `beforeRun`, each action, reconciliation, `afterAction` invariants, end-of-run invariants, one `afterInvariant`, isolation cleanup/restore, and post-cleanup invariants. Assert a protocol revert continues only when `failOnRevert` is false; every other non-accepted outcome fails; invariant failures stop the candidate and preserve the original cause.

- [ ] **Step 2: Run focused runner tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/campaign-runner.test.ts`

Expected: FAIL because the core cannot execute a campaign.

- [ ] **Step 3: Implement `fc.check` orchestration.**

Generate campaign inputs through the scheduler, record each candidate trace by canonical input including a 128-bit nonce, and call `fc.check` rather than `fc.assert`. Persist only the trace for `RunDetails.counterexample` after shrinking. Explicit replay executes the stored action list without regeneration; automatic replay is opt-in and never overwrites artifacts.

- [ ] **Step 4: Reconcile the ledger projection at every checkpoint.**

Hydrate selected ACS visibility at run start. After accepted commands, use submitted events then bounded ACS/offset polling; only reconciled updates affect ledger projection and handler ghost transitions. Refresh before invariant checkpoints so external changes become observations, not silent model drift.

- [ ] **Step 5: Run verification.**

Run: `rtk npm test -- tests/unit/testing/campaign-runner.test.ts tests/property/testing/campaign-property.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/campaign tests/unit/testing/campaign-runner.test.ts tests/property/testing/campaign-property.test.ts --max-warnings=0`

- [ ] **Step 6: Commit the executable campaign core.**

```bash
rtk git add src/testing/campaign tests/unit/testing/campaign-runner.test.ts tests/property/testing/campaign-property.test.ts
rtk git commit -m "feat: run public invariant campaigns"
```

## Task 8: Build the DAML-LF catalog and declarative target resolver

**Files:**
- Create: `src/testing/daml/daml-testing-catalog.ts`
- Modify: `src/testing/targets/target.ts`
- Modify: `src/testing/campaign/campaign-definition.ts`
- Test: `tests/unit/testing/daml-testing-catalog.test.ts`
- Verify only: `src/daml-lf/daml-lf-package-loader.ts`, `src/daml-lf/daml-lf-compilation.ts`, `src/daml-lf/semantics/daml-lf-semantic-model.ts`

- [ ] **Step 1: Write catalog fixture tests.**

Use existing DAR/DAML-LF fixture builders to verify template ID, create fields, choice names, parameter types, signatory/observer/controller metadata when available, deterministic selection precedence, and unsupported metadata diagnostics. Cover specific choice/interface inclusion overriding exclusion, exclusion overriding broad template selection, and broad selection overriding automatic discovery.

- [ ] **Step 2: Run focused catalog tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/daml-testing-catalog.test.ts`

Expected: FAIL because the testing catalog is missing.

- [ ] **Step 3: Implement catalog construction from existing DAML-LF semantic models.**

Reuse the package loader and semantic model; do not parse DAR archives a second way. Produce a testing-specific immutable catalog that preserves raw LF type information needed by arbitraries instead of reusing the current `DamlInterfaceAnalyzer`, which intentionally rejects most non-text shapes.

- [ ] **Step 4: Implement declarative target route validation.**

Require `.actors()` or `resolveRoute` on every mutating declarative action. Default route uses the selected actor's participant, `actAs`, and `readAs`; missing route configuration fails at campaign definition. Require explicit `valueParties` or a field generator for party-valued fields.

- [ ] **Step 5: Run verification.**

Run: `rtk npm test -- tests/unit/testing/daml-testing-catalog.test.ts tests/unit/testing/campaign-definition.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/daml src/testing/targets tests/unit/testing/daml-testing-catalog.test.ts --max-warnings=0`

- [ ] **Step 6: Commit declarative discovery.**

```bash
rtk git add src/testing/daml/daml-testing-catalog.ts src/testing/targets src/testing/campaign/campaign-definition.ts tests/unit/testing/daml-testing-catalog.test.ts tests/unit/testing/campaign-definition.test.ts
rtk git commit -m "feat: add declarative DAML invariant targets"
```

## Task 9: Generate bounded well-typed DAML values and automatic actions

**Files:**
- Create: `src/testing/daml/daml-value-arbitrary.ts`
- Modify: `src/testing/daml/daml-testing-catalog.ts`
- Modify: `src/testing/targets/target.ts`
- Modify: `src/testing/campaign/campaign-scheduler.ts`
- Test: `tests/unit/testing/daml-value-arbitrary.test.ts`
- Test: `tests/property/testing/campaign-property.test.ts`

- [ ] **Step 1: Write failing value-generation tests.**

Cover text, bool, int64, numeric, date, timestamp, party, contract ID, optional, list, text map, generic map, record, variant, enum, and bounded nested values. Assert values respect configured size/depth limits, party values use only explicit `valueParties`, and unsupported recursive/function/exotic LF shapes report a skipped target diagnostic rather than constructing malformed commands.

- [ ] **Step 2: Run focused arbitrary tests to establish failure.**

Run: `rtk npm test -- tests/unit/testing/daml-value-arbitrary.test.ts tests/property/testing/campaign-property.test.ts`

Expected: FAIL because automatic DAML value arbitraries are absent.

- [ ] **Step 3: Implement recursive arbitrary construction.**

Use an explicit budget object for maximum depth, collection length, text length, numeric precision/scale, and recursion visits. Use `fc.oneof` only after bounding each branch. Produce SDK command payload shapes compatible with existing `CreateCommand` and `ExerciseCommand` serialization; add a round-trip unit test through the command serialization boundary.

- [ ] **Step 4: Turn catalog entries into automatic create/choice actions.**

Create actions only for target entries with supported payload/argument types and valid routes. Choice actions select from reconciled active contracts of the matching template/interface. Allow a custom handler with the same target key to replace automatic generation deterministically.

- [ ] **Step 5: Run verification.**

Run: `rtk npm test -- tests/unit/testing/daml-value-arbitrary.test.ts tests/unit/testing/daml-testing-catalog.test.ts tests/property/testing/campaign-property.test.ts`

Run: `rtk npm run build`

Run: `rtk npx eslint src/testing/daml src/testing/targets src/testing/campaign tests/unit/testing/daml-value-arbitrary.test.ts --max-warnings=0`

- [ ] **Step 6: Commit auto generation.**

```bash
rtk git add src/testing/daml src/testing/targets src/testing/campaign/campaign-scheduler.ts tests/unit/testing/daml-value-arbitrary.test.ts tests/property/testing/campaign-property.test.ts
rtk git commit -m "feat: generate declarative DAML fuzz actions"
```

## Task 10: Migrate the existing live fuzz fixture through the public API

**Files:**
- Create: `tests/live/specs/public-invariant-campaign.test.ts`
- Modify: `tests/live/specs/live-stateful-fuzzing.test.ts`
- Modify: `tests/live/fuzz/live-fuzz-fixture.ts`
- Modify: `tests/live/fuzz/live-fuzz-config.ts`
- Modify: `tests/live/fuzz/live-fuzz-runner.ts`
- Modify: `tests/unit/live/live-stateful-fuzzing.test.ts`
- Test: `tests/unit/testing/canton-test-runtime.test.ts`

- [ ] **Step 1: Write a failing public `Main:Iou` campaign test.**

Build the existing two-participant issuer/owner fixture using only the new public testing import. Define explicit issuer create/archive handlers, owner/issuer reads, run-marker discovery, authorized archive cleanup, cross-participant visibility invariant, and strict four-slot smoke configuration.

- [ ] **Step 2: Run the disabled live command to establish the integration shape.**

Run: `rtk npm run test:live:fuzz`

Expected: existing suite remains disabled/network-free; the new public test initially fails before its implementation is complete.

- [ ] **Step 3: Add a compatibility adapter rather than deleting the old runner.**

Make the old live configuration map onto `InvariantCampaignConfig` and public runtime configuration. Retain existing environment names during the experimental period. Reuse existing secure live artifacts only through a temporary adapter; compare public artifacts against existing artifact test expectations before removing duplicate code.

- [ ] **Step 4: Prove semantic parity with offline tests.**

Add table-driven tests comparing old and public behavior for exact depth, actor route matrix, permissive/strict revert handling, action outcome classification, invariant phases, cleanup on ambiguous outcome, and replay fingerprint rejection.

- [ ] **Step 5: Run the strict opt-in local smoke.**

Run only after `~/env/daml-ops/node/start_local.sh` is running with the required participants:

```bash
rtk env SDK_TEST_ENABLE_LIVE_FUZZING=1 FUZZ_NUM_RUNS=1 FUZZ_LIVE_DEPTH=4 FUZZ_LIVE_FAIL_ON_REVERT=true FUZZ_LIVE_REQUIRE_ARCHIVE=1 FUZZ_LIVE_FAILURE_DIR=tests/live/.artifacts/public-smoke npm run test:live:fuzz
```

Expected: one exact-depth campaign passes and leaves no run-marked active contracts. If local CN availability is not established, record this as an opt-in verification gap; do not weaken the disabled test.

- [ ] **Step 6: Commit the migration adapter.**

```bash
rtk git add tests/live tests/unit/live tests/unit/testing src/testing
rtk git commit -m "test: exercise public invariant campaigns on live Canton"
```

## Task 11: Document the experimental API, compatibility surface, and release gates

**Files:**
- Modify: `README.md`
- Modify: `package.json`
- Modify: `.gitignore`
- Test: `tests/unit/testing/public-testing-api.test.ts`
- Verify only: `scripts/verify-npm-pack.mjs`

- [ ] **Step 1: Write failing documentation/package assertions.**

Extend package tests or `verify-npm-pack` coverage so the `./testing` JS and declaration files must be present in a packed tarball. Assert the README examples compile in a TypeScript fixture or are checked by a focused test snippet.

- [ ] **Step 2: Run the package test to establish failure.**

Run: `rtk npm run verify:pack`

Expected: FAIL until the verification script recognizes the new public export.

- [ ] **Step 3: Document safe usage and Foundry mapping.**

Document the hybrid target/handler model, runs/depth, `failOnRevert`, `assume`, `bound`, `afterInvariant`, metric interpretation, replay, and isolation policies. Prominently state that `cleanup` requires discovery for ambiguous commands and that shared/production ledgers must use explicit safe isolation. State semantic—not PRNG/shrink/ABI—parity with Foundry.

- [ ] **Step 4: Add experimental stability markers.**

Mark the new entry point and all README examples experimental. Do not change the package version or publish configuration; the user explicitly deferred release until the API stabilizes.

- [ ] **Step 5: Run final non-live verification.**

Run: `rtk npm test -- tests/unit tests/property`

Run: `rtk npm run test:property`

Run: `rtk npm run test:live:fuzz`

Run: `rtk npm run build`

Run: `rtk npm run lint`

Run: `rtk npm run verify:pack`

Run: `rtk git diff --check`

Expected: all offline/package checks pass; disabled live fuzz remains network-free.

- [ ] **Step 6: Commit documentation and release gates.**

```bash
rtk git add README.md package.json .gitignore scripts/verify-npm-pack.mjs tests/unit/testing/public-testing-api.test.ts
rtk git commit -m "docs: add experimental invariant testing SDK guide"
```

## Final acceptance checklist

- [ ] The package exposes `./testing`, while the top-level SDK export remains unchanged.
- [ ] Public API type tests reject mutable campaign definitions, unknown routes, unsafe cleanup, and unsupported automatic payload shapes.
- [ ] Every run executes exact `depth` slots; failed commands still consume a slot.
- [ ] Actor/participant/`actAs`/`readAs` routes are explicit and never inferred from generated party values or DAML metadata.
- [ ] Ledger projection is rehydrated/reconciled from Canton; ghost state cannot invent contracts.
- [ ] Cleanup isolation requires recovery-capable discovery for ambiguous submissions; snapshot and external isolation are explicit adapters.
- [ ] Replays use final fast-check counterexamples and secure allowlisted artifacts.
- [ ] Declarative actions cover supported DAML-LF values, while unsupported/recursive shapes produce actionable skip diagnostics.
- [ ] The existing `Main:Iou` live fuzz suite runs through the public engine with equivalent strict smoke behavior.
- [ ] README and package verification clearly mark the feature experimental and prevent publishing an incomplete subpath export.
