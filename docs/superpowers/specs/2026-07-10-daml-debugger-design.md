# DAML Debugger Design

## Goal

Add a new debugger surface to this SDK that can:

- connect to a Canton node over gRPC
- open a debug session for exactly one committed ledger update at a given offset
- load the deployed DAR artifacts involved in that update
- extract original DAML source code from those DARs
- re-execute the corresponding LF program offline in TypeScript
- produce a source-mapped execution trace that Canton Explorer can step through line by line

The debugger is intended to become the replay and tracing engine behind a future Canton Explorer transaction debugger.

## Scope

This design covers:

- a new debugger-oriented public SDK surface
- gRPC-backed loading of one update by offset
- DAR and package loading for replay
- extraction of embedded DAML source from DAR artifacts
- a real LF evaluator with step instrumentation
- source-level mapping from compiled LF back to original DAML source when present in the DAR
- session APIs for stepping, stacks, locals, values, and state deltas
- explicit failure semantics when replay fidelity cannot be guaranteed

This design does not cover:

- multi-update or timeline debugging
- live participant-engine introspection
- partial or best-effort sessions
- fallback to LF-only stepping when source is unavailable
- fallback to local filesystem or git checkout source matching
- debugging topology transactions, reassignments, or other non-LF update kinds
- time-travel debugging across multiple transactions
- a UI implementation in Canton Explorer

## Problem Statement

The current SDK already has important building blocks:

- gRPC update and package service clients
- DAR loading and LF package decoding
- a semantic model over decoded LF
- an interpreter scaffold

What it does not have is the core capability required for a true debugger:

- a real LF evaluator
- a replay environment that can hydrate a transaction from ledger-visible state
- source extraction from deployed DARs
- mapping from compiled LF execution points back to original DAML source
- a stable stepping/session API for UI consumers

The user requirement is stricter than a normal transaction inspector:

- the trace must be a true LF evaluator trace
- execution must map back to original DAML source if that source is present in the DAR
- if source fidelity cannot be satisfied, the debug session must fail

This means the SDK should not expose an approximate "event debugger". It needs a replay debugger with explicit trust boundaries.

## Decision Summary

- add a new `canton-typescript-sdk/debugger` subpath
- build the debugger as an in-process TypeScript LF replay engine inside this repo
- scope v1 to exactly one committed transaction update at a requested offset
- produce traces by offline re-execution from deployed artifacts and hydrated ledger state
- treat DAR-contained source as the only authoritative source bundle
- fail session startup if required source is missing or cannot be mapped
- precompute the full trace before exposing the session
- prefer explicit refusal over partial fidelity

## Execution Model

The debugger is not attempting to read the participant's internal evaluation state. Instead it reconstructs execution by replaying the committed transaction from deployed artifacts and ledger-visible inputs.

Session startup flow:

1. read one committed update by offset over gRPC
2. verify the update is a supported ledger transaction shape and contains enough detail for replay
3. derive the replay entrypoint from the observable transaction payload
4. discover all required package and contract dependencies
5. fetch the corresponding package and DAR artifacts
6. extract the embedded DAML source bundle from those DARs
7. verify source mapping coverage for every executed definition
8. hydrate the replay pre-state from ledger-visible data
9. run the LF evaluator in trace mode
10. store the full step list and expose the session

Important rule:

- a session either opens with full source-mapped replay support or it does not open at all

## Replay Contract

The debugger should only open a session when it can prove it has enough information to replay the selected transaction faithfully enough for source-level stepping.

### Accepted input

- one ledger offset

### Accepted update kinds in v1

- ordinary committed ledger transactions

### Rejected update kinds in v1

- topology transactions
- reassignments
- checkpoint-like or non-executable update records
- any update shape that does not correspond to LF execution

### Replay prerequisites

Session startup must fail if any of the following are missing or unsupported:

- the update cannot be loaded
- the update payload does not expose enough information to reconstruct the replay entrypoint
- all required package artifacts cannot be fetched
- the executing DAR does not contain usable source code
- source-to-LF mapping for required frames is incomplete
- required contract pre-state cannot be hydrated
- the transaction uses LF constructs not yet implemented by the evaluator
- replay produces a determinism mismatch against observable ledger effects

### Fidelity rule

There is no fallback to:

- LF-only stepping
- heuristic local source matching
- mixed source-mapped and non-source-mapped frames
- partially hydrated replay

This is critical because Canton Explorer should only present a session when the result is trustworthy.

### Entrypoint derivation rule

The debugger can only replay updates whose initiating LF callable can be reconstructed from the observable update payload plus hydrated state.

Examples of replayable shapes include:

- template creation where the template constructor, signatory, observer, and key-related expressions can be derived from the created event payload
- visible exercised choices where the template or interface identifier, exercised contract payload, and choice argument are available

Updates must be rejected when the committed update does not expose enough information to determine the root callable, its arguments, or other required evaluator inputs with confidence.

This rule keeps the SDK honest about a hard protocol boundary: the ledger exposes committed effects, not an internal participant evaluation trace.

## DAR And Source Bundle Model

The current DAR loader only exposes the manifest and `.dalf` package entries. The debugger requires a richer artifact layer.

Add a source-aware DAR model that can expose:

- raw archive entries
- `.dalf` package payloads
- embedded source files
- build metadata relevant to source mapping

Recommended additions:

- `DarArchiveEntry`
- `DarSourceFileEntry`
- `DarSourceBundle`
- `DarSourceBundleLoader`

### Source bundle rules

- source must come from the deployed DAR
- DAR provenance should be discovered from participant package metadata, not guessed from package names
- source files are keyed by deployed package identity, not by local path assumptions
- the debugger may use only exact artifact-contained source
- if a DAR lacks the required source bundle, session creation fails

Recommended artifact lookup path:

1. use package IDs discovered from the update and transitive LF references
2. map package IDs to participant-local DAR descriptions through participant package reference APIs
3. fetch the relevant DAR archive bytes through participant DAR read APIs
4. extract the source bundle from the fetched DAR bytes

This keeps the debugger aligned with the actual deployed artifact rather than an approximation from a developer checkout.

## Source Mapping Model

The debugger needs a compilation product that combines decoded LF with source information.

Recommended layer:

- `SourceIndexedCompilation`

Built on top of:

- `DamlLfWorkspace`
- `DamlLfCompilation`

It should store, for each executable definition:

- package ID
- module name
- definition symbol
- source file path inside the DAR
- source span table for mappable expressions
- any supporting metadata needed to associate LF nodes with source-level frames

### Source-mapping rules

- only source mappings derived from the DAR bundle are accepted
- mappings must be stable enough to drive stepping and stack display
- if any executed definition lacks a trustworthy source table, session startup fails

The debugger is LF-native internally but source-native at the public trace boundary.

## Evaluator Architecture

The existing `DamlLfInterpreterScaffold` is only a placeholder. The debugger requires a real evaluator.

Recommended components:

- `DamlLfEvaluator`
- `DamlLfReplayEnvironment`
- `DamlLfExecutionFrame`
- `DamlLfHeap` or equivalent runtime binding store
- `DamlLfTraceEmitter`
- `DamlLfBuiltinRuntime`

### Evaluator responsibilities

- execute compiled LF definitions
- maintain call stack and lexical environments
- resolve packages, modules, templates, and values from the compilation
- invoke builtins through a controlled runtime surface
- model contract fetch, lookup, create, and exercise effects through the replay environment
- emit trace points at source-mappable execution boundaries

### Trace emission points

The evaluator should emit steps around:

- expression entry
- expression exit
- function call
- function return
- contract fetch and lookup
- create and archive effects
- exercise boundaries

This should be source-mappable rather than every micro-step of internal evaluator mechanics, so Explorer gets useful step semantics without exposing runtime noise.

## Replay Environment

The evaluator cannot run from package bytes alone. It needs a closed transaction replay environment.

Recommended runtime inputs:

- transaction metadata
- acting parties
- read-as parties if relevant to observable replay
- root replay entrypoint when derivable
- choice arguments
- referenced contract payloads
- disclosed or created contract values visible to the transaction
- template and interface metadata

Recommended component:

- `LedgerReplayEnvironmentBuilder`

Responsibilities:

- inspect the fetched update
- verify that the update format is rich enough for replay, including any choice arguments or event payloads the evaluator needs
- derive the root replay entrypoint or reject the session
- discover contract and package dependencies
- load contract state through existing SDK services where possible
- normalize ledger values into evaluator runtime values
- validate that the replay environment is closed before execution starts

### State hydration rule

Hydration is eager. The debugger should not begin stepping and then discover halfway through that required state is missing.

## Step And Session Model

The debugger should expose a stable stepping API suitable for Canton Explorer.

Recommended public types:

- `LedgerReplayDebuggerClient`
- `ReplaySessionRequest`
- `ReplaySession`
- `ReplaySessionMetadata`
- `ReplayStep`
- `ReplayStackFrame`
- `ReplayScope`
- `ReplayValuePreview`
- `ReplayStateDelta`
- `ReplaySourceLocation`

### `ReplayStep` shape

Each step should expose:

- `stepIndex`
- `phase`
- `sourceLocation`
- `stackFrames`
- `locals`
- `arguments`
- `expressionSummary`
- `valuePreview`
- `stateDelta`
- `templateContext`

