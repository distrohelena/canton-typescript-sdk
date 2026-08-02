# Contract Lifecycle Audit Example Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a standalone, gRPC-only example that proves a run-scoped `DebugPlayground:Message`'s active direct lookups and original create/archive history, with bounded EventQuery projection visibility.

**Architecture:** Keep all lifecycle-specific behavior in two example-private shared modules: one for generated request construction, structural assertions, and the bounded history reader; one dependency-injected workflow so the lifecycle is unit-testable without a participant. `examples/95-contract-lifecycle-audit.ts` remains a thin runner that creates the gRPC client and delegates exact-once, primary-error-safe disposal to the established lifecycle helper. Do not change `src/`, public exports, generated code, JSON transport, package contents, or existing workflows.

**Tech Stack:** TypeScript ESM, Vitest, generated protobuf-ts `ledgerApiV2`/`google` messages, public `OperationDeadline`, existing application fixture helpers, npm scripts, and authenticated Canton 3.5.7/3.5.8 live participants.

---

## Preconditions and execution rules

- Start from `ffe3345` and read `docs/superpowers/specs/2026-08-02-contract-lifecycle-audit-example-design.md` before every task review. The specification is authoritative over this plan if a mismatch is found.
- Preserve the pre-existing user edit to `package.json` (currently the version-only change) and the four untracked July plan documents. Never use `git reset`, `git checkout`, `git clean`, or broad staging.
- Use `apply_patch` for every source, test, README, and package edit. All shell commands below deliberately start with `rtk`; do not drop that prefix.
- Run the named focused Vitest command first for RED, then make the smallest implementation that makes it GREEN. Run `rtk npm run examples:check` after every implementation task; it first rebuilds `dist`, preventing stale/missing CJS artifacts from obscuring example type errors.
- A task is not ready to commit until its focused tests, `examples:check`, `rtk git diff --check`, and the task's spec/quality review all succeed. Do not fold unrelated working-tree changes into any commit.
- Each implementation task ends with its own small green commit. Do not implement a post-archive `ContractService` lookup, any update lookup (`getUpdateById`, `getUpdateByOffset`, or `getUpdateByHash`), an SDK lifecycle abstraction, JSON support, a version branch, error-prose matching, an ACS traversal, or a command retry.

## File map

- Create: `examples/shared/contract-lifecycle-audit.ts` — the exact generated Message `EventFormat` factory, direct-lookup/history assertions, and deadline-bounded EventQuery projection loop.
- Create: `tests/unit/examples/contract-lifecycle-audit.test.ts` — generated-message fixtures and deterministic unit coverage for those four helper responsibilities.
- Create: `examples/shared/contract-lifecycle-audit-workflow.ts` — dependency-injected orchestration of fixture setup, create/replace, two active direct reads, and historical original read.
- Create: `tests/unit/examples/contract-lifecycle-audit-workflow.test.ts` — workflow order, shrinking request options, explicit request construction, logging, and primary-error-safe disposal coverage.
- Create: `examples/95-contract-lifecycle-audit.ts` — standalone `runExampleAsync` entry point using `createExampleClient` and `runClientWorkflowWithDisposalAsync`.
- Modify: `tests/unit/examples/application-example-sources.test.ts` — durable, rename-tolerant source contracts for example 95 and its helper boundaries.
- Modify: `package.json` — one workflow script only; stage only this hunk, leaving the user version edit unstaged.
- Modify: `README.md` — workflow command/disclosure and accurate gRPC-only service-method support list.

### Task 1: Build the generated request and structural assertion helper test-first

**Files:**

- Create: `tests/unit/examples/contract-lifecycle-audit.test.ts`
- Create: `examples/shared/contract-lifecycle-audit.ts`

