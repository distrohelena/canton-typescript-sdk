# Canonical Debugger And What-If Replay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver phase 1 of the DAML Explorer debugger as a richer canonical replay debugger with full in-scope variable visibility, explicit ledger event steps and event list support, backward stepping, and event-step selection, while also recording the gated follow-on sequence for the later `what-if` fork engine.

**Architecture:** Keep canonical replay deterministic and precomputed in the SDK, then enrich the projected `ReplayStep` model with stable step identity, grouped scopes, and full ledger-event payloads. Add explicit cursor APIs for backward stepping and selecting a projected step by id so the event list can drive debugger navigation in phase 1. Phase 2 remains a separate fork-session stack on top of exact step checkpoints, temporary workspace edits, LF-aware state patches, and rerun orchestration without mutating canonical ledger-truth sessions, but it is not part of the current execution handoff.

**Tech Stack:** TypeScript, Vitest, NestJS/Jest, Vue 3/Vitest, existing DAML LF evaluator trace sink, Explorer backend debugger service, temporary DAML workspaces, `daml build`.

---

## File Structure

### SDK Root

- Modify: `src/debugger/session/replay-step.ts` - canonical debugger step contract with `stepId`, `stepIndex`, grouped `scopes`, and richer event payload attachment.
- Modify: `src/debugger/session/replay-state-delta.ts` - bounded discriminated ledger-event payload for `create`, `exercise`, and `archive`.
- Modify: `src/debugger/session/replay-step-advance-result.ts` - advance payload compatibility with richer step objects.
- Modify: `src/debugger/session/replay-session.ts` - current-step shape naturally picks up richer `ReplayStep`.
- Modify: `src/debugger/session/in-memory-replay-session-store.ts` - `stepBack` cursor movement, projected-step selection by id, and stable projected-step consumption.
- Modify: `src/debugger/ledger-replay-debugger-client.ts` - public `stepBackAsync()` and `jumpToStepAsync()` client methods.
- Modify: `src/debugger/replay/ledger-replay-session-loader.ts` - raw-trace projection, event-step insertion, `stepId` assignment, `eventOrdinal` / `comparisonKey` population.
- Modify: `src/debugger/index.ts` - public export surface for new debugger API.
- Modify: `tests/unit/debugger/debugger-public-surface.test.ts` - public DTO coverage.
- Modify: `tests/unit/debugger/replay/ledger-replay-session-loader.test.ts` - projection ordering, event payload, and scope tests.
- Modify: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts` - current-step scopes, step-back, and event-step behavior.
- Modify: `tests/integration/debugger/ledger-replay-debugger.integration.test.ts` - end-to-end SDK replay stepping and event payload verification.

### Explorer Backend Root

- Modify: `/home/helena/dev/daml/canton-explorer/backend/src/api/debugger.controller.ts` - add `step-back`, step-selection, and canonical event-list endpoints.
- Modify: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/debugger.service.ts` - map richer SDK steps, expose event list, wire backward stepping, and jump to a selected event step.
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/debugger.service.spec.ts` - service-level response mapping and event-list tests.
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/api/debugger.controller.spec.ts` - controller routing and action tests.

### Explorer Frontend Root

- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/types/debugger.ts` - richer session and event-list types.
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/lib/api.ts` - `step-back` action, event-list fetcher, and explicit step-selection API.
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerScopePanel.vue` - grouped frame-scope rendering.
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerScopePanel.test.ts` - scope rendering tests.
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerEventList.vue` - canonical ledger event list UI.
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerEventList.test.ts` - event-list rendering and selection tests.
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/views/DebuggerView.vue` - wire grouped scopes, event list, `Step Back`, and selection state.
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/views/DebuggerView.test.ts` - canonical debugger UI coverage.
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/styles.css` - debugger layout and panel styling if the existing view styles are centralized there.

### Phase 2 SDK Fork Engine

- Create: `src/debugger/fork/replay-checkpoint.ts` - serializable exact-step checkpoint contract.
- Create: `src/debugger/fork/replay-checkpoint-capture.ts` - capture and restore helpers for evaluator/runtime state.
- Create: `src/debugger/fork/forked-replay-session.ts` - fork-session domain model.
- Create: `src/debugger/fork/fork-source-edit.ts` - raw-source edit model and diff metadata.
- Create: `src/debugger/fork/fork-state-patch.ts` - LF-aware state patch model.
- Create: `src/debugger/fork/fork-divergence.ts` - first-divergence and event-comparison structures.
- Modify: `src/daml-lf/interpreter/daml-lf-evaluator.ts` - checkpoint capture/restore hooks.
- Modify: `src/debugger/index.ts` - public fork exports as they become usable.
- Create: `tests/unit/debugger/fork/replay-checkpoint.test.ts`
- Create: `tests/unit/debugger/fork/fork-divergence.test.ts`

### Phase 2 Explorer Backend / Frontend

- Create: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/fork-workspace.service.ts`
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/source-edit-validator.service.ts`
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/state-patch-validator.service.ts`
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/fork-replay.service.ts`
- Modify: `/home/helena/dev/daml/canton-explorer/backend/src/api/debugger.controller.ts`
- Modify: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/debugger.service.ts`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerForkBanner.vue`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerForkEditor.vue`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/LfValueEditor.vue`
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/views/DebuggerView.vue`
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/types/debugger.ts`
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/lib/api.ts`

## Phase 1: Canonical Debugger

### Task 1: Expand The SDK Replay Step Contract

**Files:**
- Modify: `src/debugger/session/replay-step.ts`
- Modify: `src/debugger/session/replay-state-delta.ts`
- Modify: `src/debugger/session/replay-step-advance-result.ts`
- Modify: `src/debugger/index.ts`
- Modify: `tests/unit/debugger/debugger-public-surface.test.ts`
- Modify: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`

- [ ] **Step 1: Write the failing public-shape tests**

Add one SDK public-surface assertion and one client assertion that require the richer canonical step:

```ts
expect(result.step).toEqual(
  expect.objectContaining({
    stepId: 'step-1',
    stepIndex: 1,
    scopes: [],
    stateDelta: expect.objectContaining({
      kind: 'create',
      eventOrdinal: 0,
      comparisonKey: 'event-0',
    }),
  }),
);
```

In `ledger-replay-debugger-client.test.ts`, require `currentStep.scopes` to exist and verify that `stateDelta` can carry variant-specific fields:

```ts
expect(session.currentStep?.stateDelta).toEqual(
  expect.objectContaining({
    kind: 'exercise',
    eventOrdinal: 0,
    comparisonKey: 'event-0',
  }),
);
```

- [ ] **Step 2: Run the targeted SDK tests and verify RED**

Run in `/home/helena/env/daml/typescript-sdk`:

```bash
rtk npm test -- tests/unit/debugger/debugger-public-surface.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts
```

Expected: FAIL because `ReplayStep` and `ReplayStateDelta` do not yet expose `stepId`, `stepIndex`, or richer event payload fields.

- [ ] **Step 3: Implement the minimal step contract**

Update `ReplayStep` to accept:

```ts
public readonly stepId: string;
public readonly stepIndex: number;
public readonly scopes: readonly ReplayScope[];
```

Refactor `ReplayStateDelta` into a discriminated data carrier with shared fields:

```ts
type ReplayStateDeltaInit =
  | {
      kind: 'create';
      eventOrdinal: number;
      comparisonKey: string;
      createdContractId?: string;
      templateId?: ReplayTemplateId;
      payload?: unknown;
    }
  | {
      kind: 'exercise';
      eventOrdinal: number;
      comparisonKey: string;
      targetContractId?: string;
      templateId?: ReplayTemplateId;
      choice?: string;
      choiceArgument?: unknown;
      consuming?: boolean;
    }
  | {
      kind: 'archive';
      eventOrdinal: number;
      comparisonKey: string;
      targetContractId?: string;
      templateId?: ReplayTemplateId;
    };
```

Keep constructor defaults minimal and do not change loader logic yet.

- [ ] **Step 4: Run the targeted SDK tests and verify GREEN**

Run:

```bash
rtk npm test -- tests/unit/debugger/debugger-public-surface.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run type-checking**

Run:

