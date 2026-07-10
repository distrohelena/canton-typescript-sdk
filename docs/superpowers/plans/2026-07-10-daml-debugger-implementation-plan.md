# DAML Debugger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `@distrohelena/canton-typescript-sdk/debugger` surface that opens a source-required replay session for one committed ledger update by offset and exposes a precomputed, source-mapped LF execution trace.

**Architecture:** Keep debugger orchestration in a new `src/debugger` subpath, but reuse and extend the existing `src/daml-lf` artifact and interpreter layers instead of inventing a second LF runtime. Add source-aware DAR extraction in `src/daml-lf/container`, add a real evaluator in `src/daml-lf/interpreter`, then build debugger-specific replay loading, source validation, state hydration, trace recording, and session APIs on top of the existing gRPC package/update/contract services.

**Tech Stack:** TypeScript, Vitest, existing gRPC service clients, protobuf-ts generated Ledger API/Canton admin types for internal mapping only, existing `fflate` DAR handling, existing `daml-lf` parser/model layer

---

## File Structure

Keep the implementation split by responsibility instead of mixing debugger concerns into existing transport clients:

- Create: `src/debugger/index.ts`
- Create: `src/debugger/ledger-replay-debugger-client.ts`
- Create: `src/debugger/errors/replay-unsupported-update.exception.ts`
- Create: `src/debugger/errors/replay-missing-package.exception.ts`
- Create: `src/debugger/errors/replay-missing-source.exception.ts`
- Create: `src/debugger/errors/replay-source-map.exception.ts`
- Create: `src/debugger/errors/replay-state-hydration.exception.ts`
- Create: `src/debugger/errors/replay-unsupported-lf-construct.exception.ts`
- Create: `src/debugger/errors/replay-determinism.exception.ts`
- Create: `src/debugger/session/replay-session-request.ts`
- Create: `src/debugger/session/replay-session.ts`
- Create: `src/debugger/session/replay-session-metadata.ts`
- Create: `src/debugger/session/replay-step.ts`
- Create: `src/debugger/session/replay-step-advance-result.ts`
- Create: `src/debugger/session/replay-stack-frame.ts`
- Create: `src/debugger/session/replay-scope.ts`
- Create: `src/debugger/session/replay-value-preview.ts`
- Create: `src/debugger/session/replay-source-location.ts`
- Create: `src/debugger/session/replay-state-delta.ts`
- Create: `src/debugger/session/replay-phase.ts`
- Create: `src/debugger/session/in-memory-replay-session-store.ts`
- Create: `src/debugger/replay/ledger-replay-session-loader.ts`
- Create: `src/debugger/replay/ledger-replay-environment-builder.ts`
- Create: `src/debugger/replay/replay-artifact-resolver.ts`
- Create: `src/debugger/replay/replay-update-loader.ts`
- Create: `src/debugger/replay/replay-update-visibility-validator.ts`
- Create: `src/debugger/replay/replay-entrypoint.ts`
- Create: `src/debugger/replay/replay-determinism-validator.ts`
- Create: `src/debugger/source/source-indexed-compilation.ts`
- Create: `src/debugger/source/source-coverage-validator.ts`
- Create: `src/debugger/source/daml-source-mapper.ts`
- Create: `src/debugger/source/dar-source-map-metadata.ts`
- Create: `src/daml-lf/container/dar-archive-entry.ts`
- Create: `src/daml-lf/container/dar-source-file-entry.ts`
- Create: `src/daml-lf/container/dar-source-bundle.ts`
- Create: `src/daml-lf/container/dar-source-bundle-loader.ts`
- Modify: `src/daml-lf/container/dar-archive.ts`
- Modify: `src/daml-lf/container/dar-archive-loader.ts`
- Modify: `src/daml-lf/index.ts`
- Create: `src/daml-lf/interpreter/daml-lf-evaluator.ts`
- Create: `src/daml-lf/interpreter/daml-lf-runtime-frame.ts`
- Create: `src/daml-lf/interpreter/daml-lf-lexical-scope.ts`
- Create: `src/daml-lf/interpreter/daml-lf-trace-sink.interface.ts`
- Create: `src/daml-lf/interpreter/daml-lf-step-kind.ts`
- Modify: `src/daml-lf/interpreter/daml-lf-interpreter-scaffold.ts`
- Modify: `package.json`
- Modify: `DOCUMENTATION.md`
- Modify: `README.md`
- Create: `tests/fixtures/daml-lf/source-mapped-dar-fixture.ts`
- Create: `tests/unit/debugger/debugger-public-surface.test.ts`
- Create: `tests/unit/debugger/replay/replay-artifact-resolver.test.ts`
- Create: `tests/unit/debugger/replay/replay-update-loader.test.ts`
- Create: `tests/unit/debugger/replay/replay-update-visibility-validator.test.ts`
- Create: `tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts`
- Create: `tests/unit/debugger/source/source-indexed-compilation.test.ts`
- Create: `tests/unit/debugger/source/source-coverage-validator.test.ts`
- Create: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`
- Create: `tests/unit/daml-lf/dar-source-bundle-loader.test.ts`
- Create: `tests/unit/daml-lf/daml-lf-evaluator.test.ts`
- Create: `tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts`
- Modify: `tests/unit/daml-lf/dar-archive-loader.test.ts`
- Modify: `tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Create: `tests/integration/debugger/ledger-replay-debugger.integration.test.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`