- [ ] **Step 1: Write the failing generated-message tests with `apply_patch`.**

  Add `tests/unit/examples/contract-lifecycle-audit.test.ts`. Import `describe`, `expect`, and `it` from `vitest`; `OperationDeadline` from the public package; and both `google` and `ledgerApiV2` from `@distrohelena/canton-typescript-sdk/protobuf`. Import the not-yet-created helper exports. Build all fixtures with generated `.create(...)` calls, not structural casts.

  Cover `buildMessageLifecycleEventFormat("Alice", fixtureTemplateId)` by asserting:

  ```ts
  expect(format).toEqual(ledgerApiV2.EventFormat.create({
      filtersByParty: {
          Alice: ledgerApiV2.Filters.create({
              cumulative: [ledgerApiV2.CumulativeFilter.create({
                  identifierFilter: {
                      oneofKind: "templateFilter",
                      templateFilter: ledgerApiV2.TemplateFilter.create({
                          templateId: ledgerApiV2.Identifier.create({
                              packageId: "package-id",
                              moduleName: "DebugPlayground",
                              entityName: "Message",
                          }),
                          includeCreatedEventBlob: false,
                      }),
                  },
              })],
          }),
      },
      verbose: true,
  }));
  expect(format.filtersForAnyParty).toBeUndefined();
  ```

  Include rejection tests for blank party and each blank fixture identifier component. The fixture template has `packageId: "package-id"`, `packageName: "debug-playground"`, `moduleName: "DebugPlayground"`, and `entityName: "Message"`; the filter must use `packageId`, never `#${packageName}`.

  Add a correct self-party direct-lookup fixture made exactly as follows (the existing `messageArguments` test utility may be copied locally only if it preserves the three labelled fields):

  ```ts
  ledgerApiV2.GetContractResponse.create({
      createdEvent: ledgerApiV2.CreatedEvent.create({
          contractId: "#original",
          templateId: ledgerApiV2.Identifier.create({
              packageId: "package-id", moduleName: "DebugPlayground", entityName: "Message",
          }),
          createArguments: messageArguments({ sender: "Alice", recipient: "Alice", text: "original" }),
          witnessParties: ["Alice"],
          signatories: ["Alice"],
          observers: [],
          offset: "42",
          nodeId: 7,
          createdEventBlob: Uint8Array.of(1, 2),
          interfaceViews: [ledgerApiV2.InterfaceView.create({
              interfaceId: ledgerApiV2.Identifier.create({
                  packageId: "interface-package", moduleName: "Fixture", entityName: "View",
              }),
              viewStatus: google.rpc.Status.create({ code: 0, message: "fixture interface view" }),
              implementationPackageId: "interface-package",
          })],
          acsDelta: true,
      }),
  });
  ```

  Assert that `assertDirectMessageLookup` accepts it, proving it does not read the five ContractService-unavailable fields (`offset`, `nodeId`, `createdEventBlob`, `interfaceViews`, and `acsDelta`). Add individual rejections for absent `createdEvent`, a wrong/blank contract ID, wrong or missing template ID, wrong `sender`/`recipient`/`text` or non-exact record fields, and duplicate/wrong/missing visibility sets. The accepted and rejected events must all use one actor for both sender and recipient; require exactly `{ witnesses: [actor], signatories: [actor], observers: [] }` as sets with cardinality one/one/zero rather than relying on order.

  Add `assertArchivedMessageHistory` tests that accept only a generated `GetEventsByContractIdResponse` with both wrappers, a materialized original `CreatedEvent`, a materialized original `ArchivedEvent`, nonblank creation and archival synchronizer IDs, exact fixture template ID, exact original payload, and the same created-event self-party invariants. Reject missing inner events, missing wrapper members, blank synchronizer IDs, an original/replacement-ID mix-up, wrong template or payload, and wrong witnesses/signatories/observers. The archived event has no create arguments, so assert only its ID/template/witnesses.

