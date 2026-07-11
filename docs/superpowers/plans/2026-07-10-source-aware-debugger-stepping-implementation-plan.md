# Source-Aware Debugger Stepping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Explorer debugger navigation operate on source-faithful projected LF replay steps, suppressing generated fallback noise while preserving ledger effects and exact source calls.

**Architecture:** Preserve the evaluator's full raw trace and current scope/stack reconstruction. Add source-mapping precision (`exact` or `fallback`) at the DAR metadata boundary, propagate it through the source index and public `ReplaySourceLocation`, then select navigable steps only after raw projections have captured their scope snapshots.

**Tech Stack:** TypeScript, Vitest, existing DAML LF evaluator trace sink, DAR `debug/source-map.json` metadata.

---

## File Structure

- Create: `src/debugger/source/source-mapping-precision.ts` - shared exact/fallback provenance type.
- Modify: `src/debugger/source/dar-source-map-metadata.ts` - parse optional precision from DAR debug metadata.
- Modify: `src/debugger/source/source-indexed-compilation.ts` - default unannotated legacy mappings to `fallback` and preserve provenance.
- Modify: `src/debugger/source/daml-source-mapper.ts` - expose the precision-bearing definition source.
- Modify: `src/debugger/session/replay-source-location.ts` - expose source-mapping precision to Explorer.
- Modify: `src/debugger/replay/ledger-replay-session-loader.ts` - project raw evaluator events to navigable replay steps after scope reconstruction.
- Modify: `src/debugger/index.ts` - export the provenance type if the package's public DTO exports are centralized there.
- Modify: `tests/fixtures/daml-lf/source-mapped-dar-fixture.ts` - allow tests to generate exact and fallback metadata records.
- Modify: `tests/unit/debugger/source/source-indexed-compilation.test.ts` - cover defaulting and explicit precision.
- Modify: `tests/unit/daml-lf/dar-source-bundle-loader.test.ts` - prove precision survives DAR metadata parsing.
- Modify: `tests/unit/debugger/replay/ledger-replay-session-loader.test.ts` - assert navigation projection rules with controlled evaluator events.
- Modify: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts` - retain step-control coverage with exact source maps.

## Task 1: Carry Mapping Precision From The DAR To Replay Locations

**Files:**
- Create: `src/debugger/source/source-mapping-precision.ts`
- Modify: `src/debugger/source/dar-source-map-metadata.ts`
- Modify: `src/debugger/source/source-indexed-compilation.ts`
- Modify: `src/debugger/source/daml-source-mapper.ts`
- Modify: `src/debugger/session/replay-source-location.ts`
- Modify: `src/debugger/index.ts`
- Modify: `tests/fixtures/daml-lf/source-mapped-dar-fixture.ts`
- Modify: `tests/unit/debugger/source/source-indexed-compilation.test.ts`
- Modify: `tests/unit/daml-lf/dar-source-bundle-loader.test.ts`

- [ ] **Step 1: Write failing provenance tests**

Add an explicit exact fixture record and an unannotated legacy record:

```ts
it("defaults unannotated definition metadata to fallback precision", async () => {
    const indexed = await createIndexedCompilation({ precision: undefined });

    expect(
        indexed.getDefinitionSourceOrThrow("pkg-sample", "Main", "archive").precision,
    ).toBe(SourceMappingPrecision.fallback);
});

it("preserves exact precision from DAR metadata", async () => {
    const indexed = await createIndexedCompilation({ precision: "exact" });

    expect(
        indexed.getDefinitionSourceOrThrow("pkg-sample", "Main", "archive").precision,
    ).toBe(SourceMappingPrecision.exact);
});
```

Also assert `DarSourceBundleLoader` exposes the exact metadata value rather
than dropping it during JSON parsing.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
rtk npm test -- tests/unit/debugger/source/source-indexed-compilation.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts
```

Expected: FAIL because executable metadata and indexed definition sources do
not have a precision field.