```bash
rtk npm exec tsc -- -p tsconfig.json --noEmit
```

Expected: PASS with all constructor call sites updated.

- [ ] **Step 6: Commit the replay-step contract**

```bash
rtk git add src/debugger/session/replay-step.ts src/debugger/session/replay-state-delta.ts src/debugger/session/replay-step-advance-result.ts src/debugger/index.ts tests/unit/debugger/debugger-public-surface.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts
rtk git commit -m "feat: enrich canonical replay step contract"
```

### Task 2: Project Explicit Ledger Event Steps In The Session Loader

**Files:**
- Modify: `src/debugger/replay/ledger-replay-session-loader.ts`
- Modify: `tests/unit/debugger/replay/ledger-replay-session-loader.test.ts`
- Modify: `tests/integration/debugger/ledger-replay-debugger.integration.test.ts`

- [ ] **Step 1: Write the failing loader tests for event ordering and payload details**

Add focused tests that force one expression step followed by one state effect and require the event step to be inserted immediately after the producing trace step:

```ts
expect(session.steps.map((step) => [step.phase, step.stateDelta?.kind ?? null])).toEqual([
  ['enterExpression', null],
  ['stateEffect', 'exercise'],
  ['call', null],
]);
```

Add a second test for create/archive payload details:

```ts
expect(session.steps.find((step) => step.stateDelta?.kind === 'create')?.stateDelta).toEqual(
  expect.objectContaining({
    eventOrdinal: 1,
    comparisonKey: 'event-1',
    createdContractId: '00create',
    payload: expect.objectContaining({ owner: 'Alice' }),
  }),
);
```

Add one integration assertion that `session.currentStep.stateDelta` carries more than the `kind`.

- [ ] **Step 2: Run the loader and integration tests and verify RED**

Run:

```bash
rtk npm test -- tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/integration/debugger/ledger-replay-debugger.integration.test.ts
```

Expected: FAIL because the loader currently emits only the original trace step with a thin `stateDelta.kind`.

- [ ] **Step 3: Implement two-phase projection with stable step ids**

In `ledger-replay-session-loader.ts`, keep raw trace projection first, then create navigable steps with stable ids derived from raw trace position:

```ts
const stepId = `trace-${rawIndex}`;
```

When a raw trace step carries a ledger-visible effect, append a second projected step immediately after it:

```ts
navigableSteps.push(
  rawStep,
  this.createLedgerEventStep(rawStep, eventOrdinal++),
);
```

Only create explicit event steps for:

```ts
['create', 'exercise', 'archive']
```

Populate `comparisonKey` from the event ordinal:

```ts
comparisonKey: `event-${eventOrdinal}`,
```

Assign distinct stable ids to both projected steps:

```ts
const sourceStepId = `trace-${rawIndex}`;
const eventStepId = `trace-${rawIndex}:event-${eventOrdinal}`;
```

Copy source location, stack frames, scopes, and active-frame locals onto the event step so the UI can inspect state at the event boundary.

- [ ] **Step 4: Run the loader and integration tests and verify GREEN**

Run:

```bash
rtk npm test -- tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/integration/debugger/ledger-replay-debugger.integration.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the full replay-focused unit slice**

Run:

```bash
rtk npm test -- tests/unit/debugger/replay/replay-entrypoint-definition-resolver.test.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts
```

Expected: PASS with no effect-order regressions.

- [ ] **Step 6: Commit event-step projection**

```bash
rtk git add src/debugger/replay/ledger-replay-session-loader.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/integration/debugger/ledger-replay-debugger.integration.test.ts
rtk git commit -m "feat: project canonical ledger event steps"
```

### Task 3: Add Canonical Step-Back Navigation And Explicit Step Selection

**Files:**
- Modify: `src/debugger/session/in-memory-replay-session-store.ts`
- Modify: `src/debugger/ledger-replay-debugger-client.ts`
- Modify: `src/debugger/index.ts`
- Modify: `tests/unit/debugger/session/ledger-replay-debugger-client.test.ts`
- Modify: `tests/unit/debugger/debugger-public-surface.test.ts`

- [ ] **Step 1: Write the failing step-back and jump-to-step tests**

Add one store/client behavior test for stepping backward from a nested frame and one edge-case test at index `0`:

```ts
await client.stepIntoAsync('session-1');
await client.stepIntoAsync('session-1');