Keep the richer replay/update mapping internal to the debugger package in this pass. Do not redesign the generic `updateService` public DTO surface unless the debugger work proves it is unavoidable.

## Task 1: Scaffold The Public Debugger Surface And Package Export

**Files:**
- Create: `src/debugger/index.ts`
- Create: `src/debugger/ledger-replay-debugger-client.ts`
- Create: `src/debugger/errors/replay-unsupported-update.exception.ts`
- Create: `src/debugger/errors/replay-missing-package.exception.ts`
- Create: `src/debugger/errors/replay-missing-source.exception.ts`
- Create: `src/debugger/errors/replay-source-map.exception.ts`
- Create: `src/debugger/errors/replay-state-hydration.exception.ts`
- Create: `src/debugger/errors/replay-unsupported-lf-construct.exception.ts`
- Create: `src/debugger/errors/replay-determinism.exception.ts`
- Create: `src/debugger/session/replay-session-request.ts`
- Create: `src/debugger/session/replay-session.ts`
- Create: `src/debugger/session/replay-session-metadata.ts`
- Create: `src/debugger/session/replay-step.ts`
- Create: `src/debugger/session/replay-step-advance-result.ts`
- Create: `src/debugger/session/replay-stack-frame.ts`
- Create: `src/debugger/session/replay-scope.ts`
- Create: `src/debugger/session/replay-value-preview.ts`
- Create: `src/debugger/session/replay-source-location.ts`
- Create: `src/debugger/session/replay-state-delta.ts`
- Create: `src/debugger/session/replay-phase.ts`
- Modify: `package.json`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Create: `tests/unit/debugger/debugger-public-surface.test.ts`

- [ ] **Step 1: Write the failing debugger public-surface tests**

```ts
import { describe, expect, it } from "vitest";
import {
    LedgerReplayDebuggerClient,
    ReplayDeterminismException,
    ReplayPhase,
    ReplaySessionRequest,
    ReplayStepAdvanceResult,
} from "../../../src/debugger/index.js";

describe("debugger public surface", () => {
    it("stores a replay session request offset", () => {
        const request = new ReplaySessionRequest({ offset: "0000000000000001" });
        expect(request.offset).toBe("0000000000000001");
    });

    it("stores step advance results", () => {
        const result = new ReplayStepAdvanceResult({
            sessionId: "session-1",
            step: {
                stepIndex: 1,
                phase: ReplayPhase.enterExpression,
                stackFrames: [],
                locals: [],
                arguments: [],
                valuePreview: undefined,
            },
            isTerminal: false,
            nextStepIndex: 2,
        });

        expect(result.nextStepIndex).toBe(2);
    });

    it("exports the debugger client and replay exceptions", () => {
        expect(LedgerReplayDebuggerClient).toBeTypeOf("function");
        expect(new ReplayDeterminismException("mismatch")).toBeInstanceOf(Error);
    });

    it("stores value previews for replay steps", () => {
        const preview = new ReplayValuePreview({
            kind: "record",
            display: "Main.Vault(owner = Alice)",
        });

        expect(preview.display).toContain("Vault");
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/debugger/debugger-public-surface.test.ts tests/unit/smoke/package-shape.test.ts`
Expected: FAIL with missing `src/debugger` exports and missing DTO/exception classes

- [ ] **Step 3: Implement the debugger surface skeleton**

Create the DTO and exception classes with only constructor validation and storage in this task. Keep the client minimal:

```ts
export class ReplaySessionRequest {
    public readonly offset: string;

    public constructor(init: { offset: string }) {
        if (!init.offset) {
            throw new ValidationError("replay session requests require an offset");
        }

        this.offset = init.offset;
    }
}
```

Also make the step/session DTOs concrete enough for later tasks:

- `ReplayStep` must already carry `stackFrames`, `locals`, `arguments`, and optional `valuePreview`
- `ReplayValuePreview` must be its own class, not an untyped field bag
- `ReplaySession` must already own `sessionId`, `metadata`, and `currentStep`

Add the new subpath export:

```json
"./debugger": {
  "types": "./dist/debugger/index.d.ts",
  "import": "./dist/debugger/index.js"
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/debugger/debugger-public-surface.test.ts tests/unit/smoke/package-shape.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add package.json src/debugger tests/unit/debugger/debugger-public-surface.test.ts tests/unit/smoke/package-shape.test.ts
rtk git commit -m "feat: scaffold debugger public surface"
```

## Task 2: Extend DAR Loading To Preserve Raw Entries And Extract Source Bundles

**Files:**
- Create: `src/daml-lf/container/dar-archive-entry.ts`
- Create: `src/daml-lf/container/dar-source-file-entry.ts`
- Create: `src/daml-lf/container/dar-source-bundle.ts`
- Create: `src/daml-lf/container/dar-source-bundle-loader.ts`
- Modify: `src/daml-lf/container/dar-archive.ts`
- Modify: `src/daml-lf/container/dar-archive-loader.ts`
- Modify: `src/daml-lf/index.ts`
- Create: `tests/fixtures/daml-lf/source-mapped-dar-fixture.ts`
- Modify: `tests/unit/daml-lf/dar-archive-loader.test.ts`
- Create: `tests/unit/daml-lf/dar-source-bundle-loader.test.ts`

- [ ] **Step 1: Write the failing DAR/source bundle tests**

Use both the real live DAR fixture and a synthetic source-mapped test DAR:

```ts
it("retains raw archive entries beyond dalf payloads", async () => {
    const archive = await loader.loadDarOrThrowAsync(darBytes);
    expect(archive.entries.some((entry) => entry.path.endsWith(".daml"))).toBe(true);
});

it("extracts source files and source-map metadata from a source-mapped dar", async () => {
    const bundle = await bundleLoader.loadSourceBundleOrThrowAsync(darBytes);
    expect(bundle.sourceFiles.map((file) => file.path)).toContain("src/Main.daml");
    expect(bundle.metadata.executables.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/daml-lf/dar-archive-loader.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts`
Expected: FAIL because `DarArchive` does not retain arbitrary entries and no source bundle loader exists

- [ ] **Step 3: Implement raw-entry retention and source bundle extraction**

Keep the current manifest and package entry behavior intact, but add:

```ts
export class DarArchive {
    public readonly entries: readonly DarArchiveEntry[];
    public readonly sourceFiles: readonly DarSourceFileEntry[];
}
```

Implement `DarSourceBundleLoader` to:

- read `.daml` and related source entries from the archive
- read debugger/source-map metadata from the synthetic fixture format
- return a deterministic `DarSourceBundle`

Do not guess source-map metadata from filenames. Require explicit bundle metadata and fail when it is absent.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/daml-lf/dar-archive-loader.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-lf/container src/daml-lf/index.ts tests/fixtures/daml-lf/source-mapped-dar-fixture.ts tests/unit/daml-lf/dar-archive-loader.test.ts tests/unit/daml-lf/dar-source-bundle-loader.test.ts
rtk git commit -m "feat: add source-aware dar loading"
```

## Task 3: Add Debugger Artifact Resolution And Deterministic DAR Provenance

**Files:**
- Create: `src/debugger/replay/replay-artifact-resolver.ts`
- Create: `src/debugger/source/dar-source-map-metadata.ts`
- Modify: `src/debugger/errors/replay-missing-package.exception.ts`
- Modify: `src/debugger/errors/replay-missing-source.exception.ts`
- Create: `tests/unit/debugger/replay/replay-artifact-resolver.test.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`

- [ ] **Step 1: Write the failing artifact resolution tests**

Cover both the happy path and the ambiguity rule:

```ts
it("resolves required package ids to dar bytes through package references", async () => {
    const resolution = await resolver.resolveAsync(["pkg-main"]);
    expect(resolution.dars).toHaveLength(1);
    expect(resolution.packageIds).toContain("pkg-main");
});