- [ ] **Step 2: Prove RED.**

  Run:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit.test.ts --maxWorkers=1 --testTimeout=15000
  ```

  Expected: FAIL because `examples/shared/contract-lifecycle-audit.ts` and its exports do not exist.

- [ ] **Step 3: Implement the smallest generated-only helper with `apply_patch`.**

  Create `examples/shared/contract-lifecycle-audit.ts` with these exports and no client/environment/logging ownership:

  ```ts
  export function buildMessageLifecycleEventFormat(
      party: string,
      templateId: ExampleTemplateId,
  ): ledgerApiV2.EventFormat;

  export function assertDirectMessageLookup(init: {
      response: ledgerApiV2.GetContractResponse;
      contractId: string;
      party: string;
      templateId: ExampleTemplateId;
      text: string;
  }): ledgerApiV2.CreatedEvent;

  export function assertArchivedMessageHistory(init: {
      response: ledgerApiV2.GetEventsByContractIdResponse;
      contractId: string;
      party: string;
      templateId: ExampleTemplateId;
      text: string;
  }): { readonly created: ledgerApiV2.Created; readonly archived: ledgerApiV2.Archived };
  ```

  `buildMessageLifecycleEventFormat` must explicitly nest `ledgerApiV2.EventFormat.create`, `Filters.create`, `CumulativeFilter.create`, `TemplateFilter.create`, and `Identifier.create` exactly as in the specification. Require nonblank party and all fixture ID components before creating the message; use `templateId.packageId`, `templateId.moduleName`, and `templateId.entityName`, set `includeCreatedEventBlob: false`, omit `filtersForAnyParty`, and set `verbose: true` so `assertExactCreatedMessagePayload` can inspect labels.

  For direct lookup: require `response.createdEvent`, then validate its exact ID and `templateId` components, call existing `assertExactCreatedMessagePayload({ event, sender: party, recipient: party, text })`, and compare every visibility array as a set with exact cardinality. Never access or compare the five unavailable fields—neither their defaults nor their fixture values are evidence. Return the validated `CreatedEvent` for deliberately bounded logging.

  For history: require both top-level wrappers here (the projection reader in Task 2 will be the only code allowed to treat an absent wrapper as retryable). Check nonblank wrapper synchronizer IDs, materialized nested events, exact IDs/template IDs, created payload/self-party fields, and archive witnesses. Return both validated wrappers. Use descriptive structural `Error`s; do not match transport error text or classify a server error.

- [ ] **Step 4: Prove GREEN and type-check the examples.**

  Run, sequentially:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit.test.ts --maxWorkers=1 --testTimeout=15000
  rtk npm run examples:check
  ```

  Expected: the focused helper suite passes and `examples:check` exits zero after its clean build.

- [ ] **Step 5: Do the per-task spec and quality review.**

  Run:

  ```bash
  rtk git diff --check
  rtk git diff -- examples/shared/contract-lifecycle-audit.ts tests/unit/examples/contract-lifecycle-audit.test.ts
  ```

  Review against the design: request construction uses only public generated namespaces; direct lookup checks supported materialized data only; the non-default unavailable-field regression fixture is accepted; every Message is self-party; and no `src/` or JSON file was touched.

- [ ] **Step 6: Commit the first green slice.**

  Run:

  ```bash
  rtk git add examples/shared/contract-lifecycle-audit.ts tests/unit/examples/contract-lifecycle-audit.test.ts
  rtk git diff --cached --check
  rtk git diff --cached --name-only
  rtk git commit -m "feat: add lifecycle audit request assertions"
  ```

  Expected staged files are exactly the helper and its focused test.

### Task 2: Add the deadline-bounded EventQuery projection reader test-first

**Files:**

- Modify: `tests/unit/examples/contract-lifecycle-audit.test.ts`
- Modify: `examples/shared/contract-lifecycle-audit.ts`

- [ ] **Step 1: Write failing deterministic projection-loop tests with `apply_patch`.**

  Extend the same focused test file for `waitForCompleteOriginalHistoryAsync`. Define a fake monotonic `now` value and build `new OperationDeadline({ timeoutMs, now: () => now })`; make the injected `sleepAsync` record milliseconds and advance `now`. Supply an injected `readHistoryAsync(request, options)` that records the exact immutable generated request and each fresh `RequestOptions` instance.

  Test all of these exact cases:

  1. A complete valid first response calls the reader once, receives a fresh request option, returns that response, and never sleeps.
  2. A structurally valid `created`-only response first, followed by complete valid history, sleeps `Math.min(100, remainingMs)`, then succeeds; options are distinct objects with shrinking timeouts.
  3. An incomplete first response whose capped sleep consumes the budget rejects with one structural `Error` whose cause is the original `TimeoutError`, reports `attempts=1`, `missing=archived`, `originalContractId=#original`, and `replacementContractId=#replacement`, and dispatches no second RPC.
  4. Expiry before the first dispatch reports `attempts=0`, `missing=created|archived`, both IDs, and dispatches zero RPCs.
  5. A present malformed `created` side (including a wrong ID/payload/visibility or blank synchronizer) and a present malformed `archived` side fail immediately, do not sleep, and do not retry.
  6. An injected transport failure is rethrown by identity with no sleep/retry.
  7. The restricted timeout diagnostic does not contain the fixture party, payload text, token-looking string, endpoint-looking string, header-like string, raw response representation, or transport metadata.

  Do not modify `tests/unit/examples/update-stream-lifecycle.test.ts`: its existing `"rethrows the exact workflow failure when disposal also fails"` case already proves that `runClientWorkflowWithDisposalAsync` preserves a primary projection/submission error by identity and disposes exactly once. The new workflow test in Task 3 must invoke that established lifecycle rather than reimplementing cleanup.