### Step phases

Recommended initial phases:

- `enterExpression`
- `exitExpression`
- `call`
- `return`
- `stateEffect`

### Session methods

- `loadSessionAsync(request)`
- `getSessionMetadataAsync(sessionId)`
- `getCurrentStepAsync(sessionId)`
- `stepIntoAsync(sessionId)`
- `stepOverAsync(sessionId)`
- `stepOutAsync(sessionId)`
- `continueAsync(sessionId)`
- `getStackAsync(sessionId)`
- `getScopesAsync(sessionId, frameId)`
- `getTraceSliceAsync(sessionId, startStep, count)`
- `disposeSessionAsync(sessionId)`

### Stepping semantics

- `stepInto` advances to the next trace frame
- `stepOver` runs until the current source span completes at the same stack depth
- `stepOut` runs until control returns to the caller
- `continue` advances to the end of the update trace
- reverse navigation, if added, should read from the stored trace rather than requiring reverse execution

## Public Package Boundary

Expose the debugger as:

- `canton-typescript-sdk/debugger`

Keep it separate from:

- the core transport root surface
- the `daml-lf` artifact/semantic surface

This separation keeps the debugger's replay/session API clear while still allowing it to depend on shared internal SDK layers.

Recommended source layout:

- `src/debugger/index.ts`
- `src/debugger/session/...`
- `src/debugger/replay/...`
- `src/debugger/source/...`
- `src/debugger/runtime/...`
- `src/debugger/errors/...`

## Error Model

The debugger should fail with typed, explicit errors rather than generic transport or runtime failures.

Recommended exception types:

- `ReplayUnsupportedUpdateException`
- `ReplayMissingPackageException`
- `ReplayMissingSourceException`
- `ReplaySourceMapException`
- `ReplayStateHydrationException`
- `ReplayUnsupportedLfConstructException`
- `ReplayDeterminismException`

### Error principles

- fail before opening a session whenever possible
- do not silently degrade fidelity
- distinguish transport failure from replay failure
- distinguish missing source from unsupported evaluator coverage

## Determinism And Validation

Offline replay is only useful if the SDK can validate that the observed result is consistent with the replayed execution.

Recommended validation checks:

- resulting creates match observed created events
- exercised choices match observed exercised events
- archived contracts match observed archival effects
- fetched and looked-up contract identities are consistent with the hydrated state

If replay diverges from observable effects, the session should fail with a determinism error instead of exposing a misleading trace.

## Testing Strategy

This feature needs layered tests because the failure modes are semantic, not just structural.

### Unit tests

- DAR source bundle extraction
- source map coverage validation
- evaluator stepping behavior on small LF fixtures
- stack and locals capture
- trace phase emission
- step-over and step-out semantics
- explicit rejection for unsupported update kinds

### Integration tests

- load one update by offset from a controlled ledger fixture
- fetch required packages and source bundle
- hydrate contract pre-state
- materialize a full trace for a simple transaction
- verify source locations, locals, and state deltas

### Regression tests

- session fails when source is missing from the DAR
- session fails when source mapping is incomplete
- session fails when a referenced contract cannot be hydrated
- session fails when an LF construct is not implemented
- session fails when replayed effects diverge from observed ledger effects

The first implementation milestone should use small, deterministic LF fixtures rather than trying to cover full real-world DAML immediately.

## Non-Goals

This design does not attempt to provide:

- exact participant-engine internal state capture
- source debugging for DARs without embedded source
- cross-transaction stepping
- multi-update timelines
- breakpoints across a live streaming session
- topology or repair workflow debugging
- a source parser independent of DAR artifacts

## Recommended Rollout Order

1. extend DAR handling to expose raw archive entries and embedded source files
2. add source bundle extraction and validation APIs
3. introduce the `debugger` public subpath and replay DTOs
4. implement a minimal LF evaluator with trace hooks for a constrained subset
5. add `SourceIndexedCompilation`
6. implement transaction replay environment hydration
7. add trace materialization and stepping/session control
8. validate replay determinism against observable ledger effects
9. expand evaluator coverage toward realistic transaction shapes

## V1 Acceptance Target

V1 should be considered successful when the SDK can:

- open a debug session for one committed transaction update by offset
- load the exact deployed DAR and required package dependencies
- require and consume DAML source from the DAR
- re-execute the transaction through a real LF evaluator
- expose source-level steps, stack frames, locals, value previews, and state deltas
- reject unsupported shapes explicitly instead of degrading behavior

That gives Canton Explorer a trustworthy transaction debugger foundation without pretending the SDK can already cover every LF construct or every ledger update kind.