it("recursively resolves transitive lf package dependencies", async () => {
    const resolution = await resolver.resolveAsync(["pkg-main"]);
    expect(resolution.packageIds).toContain("pkg-dependency");
});

it("rejects conflicting duplicate package provenance across dars", async () => {
    await expect(
        resolver.resolveAsync(["pkg-main"]),
    ).rejects.toThrow(ReplayMissingSourceException);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/debugger/replay/replay-artifact-resolver.test.ts`
Expected: FAIL because no resolver exists and fake gRPC services do not expose the needed DAR/package-reference behavior

- [ ] **Step 3: Implement the artifact resolver**

`ReplayArtifactResolver` should:

- call `participantPackageService.getPackageReferencesAsync(...)`
- fetch each referenced DAR with `participantPackageService.getDarAsync(...)`
- decode LF packages from DAR bytes
- walk transitive LF imports until the package closure is complete
- load source bundles from the same DAR bytes
- union referenced DARs for the replay
- reject non-byte-equivalent duplicates for the same package/source-map record

Implementation sketch:

```ts
for (const packageId of requiredPackageIds) {
    const references =
        await participantPackageService.getPackageReferencesAsync(
            new GetPackageReferencesRequest({ packageId }),
        );

    for (const dar of references.dars) {
        const response = await participantPackageService.getDarAsync(
            new GetDarRequest({ mainPackageId: dar.main }),
        );
        // decode, merge, validate duplicates
    }
}
```

Use a queue or worklist so imports discovered only after decoding a DAR still get resolved:

```ts
while (pendingPackageIds.length > 0) {
    const packageId = pendingPackageIds.shift()!;
    // resolve DARs, decode packages, enqueue newly discovered imports
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/debugger/replay/replay-artifact-resolver.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/debugger/replay/replay-artifact-resolver.ts src/debugger/source/dar-source-map-metadata.ts src/debugger/errors tests/fixtures/fake-grpc-services.ts tests/unit/debugger/replay/replay-artifact-resolver.test.ts
rtk git commit -m "feat: resolve debugger replay artifacts from dar provenance"
```

## Task 4: Add Replay Update Loading And Visibility Validation

**Files:**
- Create: `src/debugger/replay/replay-update-loader.ts`
- Create: `src/debugger/replay/replay-update-visibility-validator.ts`
- Create: `src/debugger/replay/replay-entrypoint.ts`
- Modify: `src/debugger/errors/replay-unsupported-update.exception.ts`
- Create: `tests/unit/debugger/replay/replay-update-loader.test.ts`
- Create: `tests/unit/debugger/replay/replay-update-visibility-validator.test.ts`

- [ ] **Step 1: Write the failing replay-update tests**

Use generated gRPC shapes internally in the tests, but assert only debugger-owned outputs:

```ts
it("loads a replayable transaction update from getUpdateByOffset", async () => {
    const update = await loader.loadOrThrowAsync("42");
    expect(update.kind).toBe("transaction");
    expect(update.offset).toBe("42");
});

it("derives a create replay entrypoint from a created event payload", async () => {
    const update = await loader.loadOrThrowAsync("42");
    expect(update.entrypoint.kind).toBe("create");
});

it("rejects updates whose initiating callable cannot be reconstructed", async () => {
    await expect(loader.loadOrThrowAsync("43")).rejects.toThrow(
        ReplayUnsupportedUpdateException,
    );
});

it("rejects filtered updates missing replay-critical exercised details", async () => {
    expect(() => validateReplayVisibility(update)).toThrow(
        ReplayUnsupportedUpdateException,
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/debugger/replay/replay-update-loader.test.ts tests/unit/debugger/replay/replay-update-visibility-validator.test.ts`
Expected: FAIL because the debugger does not yet request a richer replay-specific update format or validate visibility constraints

- [ ] **Step 3: Implement internal replay-update loading**

Keep this internal to the debugger package. Do not widen the generic `updateService` DTO surface in this task. The loader should:

- build the richest available `updateFormat` object for replay
- call existing `updateService.getUpdateByOffsetAsync(...)`
- normalize the returned protobuf transaction payload into a debugger-owned replay snapshot
- derive a `ReplayEntrypoint` for create vs. exercise roots and reject ambiguous roots
- reject topology transactions, reassignments, and filtered transaction slices that cannot be replayed

Add a validator that enforces:

- required event payloads are present
- exercised-callable context is present when needed
- visible tree structure is sufficient for replay ordering
- replay entrypoint arguments and callable identity are reconstructible from the visible payload

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/debugger/replay/replay-update-loader.test.ts tests/unit/debugger/replay/replay-update-visibility-validator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/debugger/replay/replay-update-loader.ts src/debugger/replay/replay-update-visibility-validator.ts src/debugger/replay/replay-entrypoint.ts src/debugger/errors/replay-unsupported-update.exception.ts tests/unit/debugger/replay/replay-update-loader.test.ts tests/unit/debugger/replay/replay-update-visibility-validator.test.ts
rtk git commit -m "feat: add replay update loading and visibility validation"
```

## Task 5: Build Source-Indexed Compilation And Coverage Validation

**Files:**
- Create: `src/debugger/source/source-indexed-compilation.ts`
- Create: `src/debugger/source/source-coverage-validator.ts`
- Create: `src/debugger/source/daml-source-mapper.ts`
- Create: `tests/unit/debugger/source/source-indexed-compilation.test.ts`
- Create: `tests/unit/debugger/source/source-coverage-validator.test.ts`

- [ ] **Step 1: Write the failing source-index tests**

```ts
it("indexes executable definitions against dar source spans", () => {
    const indexed = SourceIndexedCompilation.createOrThrow(compilation, bundle);
    expect(indexed.getDefinitionSourceOrThrow("pkg", "Main", "archive")).toEqual(
        expect.objectContaining({
            path: "src/Main.daml",
        }),
    );
});

it("rejects a required symbol that has no source map entry", () => {
    expect(() =>
        SourceCoverageValidator.validateOrThrow(indexed, requiredSymbols),
    ).toThrow(ReplaySourceMapException);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/debugger/source/source-indexed-compilation.test.ts tests/unit/debugger/source/source-coverage-validator.test.ts`
Expected: FAIL because no source-indexed compilation layer exists

- [ ] **Step 3: Implement source indexing and conservative preflight validation**

Add:

- `SourceIndexedCompilation.createOrThrow(compilation, sourceBundles)`
- `DamlSourceMapper`
- `SourceCoverageValidator.validateOrThrow(...)`

Implementation rules:

- validate definitely required root symbols before replay
- allow conservative reachable-set validation
- keep runtime enforcement for actually executed frames later

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/debugger/source/source-indexed-compilation.test.ts tests/unit/debugger/source/source-coverage-validator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/debugger/source tests/unit/debugger/source
rtk git commit -m "feat: add source-indexed debugger compilation"
```

## Task 6: Build The Replay Environment And State Hydration Layer

**Files:**
- Create: `src/debugger/replay/ledger-replay-environment-builder.ts`
- Create: `tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts`
- Modify: `src/debugger/errors/replay-state-hydration.exception.ts`
- Modify: `tests/fixtures/fake-grpc-services.ts`

- [ ] **Step 1: Write the failing replay-environment tests**

```ts
it("hydrates exercised contract payloads and transaction metadata", async () => {
    const environment = await builder.buildOrThrowAsync(snapshot);
    expect(environment.contracts.get("00abc")?.payload).toEqual({ owner: "Alice" });
    expect(environment.actAs).toEqual(["Alice"]);
});

it("fails when a required contract cannot be hydrated", async () => {
    await expect(builder.buildOrThrowAsync(snapshot)).rejects.toThrow(
        ReplayStateHydrationException,
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts`
Expected: FAIL because no replay environment builder exists

- [ ] **Step 3: Implement eager replay hydration**

The builder should:

- inspect the replay snapshot
- collect required contract IDs and package IDs
- consume the already-derived `ReplayEntrypoint` instead of inferring root behavior a second time
- hydrate contract payloads with `contractService.getContractAsync(...)`
- use `eventQueryService.getEventsByContractIdAsync(...)` when event history is needed for effect validation
- normalize ledger values into evaluator runtime values
- fail before replay when any dependency is missing

Keep the environment as a debugger-owned object. Do not leak raw protobuf events into the evaluator API.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/debugger/replay/ledger-replay-environment-builder.ts src/debugger/errors/replay-state-hydration.exception.ts tests/fixtures/fake-grpc-services.ts tests/unit/debugger/replay/ledger-replay-environment-builder.test.ts
rtk git commit -m "feat: add replay environment hydration"
```

## Task 7: Replace The Interpreter Scaffold With A Real LF Evaluator And Trace Sink

**Files:**
- Create: `src/daml-lf/interpreter/daml-lf-evaluator.ts`
- Create: `src/daml-lf/interpreter/daml-lf-runtime-frame.ts`
- Create: `src/daml-lf/interpreter/daml-lf-lexical-scope.ts`
- Create: `src/daml-lf/interpreter/daml-lf-trace-sink.interface.ts`
- Create: `src/daml-lf/interpreter/daml-lf-step-kind.ts`
- Modify: `src/daml-lf/interpreter/daml-lf-interpreter-scaffold.ts`
- Modify: `src/daml-lf/index.ts`
- Create: `tests/unit/daml-lf/daml-lf-evaluator.test.ts`
- Modify: `tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts`

- [ ] **Step 1: Write the failing pure-evaluator tests**

Start with pure expression evaluation and trace hooks, not ledger effects:

```ts
it("evaluates a value definition and emits enter/exit trace steps", () => {
    const steps: DamlLfStepKind[] = [];
    evaluator.evaluateValueDefinitionOrThrow(definition, {
        onStep(step) {
            steps.push(step.kind);
        },
    });

    expect(steps).toEqual([
        DamlLfStepKind.enterExpression,
        DamlLfStepKind.exitExpression,
    ]);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-evaluator.test.ts tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts`
Expected: FAIL because only `DamlLfInterpreterScaffold` exists

- [ ] **Step 3: Implement the evaluator core**

Add a real `DamlLfEvaluator` that can:

- evaluate value definitions through lexical scopes
- emit step notifications to a trace sink
- resolve definitions through `DamlLfCompilation`
- use `DamlLfBuiltinDispatch` through a runtime boundary instead of inlining builtins into the debugger

Keep the evaluator reusable from `src/daml-lf`; the debugger should consume it, not own a private copy.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-evaluator.test.ts tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-lf/interpreter src/daml-lf/index.ts tests/unit/daml-lf/daml-lf-evaluator.test.ts tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts
rtk git commit -m "feat: add daml lf evaluator core"
```

## Task 8: Add Ledger-Effect Evaluation, Trace Recording, And Session Orchestration

**Files:**
- Create: `src/debugger/session/in-memory-replay-session-store.ts`
- Create: `src/debugger/replay/ledger-replay-session-loader.ts`
- Create: `src/debugger/replay/replay-determinism-validator.ts`
- Modify: `src/debugger/ledger-replay-debugger-client.ts`
- Modify: `src/debugger/session/replay-step.ts`
- Modify: `src/debugger/session/replay-step-advance-result.ts`
- Create: `tests/unit/debugger/replay/replay-determinism-validator.test.ts`
- Create: `tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts`
- Create: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`

- [ ] **Step 1: Write the failing ledger-effect and session tests**

```ts
it("records state-effect steps for exercised choices", async () => {
    const session = await client.loadSessionAsync(
        new ReplaySessionRequest({ offset: "42" }),
    );

    const effectSteps = session.metadata.stepCount;
    expect(effectSteps).toBeGreaterThan(0);
    expect(session.currentStep.stateDelta?.kind).toBeDefined();
});

it("stepOver returns the new current step and terminal state", async () => {
    const result = await client.stepOverAsync("session-1");
    expect(result.sessionId).toBe("session-1");
    expect(result.step.stepIndex).toBeGreaterThan(0);
});

it("returns stacks, scopes, and trace slices from the precomputed session", async () => {
    await expect(client.getStackAsync("session-1")).resolves.toBeInstanceOf(Array);
    await expect(client.getScopesAsync("session-1", "frame-1")).resolves.toBeInstanceOf(Array);
    await expect(client.getTraceSliceAsync("session-1", 0, 10)).resolves.toBeInstanceOf(Array);
});

it("supports the full required session method set", async () => {
    await expect(client.getSessionMetadataAsync("session-1")).resolves.toBeDefined();
    await expect(client.getCurrentStepAsync("session-1")).resolves.toBeDefined();
    await expect(client.stepIntoAsync("session-1")).resolves.toBeDefined();
    await expect(client.stepOutAsync("session-1")).resolves.toBeDefined();
    await expect(client.continueAsync("session-1")).resolves.toBeDefined();
    await expect(client.disposeSessionAsync("session-1")).resolves.toBeUndefined();
});

it("rejects replay traces whose observed effects diverge from evaluation output", async () => {
    await expect(client.loadSessionAsync(new ReplaySessionRequest({ offset: "99" }))).rejects.toThrow(
        ReplayDeterminismException,
    );
});

it("rejects replay when evaluation reaches an unsupported lf construct", async () => {
    await expect(client.loadSessionAsync(new ReplaySessionRequest({ offset: "100" }))).rejects.toThrow(
        ReplayUnsupportedLfConstructException,
    );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`
Expected: FAIL because the evaluator is not yet ledger-aware and the debugger client has no session loader/store behavior

- [ ] **Step 3: Implement ledger-aware replay and session control**

Add:

- evaluator support for fetch/lookup/create/exercise effects through the replay environment
- `ReplayDeterminismValidator` that compares replayed creates/exercises/archives against the observed update snapshot
- a trace recorder that converts evaluator steps into `ReplayStep`
- `LedgerReplaySessionLoader` that runs the full replay before session exposure
- `InMemoryReplaySessionStore` that holds the trace and current cursor
- the full required public method set on `LedgerReplayDebuggerClient`, including `getSessionMetadataAsync`, `getCurrentStepAsync`, `stepIntoAsync`, `stepOverAsync`, `stepOutAsync`, `continueAsync`, and `disposeSessionAsync`
- `getStackAsync`, `getScopesAsync`, and `getTraceSliceAsync` over the stored trace
- explicit `ReplayValuePreview` population for step values and state deltas
- translation of unimplemented evaluator nodes into `ReplayUnsupportedLfConstructException`

Implementation rule:

- do not expose a session before full replay and runtime source validation succeed

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts tests/unit/debugger/replay/replay-determinism-validator.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/debugger/ledger-replay-debugger-client.ts src/debugger/replay/ledger-replay-session-loader.ts src/debugger/replay/replay-determinism-validator.ts src/debugger/session src/daml-lf/interpreter tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts tests/unit/debugger/replay/replay-determinism-validator.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts
rtk git commit -m "feat: add debugger replay sessions and stepping"
```

## Task 9: Add Integration Coverage And Publish The Debugger Surface In Docs

**Files:**
- Create: `tests/integration/debugger/ledger-replay-debugger.integration.test.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `README.md`
- Modify: `src/debugger/index.ts`
- Modify: `src/index.ts` only if root-level re-exports are intentionally required for shared debugger DTOs

- [ ] **Step 1: Write the failing integration and docs assertions**

The integration test should exercise the full orchestrator with fake services:

```ts
it("opens a precomputed replay session for one offset", async () => {
    const session = await client.loadSessionAsync(
        new ReplaySessionRequest({ offset: "42" }),
    );

    expect(session.metadata.offset).toBe("42");
    expect(session.metadata.stepCount).toBeGreaterThan(0);
    expect(session.currentStep.stackFrames).toBeInstanceOf(Array);
    expect(session.currentStep.valuePreview?.display).toBeDefined();
});
```

Also add smoke-level assertions that the debugger subpath is documented in the README and `DOCUMENTATION.md`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/integration/debugger/ledger-replay-debugger.integration.test.ts tests/unit/debugger/debugger-public-surface.test.ts`
Expected: FAIL because the full replay stack and docs are not yet wired end-to-end

- [ ] **Step 3: Implement the final wiring and docs**

Document:

- the new `@distrohelena/canton-typescript-sdk/debugger` subpath
- single-update scope
- source-required behavior
- failure semantics for filtered/missing-source sessions
- that the trace is produced by offline LF replay from deployed DARs

Do not promise support for multi-update timelines or live participant introspection.

- [ ] **Step 4: Run the focused verification suite**

Run: `rtk npm test -- tests/unit/debugger tests/unit/daml-lf tests/integration/debugger`
Expected: PASS

Run: `rtk npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add DOCUMENTATION.md README.md src/debugger src/daml-lf tests/integration/debugger
rtk git commit -m "docs: publish debugger replay surface"
```

## Final Verification

Before calling the feature complete, run the whole relevant suite once:

- `rtk npm test -- tests/unit/debugger tests/unit/daml-lf tests/integration/debugger`
- `rtk npm run build`

If a live ledger fixture is available and stable enough, optionally add:

- `rtk npm test -- tests/live/specs/live-package-services.test.ts`

Do not add a live debugger spec in this pass unless the replay fixture is fully deterministic and source-mapped.