- [ ] **Step 2: Prove RED.**

  Run:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit.test.ts --maxWorkers=1 --testTimeout=15000
  ```

  Expected: the added projection cases fail because the wait helper is not exported/implemented.

- [ ] **Step 3: Implement only the bounded projection loop with `apply_patch`.**

  Add the exported constant and function to `examples/shared/contract-lifecycle-audit.ts`:

  ```ts
  export const EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS = 100;

  export async function waitForCompleteOriginalHistoryAsync(init: {
      request: ledgerApiV2.GetEventsByContractIdRequest;
      deadline: OperationDeadline;
      readHistoryAsync: (
          request: ledgerApiV2.GetEventsByContractIdRequest,
          options: RequestOptions,
      ) => Promise<ledgerApiV2.GetEventsByContractIdResponse>;
      sleepAsync: (milliseconds: number) => Promise<void>;
      contractId: string;
      replacementContractId: string;
      party: string;
      templateId: ExampleTemplateId;
      text: string;
  }): Promise<ledgerApiV2.GetEventsByContractIdResponse>;
  ```

  Implement the loop in this order on every iteration: call `deadline.createRequestOptions()` before dispatch; increment `attempts` only after that succeeds and immediately before the dispatched read; await `readHistoryAsync(init.request, options)` without a transport-error catch; validate every present side using the Task 1 structural rules; return only when both sides exist and full `assertArchivedMessageHistory` succeeds. If either wrapper is absent and every present wrapper is valid, retain precisely the missing side names, call `deadline.remainingTimeoutMs()`, and await `sleepAsync(Math.min(EVENT_QUERY_PROJECTION_POLL_INTERVAL_MS, remainingMs))`.

  Catch only `TimeoutError` from the two pre-dispatch deadline methods and bounded wait computation. Convert it to a new credential-safe `Error` whose message contains only `attempts`, `missing`, `originalContractId`, and `replacementContractId`, and pass `{ cause: error }`. Initialize missing sides to `created|archived` so an expired-first-call report is correct. The loop must not create a new `OperationDeadline`, mutate/rebuild the request, own cleanup, log a response, retry a malformed present event, retry a transport error, or retry submissions.

- [ ] **Step 4: Prove GREEN and keep intermediate example type safety green.**

  Run, sequentially:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit.test.ts --maxWorkers=1 --testTimeout=15000
  rtk npm run examples:check
  ```

  Expected: each focused suite passes, complete history has one dispatch/no sleep, and timeout paths prove no additional dispatch.

- [ ] **Step 5: Do the per-task spec and quality review.**

  Run:

  ```bash
  rtk git diff --check
  rtk git diff -- examples/shared/contract-lifecycle-audit.ts tests/unit/examples/contract-lifecycle-audit.test.ts
  ```

  Confirm the code has one private 100 ms interval, one supplied absolute deadline, fresh shrinking options per dispatch, incomplete-only retries, unchanged transport errors, safe timeout diagnostics, and no SDK polling/public API change.

- [ ] **Step 6: Commit the second green slice.**

  Run:

  ```bash
  rtk git add examples/shared/contract-lifecycle-audit.ts tests/unit/examples/contract-lifecycle-audit.test.ts
  rtk git diff --cached --check
  rtk git diff --cached --name-only
  rtk git commit -m "feat: wait for complete lifecycle history"
  ```

  Expected staged files are exactly the helper and its focused test.

### Task 3: Add the testable standalone workflow and top-level example test-first

**Files:**

- Create: `tests/unit/examples/contract-lifecycle-audit-workflow.test.ts`
- Create: `examples/shared/contract-lifecycle-audit-workflow.ts`
- Create: `examples/95-contract-lifecycle-audit.ts`

