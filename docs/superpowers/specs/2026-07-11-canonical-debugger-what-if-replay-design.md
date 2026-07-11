# Canonical Debugger And What-If Replay Design

## Goal

Extend the DAML Explorer replay debugger in two phases:

1. Phase 1 upgrades the canonical debugger so users can inspect all in-scope variables, navigate backward, and inspect ledger-visible emitted events as first-class debugger steps and in a separate event list.
2. Phase 2 adds a forked `what-if` replay mode that supports constrained source edits and LF-aware state edits from an exact selected step, then rebuilds and replays forward in an isolated temporary workspace.

The first implementation phase stops at canonical debugger improvements, but the design covers both phases so the phase-1 API and data model do not paint phase 2 into a corner.

## Scope

### In Scope

- Canonical replay session enrichment
- Full per-step in-scope variable visibility grouped by frame
- Explicit ledger event steps for `create`, `exercise`, and `archive`
- Separate ledger event list for canonical replay
- `stepBack` navigation over canonical replay
- Phase-2 `what-if` fork session model
- Constrained raw-source editing in a temporary fork workspace
- LF-aware direct state editing with immediate type blocking
- Incremental rebuild and fork replay from the exact selected step
- Divergence tracking between original ledger-visible events and the `what-if` stream

### Out Of Scope

- Free-form source editing that adds imports or new external references
- Structural edits to templates, interfaces, choices, or top-level function shape
- Canonical replay mutation in place
- Internal evaluator-operation event views beyond ledger-visible events in phase 1
- Automatic rerun on each edit
- Persisting fork edits into the real workspace checkout

## Requirements

### Functional Requirements

- Canonical debugger must expose all in-scope variables under the current step.
- Canonical debugger must show ledger-visible emitted events as separate steps.
- Canonical debugger must support stepping backward deterministically.
- Canonical debugger must provide a separate event list view for `create`, `exercise`, and `archive`.
- `what-if` replay must fork from an exact selected step, not from an approximate checkpoint.
- `what-if` replay must permit both code edits and state edits in the same fork.
- Raw DAML source editing must be allowed only inside the transitive reachable source set for the replayed offset.
- Source validation must reject structural changes outside allowed expression/body-level edits.
- LF-aware state editing must block invalid edits immediately.
- Rerun must happen only when the user explicitly clicks to rerun.
- Fork sessions must replace the active UI view and be clearly marked as divergent from ledger truth.
- When divergence occurs, the fork must keep running and record the full downstream event stream.
- The UI must support both a primary `what-if` event stream and a side-by-side comparison with the original ledger-visible events.

### Non-Functional Requirements

- Canonical replay must remain deterministic and read-only.
- Phase-1 additions must preserve existing replay session bootstrap behavior and stepping semantics.
- Added step payloads must be cheap to serialize and suitable for Explorer API responses.
- Phase-2 fork workspaces must be temporary and isolated from the real checkout.
- Rebuilds in phase 2 should be incremental and limited to affected packages when possible.

## Current State

The current SDK replay debugger already provides:

- deterministic LF replay against ledger updates
- source-mapped stepping from DAR metadata
- step projection that suppresses noisy fallback-only evaluator events
- current-step `locals` for the active frame
- per-step scope data internally in `scopesByStep`
- forward-only cursor operations such as `stepInto`, `stepOver`, `stepOut`, and `continue`

The Explorer backend already loads replay sessions and maps the SDK model into HTTP responses. The frontend already renders a replay session, source pane, and forward stepping controls.

The key limitations are:

- only active-frame locals are exposed on the current step
- ledger effects are reduced to a minimal `stateDelta.kind`
- there is no backward cursor movement
- there is no explicit event list view
- there is no mutable or forked replay mode

## Architecture

## Phase 1: Canonical Debugger Enhancements

### Session Model

`ReplayStep` becomes the full canonical stop model and carries:

- `stepId`, stable within the session and used as the durable selection identifier
- `stepIndex`, the current navigable cursor order within the session
- `stackFrames`
- `locals` for the active frame, retained for compatibility
- `scopes` for all in-scope variables grouped by frame
- `arguments`
- `sourceLocation`
- `valuePreview`
- `stateDelta`, expanded into a bounded ledger-event contract for ledger-visible events

`ReplayStateDelta` must be a discriminated union with shared fields:

- `kind`
- `eventOrdinal`, the order among ledger-visible events in this session
- `comparisonKey`, a session-local stable backend key used to align canonical and `what-if` event streams

Variant fields:

- `create`
  - `createdContractId`
  - `templateId`
  - `payload`
- `exercise`
  - `targetContractId`
  - `templateId`
  - `choice`
  - `choiceArgument`
  - `consuming`
- `archive`
  - `targetContractId`
  - `templateId`

This keeps the current active-frame view intact while exposing the richer frame-grouped scope model needed by the Explorer UI.

### Canonical Event Steps

Ledger-visible events must become first-class debugger steps:

- `create`
- `exercise`
- `archive`

These event steps are part of the canonical navigable step list and also feed a separate per-session event index for the UI. Internal effects such as `fetch` and `lookup` remain outside the phase-1 event list.

The projection logic in the session loader should:

- preserve source-aware expression steps as today
- preserve call/return steps under the current exact-source rules
- emit an explicit event step immediately after the trace step that produced the ledger-visible effect, preserving evaluator order
- attach full effect metadata to the step payload

The canonical step model must distinguish two identities:

- `stepId`: stable identifier for selection, event-list navigation, and phase-2 fork origins
- `stepIndex`: current cursor position in the projected canonical step sequence

This avoids coupling phase-2 exact-step forking to a renumbered cursor index.

### Navigation

`stepBack` is a pure cursor operation over the precomputed canonical trace:

- no re-execution
- no state mutation
- deterministic movement to the previous step index

This keeps canonical replay cheap and stable.

### Explorer Integration

Backend response payloads must expose:

- `currentStep.scopes`
- enriched `currentStep.stateDelta`
- `stepBack`
- a canonical event list from a dedicated endpoint, not embedded into the main session payload

Frontend canonical debugger UI must add:

- grouped variable display by frame
- explicit event list panel
- event-step highlighting/navigation
- `Step Back`
- read-only source/code surface in phase 1

## Phase 2: What-If Replay Forks

### Fork Session Model

`what-if` replay is a separate session kind, not a mutation of canonical replay.

Each fork session stores:

- parent canonical session id and source update id
- origin `stepId`
- exact resumable checkpoint snapshot
- temporary fork workspace root
- source edits
- LF-aware state patches
- validation and compile status
- rebuilt artifact references
- divergence metadata
- fork trace and fork event stream

The active Explorer view is replaced with the fork session, and the UI must clearly mark it as divergent from ledger truth.

### Resumable Checkpoints

Phase 2 depends on exact selected-step checkpoint restore, not nearest-safe checkpoint replay.

That means the debugger must be able to capture and restore a resumable execution snapshot for any selected step, including:

- stack frames
- lexical scopes
- bound runtime values
- relevant replay context needed to continue execution

This is the hard prerequisite for true debugger-style forking from arbitrary selected steps.

### Source Editing

Source edits use raw DAML text in a temporary fork workspace, but validation enforces debugger-style limits:

- no new imports
- no new external references
- no top-level function shape changes
- no template/interface/choice structural changes
- yes to body/expression-level edits
- yes to introducing new local variables inside existing bodies

The editable file set comes from the transitive set of DAML files referenced by the current offset and rooted in a configured local workspace checkout.

### State Editing

State editing is LF-aware from the start and blocks invalid edits immediately.

Editable targets include:

- locals in scope at the selected step
- choice arguments
- contract payloads for contracts that are directly bound into scope, referenced by the selected step's active arguments, or materialized in the selected step's replay environment bindings

This is separate from raw JSON editing. Editors must understand LF kinds such as records, variants, lists, optionals, contract ids, text, parties, numerics, timestamps, dates, and booleans.

### Rerun Pipeline

When the user clicks rerun:

1. Validate source edits against structural constraints.
2. Validate LF-aware state edits.
3. Rebuild only required packages in the temporary workspace, as far as the compiler/package graph supports.
4. Restore the exact selected-step checkpoint.
5. Apply source and state edits together.
6. Replay forward.
7. Continue even if the event stream diverges from the original ledger-visible events.
8. Record first divergence and full downstream fork behavior.

If validation or compilation fails, the fork session becomes blocked until fixed.

### Divergence Model

Fork sessions must preserve comparison against the original canonical ledger-visible stream:

- primary `what-if` event list
- side-by-side original vs `what-if` comparison
- first divergence marker
- continued downstream event stream after divergence

Edits to code located before the selected rerun step are allowed, but they have no effect unless execution reaches those edits after the rerun point.

## Data Model Changes

### SDK

- Extend `ReplayStep` with `scopes`
- Extend `ReplayStep` with `stepId` and `stepIndex`
- Extend `ReplayStateDelta` with full ledger-event metadata
- Add canonical event index support in session loader output
- Add `stepBack` support in session store and debugger client
- Add phase-2 session kind and checkpoint structures later

### Explorer Backend

- Extend response DTOs for `currentStep.stepId` and `currentStep.stepIndex`
- Extend response DTOs for `currentStep.scopes`
- Extend response DTOs for full `stateDelta`
- Add `step-back` action endpoint
- Add event-list response shape
- Later add fork-session DTOs, rerun, validation, and compile-status responses

### Explorer Frontend

- Add `stepId`-based selection and event navigation state
- Add grouped frame-scope rendering
- Add event-list panel
- Add backward stepping control
- Later add fork banner, raw source editor, LF-aware value editors, rerun control, compile-error panel, and side-by-side event comparison

## Error Handling

### Phase 1

- Missing scope or event metadata should degrade to empty scope/event details, not fail session creation.
- `stepBack` at the first step should stay on step 0.

### Phase 2

- Structural source edit violations return validation errors and block rerun.
- LF-invalid state edits are blocked before rerun.
- Compiler failures block the fork session until corrected.
- Checkpoint restore failures must surface clearly and abort fork creation or rerun.

## Testing Strategy

### Phase 1

- Unit tests for `ReplayStep.scopes`
- Unit tests for enriched `ReplayStateDelta`
- Unit tests for event-step projection ordering
- Unit tests for `stepBack`
- Backend mapping tests for scopes and event payloads
- Frontend tests for grouped variables, event list rendering, and step-back control
- Explorer integration smoke test covering create session, forward stepping, backward stepping, and event visibility

### Phase 2

- Unit tests for checkpoint capture/restore
- Unit tests for source-edit validation restrictions
- Unit tests for LF-aware state patch validation
- Unit tests for fork divergence recording
- Integration tests for fork rerun from exact selected steps
- Incremental rebuild tests against temporary workspaces

## Delivery Plan

### Phase 1

- Finish SDK replay-step and event payload enrichment
- Add canonical event projection/indexing
- Add `stepBack`
- Wire backend DTOs and endpoint
- Render grouped scopes and canonical events in Explorer

### Phase 2

- Add an explicit feasibility gate for exact arbitrary-step checkpoint capture/restore before committing to the rest of the fork UX
- Add resumable step checkpoints
- Introduce fork session type
- Build temporary workspace and constrained raw-source editor flow
- Add LF-aware state editing
- Add rerun, compile blocking, and divergence tracking
- Add side-by-side event comparison

## Risks

- Exact step checkpoint restore is the largest technical risk for phase 2.
- Compiler/package-graph incremental rebuild behavior may constrain how small a rebuild can be.
- Large scope snapshots or full event payloads could enlarge API responses and may require trimming or lazy loading in some cases.
- Frontend complexity will increase meaningfully once canonical and fork session modes coexist.

## Recommendation

Implement phase 1 first and keep it fully canonical, deterministic, and explorer-ready. Design phase-1 data models so phase 2 can layer fork execution on top without changing the meaning of canonical replay sessions.