- [ ] **Step 3: Implement the smallest provenance model**

Create:

```ts
export enum SourceMappingPrecision {
    exact = "exact",
    fallback = "fallback",
}
```

Add `precision?: SourceMappingPrecision` to
`DarSourceMapMetadataExecutable`. Add a required `precision` field to
`IndexedDefinitionSource` and assign:

```ts
precision: executable.precision ?? SourceMappingPrecision.fallback,
```

The synthetic DAR fixture must serialize an optional `precision` field. Add a
required `precision` field to `ReplaySourceLocation` when a source mapping is
available, and pass it through from `LedgerReplaySessionLoader`.

Do not infer precision from helper names, file size, or span width. Do not
change evaluator trace emission in this task.

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run:

```bash
rtk npm test -- tests/unit/debugger/source/source-indexed-compilation.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run type checking**

Run:

```bash
rtk npm exec tsc -- -p tsconfig.json --noEmit
```

Expected: PASS with all metadata and public DTO call sites updated.

- [ ] **Step 6: Commit the provenance layer**

```bash
rtk git add src/debugger/source src/debugger/session/replay-source-location.ts src/debugger/index.ts tests/fixtures/daml-lf/source-mapped-dar-fixture.ts tests/unit/debugger/source/source-indexed-compilation.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts
rtk git commit -m "feat: track debugger source mapping precision"
```

## Task 2: Project Raw Evaluator Events Into Navigable Steps

**Files:**
- Modify: `src/debugger/replay/ledger-replay-session-loader.ts`
- Modify: `tests/unit/debugger/replay/ledger-replay-session-loader.test.ts`

- [ ] **Step 1: Write failing navigation-projection tests**

Use a controlled `IReplayEvaluator` test double that emits a known sequence
of raw `enterExpression`, `call`, `return`, and `stateEffect` events with
frames whose definition mappings are supplied by the source-mapped DAR
fixture. Add these independent tests:

```ts
it("suppresses fallback-only expression and call events", async () => {
    const session = await loadTraceWithMapping("fallback", [
        "enterExpression", "call", "return", "exitExpression",
    ]);

    expect(session.steps).toEqual([]);
});

it("retains a ledger effect with a fallback source location", async () => {
    const session = await loadTraceWithMapping("fallback", ["stateEffect"]);

    expect(session.steps).toHaveLength(1);
    expect(session.steps[0]?.phase).toBe("stateEffect");
    expect(session.steps[0]?.sourceLocation?.precision).toBe("fallback");
});

it("retains exact calls and returns but collapses repeated exact expression locations", async () => {
    const session = await loadExactTrace([
        "enterExpression", "exitExpression", "enterExpression", "call", "return",
    ]);

    expect(session.steps.map((step) => step.phase)).toEqual([
        "enterExpression", "call", "return",
    ]);
});
```

The state-effect test must also assert that the stored locals and stack frame
come from the retained raw event, not from an earlier filtered event.

- [ ] **Step 2: Run the loader tests and verify RED**

Run:

```bash
rtk npm test -- tests/unit/debugger/replay/ledger-replay-session-loader.test.ts
```

Expected: FAIL because `projectReplaySteps()` maps every raw event one-to-one.

- [ ] **Step 3: Implement two-stage projection**

Refactor the loader without changing evaluator behavior:

1. Rename the current one-to-one mapping logic to build raw projected entries,
   including stack and scope snapshots for every trace event.
2. Filter those raw entries with a dedicated predicate.
3. Recreate retained `ReplayStep` instances with contiguous user-visible
   `stepIndex` values, while preserving their captured scopes.

Apply these predicate rules exactly:

```ts
if (traceStep.stateEffect !== undefined) return true;
if (sourceLocation?.precision !== SourceMappingPrecision.exact) return false;
if (traceStep.kind === "call" || traceStep.kind === "return") return true;
return sourceKey !== previousNavigableExactSourceKey;
```

Only expression entry/exit events update the duplicate-source key. Calls and
returns remain visible exact call boundaries even if they share a span with
their caller. Source-less events are non-navigable when the loader has a
source mapper; retain current no-mapper behavior only where it is deliberately
used by evaluator-only unit tests, and document that it is not a
source-required Explorer session.

Do not modify `InMemoryReplaySessionStore`: it already consumes the final
precomputed `steps` sequence and should naturally make Step Into, Step Over,
Step Out, Continue, trace slices, and metadata operate on projected indices.

- [ ] **Step 4: Run the loader tests and verify GREEN**

Run:

```bash
rtk npm test -- tests/unit/debugger/replay/ledger-replay-session-loader.test.ts
```

Expected: PASS, including pre-existing stack/scope and state-effect tests.

- [ ] **Step 5: Commit the projection layer**

```bash
rtk git add src/debugger/replay/ledger-replay-session-loader.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts
rtk git commit -m "feat: project navigable debugger replay steps"
```

## Task 3: Preserve Session Controls And Verify The Explorer Reproduction

**Files:**
- Modify: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`
- Modify: `tests/unit/debugger/replay/ledger-replay-session-loader.test.ts` only if shared exact-map helpers are needed.