const result = await client.stepBackAsync('session-1');

expect(result.step.stepIndex).toBe(1);
expect(result.nextStepIndex).toBe(2);
```

And:

```ts
const result = await client.stepBackAsync('session-1');
expect(result.step.stepIndex).toBe(0);
```

Add one explicit step-selection test:

```ts
const result = await client.jumpToStepAsync('session-1', 'trace-4:event-1');

expect(result.step.stepId).toBe('trace-4:event-1');
expect(result.step.stateDelta?.eventOrdinal).toBe(1);
```

- [ ] **Step 2: Run the step-back tests and verify RED**

Run:

```bash
rtk npm test -- tests/unit/debugger/session/ledger-replay-debugger-client.test.ts tests/unit/debugger/debugger-public-surface.test.ts
```

Expected: FAIL because `stepBackAsync()`, `jumpToStepAsync()`, and store support do not exist.

- [ ] **Step 3: Implement pure cursor rewind and step selection**

Add:

```ts
public advanceBackOrThrow(sessionId: string): ReplayStepAdvanceResult {
  const record = this.getRecordOrThrow(sessionId);
  record.currentStepIndex = Math.max(0, record.currentStepIndex - 1);
  return this.toAdvanceResult(record);
}
```

Then expose:

```ts
public async stepBackAsync(sessionId: string): Promise<ReplayStepAdvanceResult> {
  return this.getStore().advanceBackOrThrow(sessionId);
}
```

Add explicit selection:

```ts
public setCurrentStepByIdOrThrow(sessionId: string, stepId: string): ReplayStepAdvanceResult {
  const record = this.getRecordOrThrow(sessionId);
  const nextIndex = record.steps.findIndex((step) => step.stepId === stepId);
  if (nextIndex < 0) throw new ValidationError(`unknown replay step '${stepId}'`);
  record.currentStepIndex = nextIndex;
  return this.toAdvanceResult(record);
}
```

Expose:

```ts
public async jumpToStepAsync(sessionId: string, stepId: string): Promise<ReplayStepAdvanceResult> {
  return this.getStore().setCurrentStepByIdOrThrow(sessionId, stepId);
}
```

Do not re-run replay or mutate stored steps.

- [ ] **Step 4: Run the step-back tests and verify GREEN**

Run:

```bash
rtk npm test -- tests/unit/debugger/session/ledger-replay-debugger-client.test.ts tests/unit/debugger/debugger-public-surface.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the whole debugger unit slice**

Run:

```bash
rtk npm test -- tests/unit/debugger/session/ledger-replay-debugger-client.test.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/unit/debugger/debugger-public-surface.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit backward stepping**

```bash
rtk git add src/debugger/session/in-memory-replay-session-store.ts src/debugger/ledger-replay-debugger-client.ts src/debugger/index.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts tests/unit/debugger/debugger-public-surface.test.ts
rtk git commit -m "feat: add canonical debugger step selection"
```

### Task 4: Expose The Canonical Event List And Richer Step DTOs In Explorer Backend

**Files:**
- Modify: `/home/helena/dev/daml/canton-explorer/backend/src/api/debugger.controller.ts`
- Modify: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/debugger.service.ts`
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/debugger/debugger.service.spec.ts`
- Create: `/home/helena/dev/daml/canton-explorer/backend/src/api/debugger.controller.spec.ts`

- [ ] **Step 1: Write the failing backend specs**

Create one service spec that stubs a session store and requires:

```ts
expect(service.getSession('session-1').currentStep).toEqual(
  expect.objectContaining({
    stepId: 'trace-2',
    stepIndex: 2,
    scopes: [
      expect.objectContaining({ frameId: 'frame-1' }),
    ],
    stateDelta: expect.objectContaining({
      kind: 'exercise',
      eventOrdinal: 0,
      comparisonKey: 'event-0',
    }),
  }),
);
```

Create one service/event-list spec:

```ts
expect(service.listEvents('session-1').events.map((event) => event.kind)).toEqual([
  'exercise',
  'create',
  'archive',
]);
```

Create one controller spec asserting:

```ts
POST /api/debugger/sessions/:sessionId/actions/step-back
GET /api/debugger/sessions/:sessionId/events
POST /api/debugger/sessions/:sessionId/steps/:stepId/select
```

- [ ] **Step 2: Run the backend debugger specs and verify RED**

Run in `/home/helena/dev/daml/canton-explorer/backend`:

```bash
rtk npm test -- --runInBand src/debugger/debugger.service.spec.ts src/api/debugger.controller.spec.ts
```

Expected: FAIL because the controller and service do not expose `step-back`, `scopes`, richer event DTOs, or event-list responses.

- [ ] **Step 3: Implement backend response mapping and routes**

Extend the local session-store contract with:

```ts
advanceBackOrThrow(sessionId: string): unknown;
getTraceSliceOrThrow(sessionId: string, startIndex: number, endIndex: number): unknown[];
setCurrentStepByIdOrThrow(sessionId: string, stepId: string): unknown;
```

Add controller cases:

```ts
case 'step-back':
  return this.debuggerService.stepBack(sessionId);
