# Fuzzing and Invariant Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a deterministic, CI-friendly `fast-check` property-testing harness for evaluator determinism, replay determinism, and DAML-LF ledger-value normalization.

**Architecture:** Keep all work test-only. Fixed evaluator/replay case templates provide valid definitions, type environments, resolvers, and contracts; `fast-check` generates only typed runtime data, raw ledger values, and effect payloads inserted into those templates. Pure evaluator cases are compiled fresh around the exact generated definition because the evaluator has no input-environment API and compilation objects are immutable; replay cases use fixed compiled definitions with generated data in the evaluator environment. Property runner options are centralized so seeds, shrink paths, and run counts are reproducible without changing the SDK public surface.

**Tech Stack:** TypeScript, Vitest, `fast-check`, existing `DamlLfEvaluator`, `ReplayDeterminismValidator`, and `normalizeReplayLedgerValue` implementations.

---

## File Map

### New files

- `tests/property/property-test-options.ts` — parse `FUZZ_NUM_RUNS`, `FUZZ_SEED`, and `FUZZ_PATH`; return the common `fast-check` assertion options with clear configuration errors.
- `tests/property/property-test-options.test.ts` — deterministic option parsing and seed/path replay checks.
- `tests/property/canonicalize.ts` — recursively canonicalize runtime values/effects for deterministic comparisons without erasing DAML-LF marker keys.
- `tests/property/arbitraries/daml-lf-runtime-values.ts` — generate supported SDK runtime values and generated data used in fixed evaluator slots.
- `tests/property/arbitraries/daml-lf-ledger-values.ts` — generate raw Ledger API value shapes accepted by `normalizeReplayLedgerValue`.
- `tests/property/arbitraries/replay-effects.ts` — generate supported effect payloads and raw event payloads for the validator fixture; always include a comparable effect for positive/negative checks.
- `tests/property/fixtures/evaluator-cases.ts` — define fixed case templates and build a fresh `DamlLfWorkspace`/`DamlLfCompilation` around each generated definition used by evaluator properties.
- `tests/property/fixtures/replay-cases.ts` — build fixed replay definitions, `IDamlLfReplayEnvironment` values, resolver bindings, contract maps, and raw transaction snapshots.
- `tests/property/invariants/value-normalization.test.ts` — normalization idempotence and marker-preservation properties.
- `tests/property/invariants/evaluator-determinism.test.ts` — pure evaluator repeatability properties.
- `tests/property/invariants/replay-determinism.test.ts` — replay evaluator repeatability and validator acceptance/rejection properties.

### Modified files

- `package.json` — add the `fast-check` dev dependency and `test:property` script.
- `package-lock.json` — lock the new development dependency.

No `src/**` file or public export changes are expected.

## Task 1: Add the property-test command and dependency

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tests/property/invariants/value-normalization.test.ts`

- [ ] **Step 1: Write the first property test import and assertion.**

Create the normalization test with a `fast-check` property using the not-yet-created ledger-value arbitrary and the existing internal normalizer:

```ts
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { normalizeReplayLedgerValue } from "../../../src/debugger/replay/replay-ledger-value-normalizer.js";
import { ledgerValueArbitrary } from "../arbitraries/daml-lf-ledger-values.js";