- [ ] **Step 1: Write the failing workflow and runner tests with `apply_patch`.**

  Add a dependency-injected `runContractLifecycleAuditWorkflowAsync` test suite modeled on `archive-and-stale-contract-workflow.test.ts`. Its fake clock should prove the single deadline budget is passed to fixture setup, DAR upload, party resolution, participant compatibility read, create submission, both direct lookups, replacement submission, and every history attempt. Record command and generated RPC requests/options rather than mocking implementation details.

  The success test must assert this exact order:

  1. construct one deadline before `loadFixtureAsync`;
  2. load fixture, upload/verify DAR with that deadline, resolve party with `process.env` and that deadline, and read compatibility with that deadline;
  3. create one self-party Message with `contract-lifecycle-original-run-123` and command ID `contract-lifecycle-create-run-123`;
  4. call `contractService.getContractAsync(ledgerApiV2.GetContractRequest.create({ contractId: "#original", queryingParties: ["Alice"] }), freshOptions)` and prove original through Task 1 assertion;
  5. exercise exact `#original` with replacement `contract-lifecycle-replacement-run-123` and command ID `contract-lifecycle-replace-run-123`; require the response's archived ID is `#original`, created replacement is nonblank and differs;
  6. call the same direct lookup shape for `#replacement` with `["Alice"]` and fresh options; and
  7. construct a fresh `GetEventsByContractIdRequest.create({ contractId: "#original", eventFormat: buildMessageLifecycleEventFormat("Alice", fixture.templateId) })`, pass it to the bounded reader, and require its accepted history.

  Assert no old-ID direct lookup after `ReplaceText`; two direct request objects and all unary options are distinct. Assert `runId` is supplied by `createRunId`, warnings occur for allocated party and durable DAR/topology/contract state, and logs include only run marker, actor, original/replacement IDs, exact known payload values, two nonblank synchronizer IDs, participant version/release core/common path—never bearer tokens, endpoint, headers, raw DAR, raw response, or a complete payload object. Add failures for a wrong archived response ID, an empty/equal replacement ID, and an assertion/projection failure; dispose must remain owned by `runClientWorkflowWithDisposalAsync` in the top-level runner and must not mask primary failure.

  Add static runner assertions that `95-contract-lifecycle-audit.ts` has exactly one `createExampleClient`, exactly one `runClientWorkflowWithDisposalAsync`, exactly one `client.disposeAsync()`, and its workflow invokes the new dependency defaults with `createRunId: () => randomBytes(12).toString("hex")` and `logger: console`.

- [ ] **Step 2: Prove RED.**

  Run:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit-workflow.test.ts --maxWorkers=1 --testTimeout=15000
  ```

  Expected: FAIL because the lifecycle workflow and `95` entry point do not exist.

- [ ] **Step 3: Implement the narrow workflow and standalone runner with `apply_patch`.**

  Create `examples/shared/contract-lifecycle-audit-workflow.ts` with a typed dependency interface following `ArchiveAndStaleContractWorkflowDependencies`. Keep client construction and disposal out of it. The exported defaults bind existing `loadExampleApplicationFixtureAsync`, `ensureExampleDarUploadedAsync`, `resolveExamplePartyAsync`, `readWorkflowCompatibilityAsync`, `exampleTimeoutMs`, `new OperationDeadline(init)`, Task 1/2 helpers, and a real `sleepAsync` implemented as `milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds))`.

  Construct exactly one `OperationDeadline` as the first executable action. Use fresh `deadline.createRequestOptions()` for the create submission, the original lookup, the replacement submission, and the replacement lookup. Do not use `new RequestOptions`, no options, or a second deadline. Keep active reads visible in this workflow using exact generated factory calls:

  ```ts
  const originalLookup = await client.contractService.getContractAsync(
      ledgerApiV2.GetContractRequest.create({
          contractId: original.contractId,
          queryingParties: [actor.party],
      }),
      deadline.createRequestOptions(),
  );
  ```

  Construct the history request with `ledgerApiV2.GetEventsByContractIdRequest.create`, the exact original contract ID, and a newly produced Task 1 EventFormat. Supply the EventQuery call to Task 2 as the injected reader, passing its supplied request/options straight to `client.eventQueryService.getEventsByContractIdAsync`. Do not call ContractService for the original after replacement.

  In `examples/95-contract-lifecycle-audit.ts`, use only the established top-level form:

  ```ts
  runExampleAsync("contract-lifecycle-audit", async () => {
      const client = createExampleClient();
      await runClientWorkflowWithDisposalAsync({
          disposeAsync: () => client.disposeAsync(),
          runWorkflowAsync: () => runContractLifecycleAuditWorkflowAsync({
              client,
              ...contractLifecycleAuditWorkflowDefaults,
              createRunId: () => randomBytes(12).toString("hex"),
              logger: console,
          }),
      });
  });
  ```

  Print individual, bounded fields rather than serializing request/response objects. Preserve the established explicit nonblank `SDK_EXAMPLE_PARTY` behavior through `resolveExamplePartyAsync`; never trim/rewrite it locally. The workflow may mention the actual three known values but never bearer tokens, endpoint values, headers, credential filenames, DAR bytes, raw response, or transport metadata.

- [ ] **Step 4: Prove GREEN and type-check all examples.**

  Run, sequentially:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit-workflow.test.ts tests/unit/examples/contract-lifecycle-audit.test.ts --maxWorkers=1 --testTimeout=15000
  rtk npm run examples:check
  ```

  Expected: workflow requests/order and primary-error-safe disposal tests pass; examples compile against freshly rebuilt SDK declarations.