```

And:

```ts
@Get('/sessions/:sessionId/events')
listSessionEvents(@Param('sessionId') sessionId: string) {
  return this.debuggerService.listEvents(sessionId);
}
```

Add explicit step selection:

```ts
@Post('/sessions/:sessionId/steps/:stepId/select')
selectStep(
  @Param('sessionId') sessionId: string,
  @Param('stepId') stepId: string,
) {
  return this.debuggerService.selectStep(sessionId, stepId);
}
```

In `debugger.service.ts`, map `currentStep.scopes` directly, derive the event list from the trace slice by filtering `stateDelta.kind` to ledger-visible kinds only, and add:

```ts
selectStep(sessionId: string, stepId: string): DebuggerSessionResponse {
  this.getSessionStoreSync().setCurrentStepByIdOrThrow(sessionId, stepId);
  return this.getSession(sessionId);
}
```

- [ ] **Step 4: Run the backend debugger specs and verify GREEN**

Run:

```bash
rtk npm test -- --runInBand src/debugger/debugger.service.spec.ts src/api/debugger.controller.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Run backend type/build verification**

Run:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the backend debugger API**

```bash
rtk git -C /home/helena/dev/daml/canton-explorer/backend add src/api/debugger.controller.ts src/debugger/debugger.service.ts src/debugger/debugger.service.spec.ts src/api/debugger.controller.spec.ts
rtk git -C /home/helena/dev/daml/canton-explorer/backend commit -m "feat: expose richer canonical debugger api"
```

### Task 5: Add Frontend Types, API Calls, And Reusable Canonical Debugger Panels