- [ ] **Step 1: Update or add the failing session-control regression test**

Configure the client fixture with exact source mappings for the call tree it
expects to step through. Assert that session metadata and every returned step
index are contiguous after projection:

```ts
it("steps only through projected exact locations and state effects", async () => {
    const client = createSourceMappedClient();
    const session = await client.loadSessionAsync(
        new ReplaySessionRequest({ offset: "42" }),
    );
    const trace = await client.getTraceSliceAsync("session-1", 0, 20);

    expect(trace.map((step) => step.stepIndex)).toEqual(
        trace.map((_, index) => index),
    );
    expect(session.metadata?.stepCount).toBe(trace.length);
});
```

- [ ] **Step 2: Run session tests and verify RED or the intended regression**

Run:

```bash
rtk npm test -- tests/unit/debugger/session/ledger-replay-debugger-client.test.ts
```

Expected: the test added in Step 1 fails before the fixture is source-mapped,
or existing stepping tests reveal assumptions about raw rather than projected
indices.

- [ ] **Step 3: Make the smallest fixture-only corrections**

Give definitions that represent real DAML call boundaries `exact` source-map
entries. Leave generated/helper definitions as `fallback`. Do not change store
stepping algorithms unless the projected trace reveals a real cursor bug.

- [ ] **Step 4: Run the debugger regression suite**

Run:

```bash
rtk npm test -- tests/unit/debugger/source/source-indexed-compilation.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts
rtk npm exec tsc -- -p tsconfig.json --noEmit
```

Expected: all focused tests and type checking PASS.

- [ ] **Step 5: Rebuild the SDK and exercise the real Explorer route**

Run:

```bash
rtk npm run build
rtk curl -sS -m 20 -X POST http://localhost:4600/api/debugger/sessions -H 'Content-Type: application/json' -d '{"nodeId":"cnqs-extra-1","offset":"1685"}'
```

Expected: a session payload. Inspect the returned trace through Explorer's
session endpoint and confirm that no sequence of raw `$sc_BaseVault_8` events
shares the fallback `Core.daml:1-921` location as independently navigable
steps. If the running backend has not picked up the built SDK, restart only the
backend process and repeat the request.

- [ ] **Step 6: Commit verification and fixture adjustments**

```bash
rtk git add tests/unit/debugger/session/ledger-replay-debugger-client.test.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts
rtk git commit -m "test: cover source-aware debugger navigation"
```

## Final Verification

Run the complete relevant suite before declaring Explorer readiness:

```bash
rtk npm test -- tests/unit/debugger tests/unit/daml-lf
rtk npm exec tsc -- -p tsconfig.json --noEmit
rtk npm run build
```

Then use the exact live reproduction at offset `1685` and verify create
session, trace slice, Step Into, and Step Over against the rebuilt SDK.
