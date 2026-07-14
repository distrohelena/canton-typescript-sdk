# Fuzzing and Invariant Testing Design

**Date:** 2026-07-14
**Status:** Narrowed design for user review

## Goal

Add a deterministic, CI-friendly property-testing harness for the SDK's DAML-LF evaluator and replay semantics. The first milestone is test-only: it should improve confidence in evaluator determinism, replay determinism, and runtime-value normalization without changing the public SDK API or requiring a live Canton node.

## Scope

The initial work targets the pure, in-process DAML-LF evaluator and debugger replay layers. It does not include live-ledger stateful fuzzing, a public SDK testing package, a persistent fuzz corpus, or a standalone fuzzing CLI.

The generated domain is runtime values, raw ledger values, replay effects, and inputs inserted into a fixed catalog of known-valid evaluator/replay cases. The first milestone does not generate arbitrary `DamlLfValueDefinition` or update ASTs. This avoids testing invalid or uncompiled definitions and keeps shrinking focused on data values.

The fixed evaluator catalog covers the existing supported cases for text, numeric, and int64 literals; variables; let/lambda/application; builtin constructors and the `equal`, `greater`, and `appendText` builtin functions; records, lists, optionals, variants, enums, and case expressions. The fixed replay catalog covers `pure`, `block`, `tryCatch`, `create`, `fetch`, and `exercise` against a minimal compiled template/choice fixture with a real definition resolver and matching contracts. `getTime`, `ledgerTimeLt`, interface updates, value references, and record projection/update are deferred.

Generated data is inserted only into pre-declared, type-compatible slots in those fixed cases. Invalid preconditions such as division-by-zero, missing variables, missing contracts, unsupported nodes, and malformed event shapes are excluded by the case builders rather than skipped inside properties. Fast-check shrinks only the generated data, preserving the fixed case’s validity.

## Test Architecture

Add `fast-check` as a development dependency and create a test-only property-testing tree:

```text
tests/property/
  arbitraries/
    daml-lf-runtime-values.ts
    daml-lf-ledger-values.ts
    replay-effects.ts
  fixtures/
    evaluator-cases.ts
    replay-cases.ts
  invariants/
    evaluator-determinism.test.ts
    replay-determinism.test.ts
    value-normalization.test.ts
```

The data arbitraries should be small and composable, with controlled depth and occasional deeper nesting to exercise recursive value handling. The fixture builders own the type environment, constructor/field declarations, compiled definitions, resolver bindings, and contract map; the arbitraries do not construct untyped LF ASTs. The replay fixtures keep raw transaction event objects—including each event’s `oneofKind` discriminator—intact until the validator consumes their payload fields.

The property tests remain internal to the repository. Nothing from `tests/property` is exported through an SDK package subpath.

## Properties and Oracles

### Evaluator determinism

For pure cases, select a fixed `DamlLfValueDefinition` that is already present in the fixed `DamlLfCompilation`/`DamlLfWorkspace` fixture modeled on the existing evaluator tests, and insert generated values only into its declared input slots. This oracle calls `DamlLfEvaluator.evaluateValueDefinitionOrThrow` twice and compares only the returned `IDamlLfRuntimeValue` because the pure API has no effect result. For replay cases, select a fixed compiled entrypoint and construct an `IDamlLfReplayEnvironment` imported directly from `src/daml-lf/interpreter/daml-lf-evaluator.ts`; the fixture provides the real definition resolver and matching contract map. Do not use `ILedgerReplayEnvironment` as the evaluator input type. The replay oracle calls `DamlLfEvaluator.evaluateReplayEntrypointOrThrow` twice and compares both the returned `IDamlLfRuntimeValue` and `IDamlLfReplayEffect[]`.

Evaluate each case twice with fresh `DamlLfEvaluator` instances and fresh trace sinks. Use a test canonicalizer that preserves the runtime-value marker keys from `daml-lf-runtime-value.ts` and sorts object keys before comparison.

### Replay determinism

Separate replay repeatability from validator correctness. The replay repeatability property uses the fixed compiled entrypoint fixture and an `IDamlLfReplayEnvironment`, then runs `DamlLfEvaluator.evaluateReplayEntrypointOrThrow` twice and compares its value/effects.

The validator property selects a fixed replay fixture with a non-empty comparable effect sequence—at least one `create`, `exercise`, or `archive`—and varies only generated payload/argument data. The fixture constructs matching raw `IReplayTransactionSnapshot.events` from the selected effects with a test-only raw-ledger-value encoder. Only the event payload fields are normalized; the snapshot and each event’s raw `oneofKind` discriminator remain unchanged. The property then calls the public `ReplayDeterminismValidator.validateOrThrow`. A negative companion assertion mutates an exercised choice argument or template identifier and requires `ReplayDeterminismException`; it never mutates a create contract ID because create IDs are intentionally ignored by the validator. This property tests the validator’s observed-event/effect correspondence; the separate replay-repeatability property tests evaluator output.

### Value normalization laws

Generate raw ledger API values in the subset handled by the internal `normalizeReplayLedgerValue` function in `replay-ledger-value-normalizer.ts`—unit, bool, int64, date, timestamp, text, numeric, party, contract-id, optional, list, text-map, generic map, record, variant, and enum—and assert normalization idempotence:

```text
normalize(normalize(value)) == normalize(value)
```

The property imports `normalizeReplayLedgerValue` directly from its internal source module; no public export is added in this milestone. It asserts stable preservation of the numeric, party, contract-id, and record-id marker representations, not equivalence between different values. Comparisons must use the marker constants from `daml-lf-runtime-value.ts`, rather than ad-hoc test serialization.

The fixed evaluator/replay cases use a fixed context for any time-dependent behavior; deferred constructs are not generated in this milestone.

## Reproducibility and Execution

Add an `npm run test:property` script for the property suites. The runner must support:

- a bounded default run count suitable for CI;
- `FUZZ_NUM_RUNS` to request deeper local campaigns; and
- `FUZZ_SEED` to replay a failing campaign exactly.

Fast-check's seed and shrink path must remain visible in failures. The property runner will parse positive integer `FUZZ_NUM_RUNS` with a default of `100`; invalid values fail with a clear configuration error. It will parse integer `FUZZ_SEED` and a non-empty `FUZZ_PATH` when set; invalid values fail before the property run. A shrunk counterexample can be replayed with:

```bash
FUZZ_SEED=<seed> FUZZ_PATH=<path> npm run test:property
```

The test output must identify the property file and preserve fast-check's counterexample details.

The harness must not require a network connection, a running Canton node, or mutable external state.

## Verification

The implementation is complete when:

1. The three property suites exist and each covers its corresponding invariant family.
2. A generated failure can be reproduced from its reported seed and shrink path.
3. Generated data remains within the fixed evaluator/replay cases and the supported LF value subset.
4. Existing unit tests, property tests, lint, and the TypeScript build pass.
5. No public SDK exports or runtime behavior outside the tested support are changed.

## Future Extensions

After the initial harness is stable, the project may promote reusable generators into a public testing subpath, add a persistent regression corpus, or introduce optional live-ledger stateful fuzzing. Those are separate scopes and are not prerequisites for this milestone.