**Files:**
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/types/debugger.ts`
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/lib/api.ts`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerScopePanel.vue`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerScopePanel.test.ts`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerEventList.vue`
- Create: `/home/helena/dev/daml/canton-explorer/frontend/src/components/DebuggerEventList.test.ts`

- [ ] **Step 1: Write the failing component and type-driven tests**

Add `DebuggerScopePanel.test.ts`:

```ts
it('renders variables grouped by frame', () => {
  render(DebuggerScopePanel, {
    props: {
      scopes: [
        { frameId: 'frame-1', name: 'Archive', variables: [{ name: 'greeting', kind: 'text', value: 'ok' }] },
      ],
    },
  });

  expect(screen.getByText('Archive')).toBeInTheDocument();
  expect(screen.getByText('greeting')).toBeInTheDocument();
  expect(screen.getByText('ok')).toBeInTheDocument();
});
```

Add `DebuggerEventList.test.ts`:

```ts
it('renders canonical ledger events and highlights the selected step id', async () => {
  render(DebuggerEventList, {
    props: {
      events: [{ stepId: 'trace-3', kind: 'create', templateLabel: 'Main.VaultEvent' }],
      selectedStepId: 'trace-3',
    },
  });

  expect(screen.getByText('create')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Main.VaultEvent/ })).toHaveAttribute('data-selected', 'true');
});
```

- [ ] **Step 2: Run the new frontend component tests and verify RED**

Run in `/home/helena/dev/daml/canton-explorer/frontend`:

```bash
rtk npm test -- src/components/DebuggerScopePanel.test.ts src/components/DebuggerEventList.test.ts
```

Expected: FAIL because the components and richer debugger types do not exist.

- [ ] **Step 3: Implement the frontend type and API surface**

Extend `DebuggerSessionResponse` with:

```ts
currentStep: {
  stepId: string;
  stepIndex: number;
  scopes: Array<{
    frameId: string | null;
    name: string | null;
    variables: Array<{ name: string; kind: string; value: string }>;
  }>;
  stateDelta: {
    kind: string | null;
    eventOrdinal: number | null;
    comparisonKey: string | null;
    templateId?: { packageId?: string | null; moduleName?: string | null; entityName?: string | null } | null;
    createdContractId?: string | null;
    targetContractId?: string | null;
    choice?: string | null;
    choiceArgument?: unknown;
    payload?: unknown;
  } | null;
}
```

Add:

```ts
export function fetchDebuggerEvents(sessionId: string): Promise<DebuggerEventListResponse>
export function stepDebuggerSession(sessionId: string, action: 'step-back' | 'step-into' | 'step-over' | 'step-out' | 'continue')
export function selectDebuggerStep(sessionId: string, stepId: string): Promise<DebuggerSessionResponse>
```

Then implement small presentational components for grouped scopes and event rows. `DebuggerEventList` must emit the clicked `stepId` to the parent:

```ts
defineEmits<{
  select: [stepId: string];
}>();
```

- [ ] **Step 4: Run the component tests and verify GREEN**

Run:

```bash
rtk npm test -- src/components/DebuggerScopePanel.test.ts src/components/DebuggerEventList.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run frontend type-check/build**

Run:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the frontend debugger building blocks**

```bash
rtk git -C /home/helena/dev/daml/canton-explorer/frontend add src/types/debugger.ts src/lib/api.ts src/components/DebuggerScopePanel.vue src/components/DebuggerScopePanel.test.ts src/components/DebuggerEventList.vue src/components/DebuggerEventList.test.ts
rtk git -C /home/helena/dev/daml/canton-explorer/frontend commit -m "feat: add canonical debugger scope and event panels"
```

### Task 6: Wire The Canonical Debugger View End To End

**Files:**
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/views/DebuggerView.vue`
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/views/DebuggerView.test.ts`
- Modify: `/home/helena/dev/daml/canton-explorer/frontend/src/styles.css`

- [ ] **Step 1: Write the failing DebuggerView test for step-back, scopes, and events**

Extend the mocked session payload and add a mocked event-list call. Require:

```ts
expect(screen.getByRole('button', { name: 'Step Back' })).toBeInTheDocument();
expect(screen.getByText('greeting')).toBeInTheDocument();
expect(screen.getByText('create')).toBeInTheDocument();
```

Then assert clicking an event row or step-back uses the correct API helper:

```ts
await fireEvent.click(screen.getByRole('button', { name: 'Step Back' }));
expect(stepDebuggerSession).toHaveBeenCalledWith('session-1', 'step-back');
```

And:

```ts
await fireEvent.click(screen.getByRole('button', { name: /Main.VaultEvent/ }));
expect(selectDebuggerStep).toHaveBeenCalledWith('session-1', 'trace-3:event-0');
```

- [ ] **Step 2: Run the view test and verify RED**

Run in `/home/helena/dev/daml/canton-explorer/frontend`:

```bash
rtk npm test -- src/views/DebuggerView.test.ts
```

Expected: FAIL because the view does not render those panels or the `Step Back` control.

- [ ] **Step 3: Implement the view integration**

In `DebuggerView.vue`:

- load `fetchDebuggerEvents(sessionId)` after session creation and refresh
- render `DebuggerScopePanel` with `session.currentStep.scopes`
- render `DebuggerEventList` with canonical events
- add:

```vue
<button @click="runAction('step-back')">Step Back</button>
```

- track `selectedStepId` from the current step so event list selection stays aligned
- add `onSelectStep(stepId)` that calls `selectDebuggerStep(session.value.sessionId, stepId)` and replaces `session.value` with the returned current-step snapshot