- [ ] **Step 5: Do the per-task spec and quality review.**

  Run:

  ```bash
  rtk git diff --check
  rtk git diff -- examples/shared/contract-lifecycle-audit-workflow.ts examples/95-contract-lifecycle-audit.ts tests/unit/examples/contract-lifecycle-audit-workflow.test.ts
  rtk rg -n 'getUpdateById|getUpdateByOffset|getUpdateByHash|participantVersion\\s*(===|!==)|error\\.message|ContractService.*original' examples/95-contract-lifecycle-audit.ts examples/shared/contract-lifecycle-audit-workflow.ts
  ```

  Expected last command: no matches. Verify visually that the two post-create `GetContract` requests are original-before-replace and replacement-after-replace, and that neither production file branches on release core nor catches transport errors.

- [ ] **Step 6: Commit the third green slice.**

  Run:

  ```bash
  rtk git add examples/shared/contract-lifecycle-audit-workflow.ts examples/95-contract-lifecycle-audit.ts tests/unit/examples/contract-lifecycle-audit-workflow.test.ts
  rtk git diff --cached --check
  rtk git diff --cached --name-only
  rtk git commit -m "feat: add contract lifecycle audit example"
  ```

  Expected staged files are exactly the workflow module, entry point, and workflow test.

### Task 4: Add source contracts, command, and README without staging the user version edit

**Files:**

- Modify: `tests/unit/examples/application-example-sources.test.ts`
- Modify: `package.json`
- Modify: `README.md`

- [ ] **Step 1: Write failing source/package/documentation tests with `apply_patch`.**

  Extend `application-example-sources.test.ts` with source checks that are resilient to local variable renames but enforce semantics. Parse/read `95-contract-lifecycle-audit.ts` plus its workflow/helper modules and require: one deadline before fixture work; fixture/DAR/party/compatibility setup receives it; both active direct reads use generated `GetContractRequest.create` with `[actor.party]` and fresh options; an explicit generated Message EventFormat is passed to generated `GetEventsByContractIdRequest.create`; the local bounded projection helper receives the same deadline; replacement proves exact archived original and a distinct nonblank replacement; and standard disposal owns cleanup.

  Assert sources do not contain `getUpdateById`, `getUpdateByOffset`, `getUpdateByHash`, `filtersForAnyParty`, `TransactionShape`, `getActiveContracts`, a post-replace original ContractService call, `participantVersion ===`, `participantVersion !==`, `error.message`, `RegExp`, or a `catch` around EventQuery transport reading. Do not overfit console punctuation or private variable names.

  In the same test file (or an existing package-script test if it is the repository convention), read `package.json` and require exactly:

  ```json
  "example:workflow:contract-lifecycle-audit": "npm run build && node --loader ts-node/esm examples/95-contract-lifecycle-audit.ts"
  ```

  Add README string/section assertions only if repository documentation tests already own that responsibility; otherwise use the review in Step 5 rather than inventing a fragile prose test.

- [ ] **Step 2: Prove RED.**

  Run:

  ```bash
  rtk npx vitest run tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000
  ```

  Expected: FAIL because the command and lifecycle-audit source contracts/docs are absent.

- [ ] **Step 3: Apply the package and README changes with `apply_patch`.**

  Add the exact package script adjacent to the other workflow scripts. Do not change `version`, `files`, exports, dependencies, or package contents.

  In README's Workflow examples block, add `npm run example:workflow:contract-lifecycle-audit`. Update the surrounding count from four to the accurate number. Add a concise paragraph stating that the command is standalone and gRPC-only; uses normal `SDK_EXAMPLE_*` endpoint/auth/TLS/party/timeout configuration; preserves explicit-versus-fallback party behavior; leaves durable DAR/topology/contract state; reads the active original and replacement through alpha `ContractService`; obtains original create/archive history through `EventQueryService`; and intentionally makes no post-archive ContractService claim.

  Replace the stale support-list entries exactly with:

  ```markdown
  - `eventQueryService.getEventsByContractIdAsync(...)`: `grpc` only; JSON rejects it
  - `contractService.getContractAsync(...)`: `grpc` only; JSON rejects it
  ```

  Keep credentials absent from prose beyond existing environment-variable names and preserve the existing protected-child-shell direction.