describe("DAML-LF property invariants", () => {
    it("normalizes ledger values idempotently", () => {
        fc.assert(
            fc.property(ledgerValueArbitrary, (value) => {
                expect(normalizeReplayLedgerValue(
                    normalizeReplayLedgerValue(value),
                )).toEqual(normalizeReplayLedgerValue(value));
            }),
        );
    });
});
```

- [ ] **Step 2: Run the property command to verify the missing harness fails.**

Run: `rtk npm run test:property`

Expected: FAIL because the script, `fast-check`, and arbitrary module do not exist yet.

- [ ] **Step 3: Add the dependency and script.**

Run: `rtk npm install --save-dev fast-check`

Add this script to `package.json`:

```json
"test:property": "vitest run tests/property --maxWorkers=1 --testTimeout=15000"
```

The install updates `package-lock.json`; do not hand-edit the lockfile.

- [ ] **Step 4: Run the property command again.**

Run: `rtk npm run test:property`

Expected: FAIL only because the arbitrary module and option wiring are still pending; the command and dependency must resolve successfully.

## Task 2: Implement shared property-run options and canonical comparison

**Files:**
- Create: `tests/property/property-test-options.ts`
- Create: `tests/property/canonicalize.ts`
- Modify: `tests/property/invariants/value-normalization.test.ts`

- [ ] **Step 1: Add configuration and replayability tests.**

Add unit-style tests beside the property helpers or in `tests/property/invariants/value-normalization.test.ts` for:

- default `numRuns` of `100` when `FUZZ_NUM_RUNS` is absent;
- positive integer override;
- clear failure for zero, negative, decimal, or non-numeric `FUZZ_NUM_RUNS`;
- integer `FUZZ_SEED` and a path matching `^\\d+(?::\\d+)*$` passthrough;
- clear failure for invalid seed/path values.

Use `fc.check` with a deliberately failing, deterministic property to capture its returned `seed` and `counterexamplePath`, then run the same property again with those two values and assert that the same shrunk counterexample is reported. This tests the project’s option wiring without leaving an intentionally failing property in the suite.

- [ ] **Step 2: Run the helper tests to confirm they fail.**

Run: `rtk npm run test:property -- tests/property/invariants/value-normalization.test.ts`

Expected: FAIL because the shared option and canonicalization helpers are not implemented.

- [ ] **Step 3: Implement `property-test-options.ts`.**

Expose a small internal helper returning the options passed to `fc.assert`:

```ts
export function propertyParameters(): {
    numRuns: number;
    seed?: number;
    path?: string;
}
```

Parse environment variables once per property invocation. Accept `FUZZ_NUM_RUNS` only when it matches `^[1-9]\\d*$` and is a safe integer; accept `FUZZ_SEED` only when it matches `^-?\\d+$` and is a safe integer; accept `FUZZ_PATH` only when it matches `^\\d+(?::\\d+)*$`. Use `100` by default, reject invalid values before `fc.assert`, and omit optional fields when unset. Do not introduce a global mutable seed or random source.

- [ ] **Step 4: Implement `canonicalize.ts`.**

Recursively canonicalize arrays and objects by sorted keys while preserving values under `DAML_LF_NUMERIC_MARKER_KEY`, `DAML_LF_PARTY_MARKER_KEY`, `DAML_LF_CONTRACT_ID_MARKER_KEY`, and `DAML_LF_RECORD_ID_MARKER_KEY`. Provide a helper for comparing evaluator values and replay effects; do not stringify values in a way that loses `bigint` or marker structure.

- [ ] **Step 5: Wire options and canonicalization into the first property.**

Pass `propertyParameters()` as the second argument to `fc.assert` and use the canonicalizer for the equality assertion.

- [ ] **Step 6: Run the focused property test.**

Run: `rtk npm run test:property -- tests/property/invariants/value-normalization.test.ts`

Expected: FAIL only because the ledger-value arbitrary is still pending; option parsing and canonical comparison tests pass.

## Task 3: Add raw ledger-value and runtime-value arbitraries

**Files:**
- Create: `tests/property/arbitraries/daml-lf-ledger-values.ts`
- Create: `tests/property/arbitraries/daml-lf-runtime-values.ts`

- [ ] **Step 1: Add deterministic generator-shape tests.**

Add table-driven checks with one hand-authored raw value per normalizer branch: unit, bool, int64, date, timestamp, text, numeric, party, contract-id, optional, list, text-map, generic map, record, variant, and enum. Keep this deterministic branch coverage separate from the generated invariant; the invariant itself must use `fc.property`.

- [ ] **Step 2: Run the generator checks to establish the missing-generator failure.**

Run: `rtk npm run test:property -- tests/property/invariants/value-normalization.test.ts`

Expected: FAIL because the arbitrary exports do not exist.

- [ ] **Step 3: Implement raw ledger-value arbitraries.**

Use `fc.oneof` and bounded recursive arbitraries to create the exact `{ sum: { oneofKind, ... } }` shapes consumed by `normalizeReplayLedgerValue`. Keep recursive depth bounded with `fc.letrec` or an equivalent depth parameter. Generate valid record fields and map entries, including empty cases and nested cases. Preserve decimal strings and contract/party strings as strings; do not pre-normalize them.

- [ ] **Step 4: Implement runtime-value arbitraries.**

Generate only `IDamlLfRuntimeValue` forms accepted by current evaluator fixtures: unit, bool, text, int64, numeric, party, contract-id, records, lists/options, and marker-bearing payload records. Keep generated values within the fixed fixture’s declared slots rather than attempting to synthesize arbitrary LF types.

- [ ] **Step 5: Run normalization properties.**

Run: `rtk npm run test:property -- tests/property/invariants/value-normalization.test.ts`

Expected: PASS, including idempotence and marker-preservation cases across all generated branches.

## Task 4: Build fixed evaluator fixtures

**Files:**
- Create: `tests/property/fixtures/evaluator-cases.ts`
- Create: `tests/property/invariants/evaluator-determinism.test.ts`

- [ ] **Step 1: Add a failing fixed-case contract.**

Define a fixture contract type containing a fixed case template and a `build(data)` factory. Because `evaluateValueDefinitionOrThrow` has no input-environment parameter, the factory must create the exact `DamlLfValueDefinition` containing the generated data, place that same object into a new `DamlLfModule`/`DamlLfPackage`/`DamlLfWorkspace`, and then call `DamlLfCompilation.createOrThrow`; it must never mutate a definition after compilation or inject data into a definition owned by another compilation. The fixed template, not the generated AST shape, is the validity boundary. Add a test that selects a fixed case and compares two evaluations built from the same generated data.

- [ ] **Step 2: Run the evaluator property before the fixture exists.**

Run: `rtk npm run test:property -- tests/property/invariants/evaluator-determinism.test.ts`

Expected: FAIL because the fixed fixture and property implementation are incomplete.

- [ ] **Step 3: Implement the fixed compilation fixture.**

Follow the existing construction pattern in `tests/unit/daml-lf/daml-lf-evaluator.test.ts`: build `DamlLfPackage`, `DamlLfModule`, and `DamlLfValueDefinition` objects first, place them in a `DamlLfWorkspace`, then call `DamlLfCompilation.createOrThrow`. Keep definitions in the same compilation used by each evaluator.

Include a finite catalog with an explicit case for each required branch: text literal, numeric literal, int64 literal, variable/let, lambda/application, builtin `unit`/`true`/`false`, builtin `equal`, `greater`, and `appendText`, record construction, list construction, optional construction, variant construction, enum construction, and case selection. The fixed cases own their declarations and patterns; generated values provide breadth only in the declared slots.

Each case template must document its generated-data slots explicitly—for example, a literal replacement, a record field, a list element, an optional/variant payload, or a replay choice argument—so the builder can encode data without changing the template’s declarations, binders, or case patterns.

- [ ] **Step 4: Implement pure evaluator repeatability.**

For each fixed case, create two fresh `DamlLfEvaluator` instances and two fresh trace sinks. Call `evaluateValueDefinitionOrThrow` with the same generated input data and compare the returned values with `canonicalize`. Compare trace-step kinds separately if the fixture emits traces; do not treat trace object identity as semantic output.

- [ ] **Step 5: Run the evaluator property.**

Run: `rtk npm run test:property -- tests/property/invariants/evaluator-determinism.test.ts`

Expected: PASS for the default 100 runs per selected case.

## Task 5: Build fixed replay cases and effect/event helpers

**Files:**
- Create: `tests/property/fixtures/replay-cases.ts`
- Create: `tests/property/arbitraries/replay-effects.ts`
- Create: `tests/property/invariants/replay-determinism.test.ts`

- [ ] **Step 1: Add failing replay properties.**

Add tests for two separate behaviors:

1. The fixed replay case evaluated twice produces equivalent values and effects.
2. A matching raw transaction snapshot is accepted, while mutating an exercised choice argument or template identifier is rejected with `ReplayDeterminismException`.

Run: `rtk npm run test:property -- tests/property/invariants/replay-determinism.test.ts`

Expected: FAIL because replay fixtures, effect arbitraries, and raw-event helpers are incomplete.

- [ ] **Step 2: Implement the fixed replay compilation and resolver.**

Model the fixture after `tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts` and `tests/unit/debugger/replay/ledger-replay-session-loader.test.ts`. Build a minimal template/choice definition that is present in the compilation, a real choice resolver returning the definition expected by `DamlLfEvaluator`, and a contract map containing every contract ID referenced by the fixed entrypoint.

Create an explicit finite replay catalog with one known-valid case for each required update form: `pure`, `block`, `tryCatch`, `create`, `fetch`, and `exercise`. The first three use fixed expressions and no external contract dependency; `create` uses the fixed template definition; `fetch` references a contract in the fixture map; and `exercise` resolves the fixed choice through the real resolver. Generated runtime values are inserted only into the fixed argument/payload slots.

Return the evaluator-facing `IDamlLfReplayEnvironment` directly. If a fixture also needs the debugger-facing `ILedgerReplayEnvironment`, provide an explicit adapter so the two interfaces are not conflated.

- [ ] **Step 3: Implement effect/data arbitraries and the raw-event encoder.**

Generate payloads only for the fixed choice/template slots. Build at least one comparable `create`, `exercise`, or `archive` event in every positive validator case. Encode payloads back into raw Ledger API oneof values while preserving the enclosing event’s `oneofKind`; normalize only payload fields through `normalizeReplayLedgerValue`.

- [ ] **Step 4: Implement replay evaluator repeatability.**

Run `evaluateReplayEntrypointOrThrow` twice with fresh evaluators, fresh environments, and fresh trace sinks. Compare both `result.value` and `result.effects` through `canonicalize`. Keep synthetic contract IDs and observed create IDs fixed by the fixture so this property tests repeatability rather than ID allocation policy.

- [ ] **Step 5: Implement validator acceptance and rejection.**

Call the public `ReplayDeterminismValidator.validateOrThrow` with the raw snapshot and replay effects. For the negative case, mutate an exercised choice argument or template identifier, never a create contract ID, and assert `ReplayDeterminismException`.

- [ ] **Step 6: Run the replay properties.**

Run: `rtk npm run test:property -- tests/property/invariants/replay-determinism.test.ts`

Expected: PASS for repeatability, matching raw-event normalization, and rejection of the targeted mutation.

## Task 6: Verify the complete harness

**Files:**
- Modify: `package.json` only if final script/config adjustments are needed.

- [ ] **Step 1: Run the property suite with the default campaign.**

Run: `rtk npm run test:property`

Expected: all three property files pass with 100 runs per property invocation.

- [ ] **Step 2: Verify deterministic replay of a seeded failure.**

Run a property test with a fixed seed and capture its output:

```bash
FUZZ_SEED=12345 rtk npm run test:property
```

The `tests/property/property-test-options.test.ts` check must demonstrate the full path: `fc.check` returns a failing seed/path, the same property rerun with `FUZZ_SEED` and `FUZZ_PATH` returns the same shrunk counterexample, and the environment variables are restored after the test. Do not rely on a successful seeded campaign as evidence of shrink-path replay.

- [ ] **Step 3: Run the existing unit suite.**

Run: `rtk npm test`

Expected: existing unit tests pass; no live-ledger tests are added to this command.

- [ ] **Step 4: Run lint and build.**

Run: `rtk npm run lint`

Expected: ESLint exits successfully with zero warnings/errors.

Run: `rtk npm run build`

Expected: TypeScript compilation exits successfully and no source/public export changes are required.

- [ ] **Step 5: Inspect the final diff.**

Run: `rtk git diff --check` and `rtk git status --short`

Expected: no whitespace errors; only the planned package, lockfile, and `tests/property/**` files changed.

- [ ] **Step 6: Commit the implementation.**

```bash
rtk git add package.json package-lock.json tests/property
rtk git commit -m "test: add fuzzing and invariant properties"
```