Keep the Monaco source pane read-only in phase 1.

- [ ] **Step 4: Run the debugger view test and verify GREEN**

Run:

```bash
rtk npm test -- src/views/DebuggerView.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run the frontend debugger slice and build**

Run:

```bash
rtk npm test -- src/components/DebuggerScopePanel.test.ts src/components/DebuggerEventList.test.ts src/views/DebuggerView.test.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 6: Commit the canonical debugger UI**

```bash
rtk git -C /home/helena/dev/daml/canton-explorer/frontend add src/views/DebuggerView.vue src/views/DebuggerView.test.ts src/styles.css
rtk git -C /home/helena/dev/daml/canton-explorer/frontend commit -m "feat: render canonical debugger scopes and events"
```

### Task 7: Verify Phase 1 End To End Against The Live Explorer

**Files:**
- Modify: `tests/integration/debugger/ledger-replay-debugger.integration.test.ts`
- Optionally modify: `/home/helena/dev/daml/canton-explorer/backend/README.md` only if the canonical debugger HTTP contract needs explicit operator notes

- [ ] **Step 1: Add one focused integration assertion for event-list-compatible state deltas**

In the SDK integration test, require:

```ts
expect(session.currentStep?.stateDelta).toEqual(
  expect.objectContaining({
    kind: 'exercise',
    eventOrdinal: 0,
    comparisonKey: expect.any(String),
  }),
);
```

- [ ] **Step 2: Run the SDK integration test and verify RED/GREEN as needed**

Run in `/home/helena/env/daml/typescript-sdk`:

```bash
rtk npm test -- tests/integration/debugger/ledger-replay-debugger.integration.test.ts
```

Expected: PASS once the previous tasks are complete.

- [ ] **Step 3: Rebuild the SDK and relink the Explorer if needed**

Run in `/home/helena/env/daml/typescript-sdk`:

```bash
rtk npm run build
```

Run in `/home/helena/dev/daml/canton-explorer/backend`:

```bash
rtk npm run sdk:local
rtk npm run build
```

Run in `/home/helena/dev/daml/canton-explorer/frontend`:

```bash
rtk npm run build
```

Expected: PASS.

- [ ] **Step 4: Smoke the live canonical debugger HTTP contract**

Prerequisite: a local Explorer backend must already be running and the `DEBUGGER_BASE_URL`, `DEBUGGER_NODE_ID`, and `DEBUGGER_OFFSET` inputs must point at a valid replayable update on that environment.

Run:

```bash
DEBUGGER_BASE_URL=http://localhost:4600 \
DEBUGGER_NODE_ID=cnqs-extra-1 \
DEBUGGER_OFFSET=445 \
rtk node - <<'NODE'
const http = require('http');
const base = new URL(process.env.DEBUGGER_BASE_URL ?? 'http://localhost:4600');
const nodeId = process.env.DEBUGGER_NODE_ID ?? 'cnqs-extra-1';
const offset = process.env.DEBUGGER_OFFSET ?? '445';
function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : undefined;
    const req = http.request({
      method,
      hostname: base.hostname,
      port: base.port,
      path,
      headers: payload ? {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      } : undefined,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
(async () => {
  const created = await request('POST', '/api/debugger/sessions', { nodeId, offset });
  const events = await request('GET', `/api/debugger/sessions/${created.sessionId}/events`);
  const back = await request('POST', `/api/debugger/sessions/${created.sessionId}/actions/step-back`);
  console.log(JSON.stringify({
    sessionId: created.sessionId,
    currentStepScopes: created.currentStep.scopes.length,
    eventCount: events.events.length,
    stepBackStepIndex: back.currentStepIndex,
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
NODE
```

Expected: JSON showing non-empty `currentStep.scopes`, a non-zero `eventCount`, and a valid `stepBackStepIndex`.

- [ ] **Step 5: Commit phase-1 verification changes**

```bash
rtk git add tests/integration/debugger/ledger-replay-debugger.integration.test.ts
rtk git commit -m "test: verify canonical debugger step and event payloads"
```

## Phase 2 Follow-On Outline (Blocked By Separate Approval)