- [ ] **Step 4: Prove GREEN and all examples compile.**

  Run, sequentially:

  ```bash
  rtk npx vitest run tests/unit/examples/application-example-sources.test.ts tests/unit/examples/contract-lifecycle-audit.test.ts tests/unit/examples/contract-lifecycle-audit-workflow.test.ts --maxWorkers=1 --testTimeout=15000
  rtk npm run examples:check
  ```

  Expected: source contracts and helper/workflow suites pass, and the clean build/type-check passes.

- [ ] **Step 5: Do the per-task spec and quality review.**

  Run:

  ```bash
  rtk git diff --check
  rtk git diff -- package.json README.md tests/unit/examples/application-example-sources.test.ts
  rtk git diff -- package.json
  rtk git status --short
  ```

  Confirm `package.json` still contains the pre-existing version edit as an unstaged change and the only desired package addition is the workflow script. Confirm README does not promise JSON support or post-archive lookup behavior.

- [ ] **Step 6: Stage the package script hunk only, then commit this green slice.**

  First stage the test and README normally, then interactively stage only the added script hunk from `package.json`—answer `y` only for the script addition and `n` for the pre-existing version hunk:

  ```bash
  rtk git add tests/unit/examples/application-example-sources.test.ts README.md
  rtk git add -p package.json
  rtk git diff --cached -- package.json
  rtk git diff -- package.json
  rtk git diff --cached --check
  rtk git diff --cached --name-only
  rtk git commit -m "docs: document contract lifecycle audit example"
  ```

  Expected staged files are exactly `tests/unit/examples/application-example-sources.test.ts`, `README.md`, and the script-only hunk in `package.json`. The working-tree diff for `package.json` must still show the user version change after commit.

### Task 5: Record live 3.5.7/3.5.8 evidence without source edits or credentials

**Files:**

- Modify: none unless a real, reproducible defect is found. A live difference is not permission to add a version branch.

- [ ] **Step 1: Establish a protected 3.5.7 child-shell run.**

  With an authenticated normal localnet available, use a temporary token file and keep the token expansion inside one child shell. The commands deliberately print only the participant version and normal example evidence—not the credential:

  ```bash
  rtk bash -lc 'set -euo pipefail; proof_token_357="$(rtk mktemp)"; trap "rtk rm -f \"$proof_token_357\"" EXIT; PARTICIPANT_358_LEDGER_TOKEN_FILE="$proof_token_357" rtk node node/participant-358-synchronizer.mjs mint-ledger-token; export SDK_EXAMPLE_LEDGER_ENDPOINT=localhost:3901; export SDK_EXAMPLE_LEDGER_ADMIN_ENDPOINT=localhost:3901; export SDK_EXAMPLE_PARTICIPANT_ADMIN_ENDPOINT=localhost:3902; export SDK_EXAMPLE_BEARER_TOKEN="$(rtk cat "$proof_token_357")"; version_357="$(PARTICIPANT_358_LEDGER_ENDPOINT=localhost:3901 rtk node node/participant-358-synchronizer.mjs ledger-api-version)"; [[ "$version_357" == 3.5.7* ]]; first_output="$(rtk npm run example:workflow:contract-lifecycle-audit)"; printf "%s\n" "$first_output"; actor_357="$(printf "%s\n" "$first_output" | rtk sed -n "s/^Actor party: //p" | rtk head -n 1)"; [[ -n "$actor_357" ]]; SDK_EXAMPLE_PARTY="$actor_357" rtk npm run example:workflow:contract-lifecycle-audit'
  ```

  The first run takes the default fallback-party path. Its non-secret printed actor is parsed only within the same child shell and supplied to the second run, proving the explicit-party path. Do not echo/export the token in parent shell history or record it in test output.

  Record only non-sensitive evidence: authenticated full participant version, parsed release core, common path, run marker, actor, original/replacement IDs, both direct-read IDs and exact three-field checks, creation/archive synchronizer IDs, and lifecycle lineage result. Ignore the normal durable-state warning.