Do not execute this section as part of the current handoff. Phase 1 ends after Task 7 and the verification section below. Return to phase 2 only after:

1. phase 1 lands and is accepted
2. exact selected-step checkpoint feasibility is proven
3. a separate execution handoff is explicitly approved

### Follow-On Gate: Exact Selected-Step Checkpoint Feasibility

The first phase-2 deliverable is a small SDK-only feasibility slice:

- create `src/debugger/fork/replay-checkpoint.ts`
- create `src/debugger/fork/replay-checkpoint-capture.ts`
- modify `src/daml-lf/interpreter/daml-lf-evaluator.ts`
- modify `src/daml-lf/interpreter/daml-lf-runtime-frame.ts`
- add `tests/unit/debugger/fork/replay-checkpoint.test.ts`

The proof must show:

```ts
expect(restoredResult.effects).toEqual(originalTail.effects);
expect(restoredTrace.map((step) => step.expression.sourceLocation)).toEqual(
  originalTail.trace.map((step) => step.expression.sourceLocation),
);
```

If this gate fails or becomes too invasive, stop and redesign phase 2 before attempting workspace editing or rerun UX.

### Follow-On Workstream A: Temporary Workspace And Constrained Source Validation

Once the checkpoint gate passes, the next backend slice should create:

- `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/fork-workspace.service.ts`
- `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/source-edit-validator.service.ts`

Validation must reject:

```ts
newImports.length > 0
newTopLevelDefinitions.length > 0
changedTemplateShape === true
changedChoiceShape === true
```

and allow body/expression-local edits such as new `let` bindings.

### Follow-On Workstream B: LF-Aware State Patch Validation

After workspace validation, add:

- `src/debugger/fork/fork-state-patch.ts`
- `/home/helena/dev/daml/canton-explorer/backend/src/debugger/what-if/state-patch-validator.service.ts`
- `/home/helena/dev/daml/canton-explorer/frontend/src/components/LfValueEditor.vue`

The patch model remains:

```ts
export interface ForkStatePatch {
  readonly targetKind: 'local' | 'choiceArgument' | 'contractPayload';
  readonly targetPath: readonly string[];
  readonly lfType: SerializableLfType;
  readonly proposedValue: unknown;
}
```

The UI must block invalid edits immediately, not on rerun.

### Follow-On Workstream C: Fork Sessions, Rerun, And Divergence

Only after the previous slices are green should the fork rerun engine be attempted. The execution order must follow the spec exactly:

```ts
1. validate source edits
2. validate state edits
3. rebuild affected packages
4. restore exact checkpoint
5. apply source edits + state patches
6. replay forward
7. record first divergence
8. continue the what-if event stream after divergence
```

The Explorer frontend should then replace the canonical view with the fork session, show a clear divergent banner, and present both the primary `what-if` stream and side-by-side canonical comparison.

## Phase 1 Final Verification

- [ ] **Step 1: Run the SDK debugger suites**

Run in `/home/helena/env/daml/typescript-sdk`:

```bash
rtk npm test -- tests/unit/debugger/debugger-public-surface.test.ts tests/unit/debugger/replay/ledger-replay-session-loader.test.ts tests/unit/debugger/session/ledger-replay-debugger-client.test.ts tests/integration/debugger/ledger-replay-debugger.integration.test.ts tests/unit/daml-lf/daml-lf-evaluator-ledger-effects.test.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 2: Run the Explorer backend suites**

Run in `/home/helena/dev/daml/canton-explorer/backend`:

```bash
rtk npm test -- --runInBand src/api/debugger.controller.spec.ts src/debugger/debugger.service.spec.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 3: Run the Explorer frontend suites**

Run in `/home/helena/dev/daml/canton-explorer/frontend`:

```bash
rtk npm test -- src/components/DebuggerScopePanel.test.ts src/components/DebuggerEventList.test.ts src/views/DebuggerView.test.ts
rtk npm run build
```

Expected: PASS.

- [ ] **Step 4: Record the completed implementation branch state**

```bash
rtk git status --short
rtk git log --oneline -10
```

Expected: clean trees in each repo with a readable commit chain for the debugger work.