- [ ] **Step 2: Establish a protected 3.5.8 child-shell run.**

  Start/verify the isolated participant once, then refresh and consume credentials entirely in a local short-lived child shell. Command substitution captures the launcher output only for `eval`; it must not be printed, copied to docs, or committed:

  ```bash
  rtk npm run start:local-participant-358
  rtk bash -lc 'set -euo pipefail; eval "$(rtk bash node/start-local-participant-358.sh --refresh-token)"; first_output="$(rtk npm run example:workflow:contract-lifecycle-audit)"; printf "%s\n" "$first_output"; actor_358="$(printf "%s\n" "$first_output" | rtk sed -n "s/^Actor party: //p" | rtk head -n 1)"; [[ -n "$actor_358" ]]; SDK_EXAMPLE_PARTY="$actor_358" rtk npm run example:workflow:contract-lifecycle-audit'
  rtk npm run stop:local-participant-358
  ```

  Expected: both default and explicit-party invocations use the unchanged source and report the same structural proof/common path on 3.5.8. The five-minute development JWT and endpoint/token exports remain inside this child only. Stop only the SDK-owned sidecar; do not touch CN Quickstart.

- [ ] **Step 3: Triage live outcomes without masking them.**

  Treat missing created/archive history, a direct lookup difference, or an unavailable field as a failed audit—not as a pass or an opportunity to assert undocumented post-archive lookup behavior. Record sanitized response shape and rerun the relevant focused unit test before proposing a spec update. Do not add a version-string branch, endpoint-specific branch, message-text match, retry around submissions, or a skip. If no source change is necessary, make no commit for this task.

- [ ] **Step 4: Do the live-evidence review.**

  Run:

  ```bash
  rtk git status --short
  rtk git diff --check
  ```

  Expected: no credential/runtime material is tracked or staged; only the known user version edit and unrelated July plans remain after prior task commits.

### Task 6: Run complete verification and final implementation review

**Files:**

- Modify: none, unless a verified failure requires returning to its owning task's RED/GREEN loop.

- [ ] **Step 1: Run the focused evidence sequentially.**

  Run:

  ```bash
  rtk npx vitest run tests/unit/examples/contract-lifecycle-audit.test.ts tests/unit/examples/contract-lifecycle-audit-workflow.test.ts tests/unit/examples/application-example-sources.test.ts tests/unit/examples/update-stream-lifecycle.test.ts tests/unit/examples/application-fixture.test.ts tests/unit/json/json-batch1-read-services.test.ts tests/unit/services/contract-service-client.test.ts --maxWorkers=1 --testTimeout=15000
  rtk npm run examples:check
  ```

  Expected: all focused tests pass and the fresh-build example type-check passes.

- [ ] **Step 2: Run full repository checks in the required clean-build order.**

  Run each command only after the preceding one exits zero:

  ```bash
  rtk npm run build
  rtk npm test
  rtk npm run lint
  rtk npm run verify:pack
  rtk git diff --check
  ```

  `npm test` comes after the explicit clean build because test/runtime imports can otherwise observe removed or stale `dist/cjs` artifacts. `verify:pack` must confirm examples and `.generated/` runtime/credential material remain excluded.

- [ ] **Step 3: Perform the final specification and security review.**

  Read the approved design alongside the final diff. Confirm all of the following:

  - precisely one workflow deadline covers setup, submissions, direct reads, and all history attempts;
  - both direct reads construct `GetContractRequest` with explicit `[actor.party]`; only original-before-replace and replacement-after-replace are present;
  - history constructs a fresh explicit generated Message EventFormat through `EventFormat.create` → `Filters.create` → `CumulativeFilter.create` → `TemplateFilter.create` → `Identifier.create`, with `verbose: true`, no wildcard, and no omitted event format;
  - direct created and historical created invariants are exact payload plus witnesses/signatories `[actor.party]` and observers `[]`; archive has exact original ID/template/witnesses and nonblank synchronizer IDs;
  - unavailable ContractService fields are never inspected; the non-default fixture proves this; and malformed present history fails immediately while only absent wrappers retry;
  - timeout diagnostics are restricted, transport errors retain identity, cleanup preserves primary errors, and logs/docs/live evidence exclude tokens, headers, endpoints, raw DAR/response, and credential files;
  - no source changed under `src/`, no public SDK/JSON/generated change occurred, and package `files` remains unchanged.

- [ ] **Step 4: Check commit and working-tree scope before handoff.**

  Run:

  ```bash
  rtk git log --oneline -6
  rtk git status --short
  rtk git diff -- package.json
  rtk git diff --cached --name-only
  ```

  Expected: the lifecycle commits are small and green; no index entries remain; `package.json` still shows only the user-owned version edit; and the four pre-existing July plans remain untracked/unmodified. Do not amend unrelated history or stage those files.
