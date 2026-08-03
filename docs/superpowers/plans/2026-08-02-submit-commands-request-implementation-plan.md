# Submit Commands Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the singular `SubmitCommandRequest` API with a breaking `SubmitCommandsRequest` API that submits a statically and dynamically non-empty ordered atomic command batch through every SDK transport and interactive-signing path.

**Architecture:** Introduce one public non-empty tuple request, migrate every handwritten command-submission boundary to it, and make gRPC, JSON, interactive preparation, and canonical signing payloads map the complete ordered batch. Then migrate all callers and documentation, strengthen example 90 into a genuine multi-command atomicity proof, remove the singular API completely, and verify the packed package and both participant versions.

**Tech Stack:** TypeScript ESM, Vitest, generated protobuf-ts Ledger API v2 types, gRPC and JSON transports, interactive submission signing, local Canton Participant 3.5.7 and 3.5.8.

---

## Preconditions

- Read `docs/superpowers/specs/2026-08-02-submit-commands-request-design.md`; it wins on conflict.
- Work directly on `main` as previously authorized. Do not create a worktree or compatibility branch.
- Use `apply_patch` for edits. Prefix every shell command with `rtk`; direct Vitest commands use `rtk proxy npx vitest`.
- Preserve generated protobuf files and participant configuration. Do not add a `SubmitCommandRequest` alias, deprecated wrapper, singular constructor overload, or `command` property.
- TDD is mandatory. Observe the stated RED failure before implementing each behavior.
- Keep response names singular. They represent one completion, transaction, or prepared transaction for the entire atomic batch.

## Target API

```ts
export type NonEmptyLedgerCommands = readonly [
    LedgerCommand,
    ...LedgerCommand[],
];

export class SubmitCommandsRequest {
    public readonly commands: NonEmptyLedgerCommands;

    public constructor(init: {
        applicationId: string;
        userId?: string;
        actAs: readonly string[];
        readAs?: readonly string[];
        commands: NonEmptyLedgerCommands;
        commandId?: string;
        deduplicationPeriod?: CommandDeduplicationPeriod;
        disclosedContracts?: readonly DisclosedContract[];
        synchronizerId?: string;
    });
}
```

The constructor validates `Array.isArray(init.commands) && init.commands.length > 0`, stores `Object.freeze([...init.commands])` as `NonEmptyLedgerCommands`, and preserves all existing envelope validation.

## File Map

### Public request and core submission path

- Create `src/core/types/requests/submit-commands-request.ts`.
- Delete `src/core/types/requests/submit-command-request.ts` after migration.
- Modify `src/index.ts` and `src/core/types/prepared-command-submission.ts`.
- Modify `src/core/transports/transport.interface.ts`.
- Modify `src/services/command/command-service-client.ts`.
- Modify `src/services/command-submission/command-submission-service-client.ts`.
- Modify `src/services/commands/command-submission-pipeline.ts`.
- Modify `src/client/service-registry.ts`.
- Modify `src/transports/grpc/grpc-transport.ts` and `src/transports/json/json-transport.ts`.

### Batch mapping and canonical payload

- Modify `src/transports/grpc/mappers/commands-mapper.ts`.
- Modify `src/transports/grpc/mappers/interactive-command-mapper.ts`.
- Modify `src/transports/json/mappers/commands-mapper.ts`.
- Modify `src/services/commands/command-payload-builder.ts`.
- Modify `src/testing/runtime/declarative-action-executor.ts`.

### Tests and consumers

- Migrate every handwritten reference returned by:
  `rtk rg -l 'SubmitCommandRequest|submit-command-request' src examples tests DOCUMENTATION.md README.md`.
- Update command request, mapper, signing, runtime, integration, contract, testing-runtime, example-fixture, and live-fuzz suites.
- Modify `examples/90-atomic-create-and-exercise.ts`, `examples/shared/application-fixture.ts`, and `examples/shared/ledger-requests.ts` only where needed for the atomic batch proof.
- Modify `tests/unit/examples/application-example-sources.test.ts` and the corresponding shared-helper tests.
- Modify `README.md` and `DOCUMENTATION.md`.

### Absence guard

- Add a focused source-surface test under `tests/unit/public/submit-commands-public-surface.test.ts`.
- Exclude generated protobuf files and historical `docs/superpowers/specs` / `docs/superpowers/plans` from absence scanning.
- Match exact `SubmitCommandRequest`, `submit-command-request`, and AST property access whose property name is exactly `command`; do not substring-match `commands` or `commandId`.

---

### Task 1: Define and validate the plural public request

**Files:**
- Create: `src/core/types/requests/submit-commands-request.ts`
- Modify: `src/index.ts`
- Modify: `tests/unit/types/request-validation.test.ts`
- Modify: `tests/unit/types/ledger-command-types.test.ts`
- Create: `tests/unit/public/submit-commands-public-surface.test.ts`

- [ ] **Step 1: Write the failing public API and validation tests**

Add tests that import `SubmitCommandsRequest` and `NonEmptyLedgerCommands` from `src/index.ts` and construct one- and two-command batches:

```ts
const first = new CreateCommand({
    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
    createArguments: new DamlRecord({ sequence: 1 }),
});
const second = new ExerciseCommand({
    templateId: { packageId: "", moduleName: "Main", entityName: "Iou" },
    contractId: "00abc",
    choice: "Archive",
    choiceArgument: new DamlRecord({}),
});
const source: NonEmptyLedgerCommands = [first, second];
const request = new SubmitCommandsRequest({
    applicationId: "app",
    actAs: ["Alice"],
    commands: source,
});
expect(request.commands).toEqual([first, second]);
expect(request.commands).not.toBe(source);
expect(Object.isFrozen(request.commands)).toBe(true);
```

Add runtime rejection cases for `[]`, `null`, `{}`, and a scalar cast through `unknown`, all expecting `ValidationError("submit requests require at least one command")`. Retain and migrate existing acting-party, command-ID, and deduplication validation cases to `commands: [command]`.

- [ ] **Step 2: Run RED**

Run:

```bash
rtk proxy npx vitest run tests/unit/types/request-validation.test.ts tests/unit/types/ledger-command-types.test.ts tests/unit/public/submit-commands-public-surface.test.ts --maxWorkers=1 --testTimeout=15000
```

Expected: failure because `SubmitCommandsRequest` and `NonEmptyLedgerCommands` are not exported.

- [ ] **Step 3: Implement the request and root export**

Create the target API exactly as specified above. Copy existing envelope validation and `freezeDeduplicationPeriod` without weakening it. Validate the runtime commands shape before reading or copying it. Export both the type and class from `src/index.ts`.

Keep the old request file temporarily during this task only so unrelated handwritten consumers still compile; do not export the old class from `src/index.ts` after this step.

- [ ] **Step 4: Run GREEN and build**

Run the Step 2 command, then:

```bash
rtk npm run build
rtk git diff --check
```

Expected: focused tests and the SDK build pass.

- [ ] **Step 5: Commit**

```bash
rtk git add src/core/types/requests/submit-commands-request.ts src/index.ts tests/unit/types/request-validation.test.ts tests/unit/types/ledger-command-types.test.ts tests/unit/public/submit-commands-public-surface.test.ts
rtk git commit -m "feat: add plural command submission request"
```

---

### Task 2: Map complete batches and migrate the production SDK surface

**Files:**
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Modify: `src/transports/grpc/mappers/interactive-command-mapper.ts`
- Modify: `src/transports/json/mappers/commands-mapper.ts`
- Modify: `src/services/commands/command-payload-builder.ts`
- Modify: `src/core/types/prepared-command-submission.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/services/command/command-service-client.ts`
- Modify: `src/services/command-submission/command-submission-service-client.ts`
- Modify: `src/services/commands/command-submission-pipeline.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Modify: `src/transports/json/json-transport.ts`
- Modify: `src/testing/runtime/declarative-action-executor.ts`
- Delete: `src/core/types/requests/submit-command-request.ts`
- Modify: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Modify: `tests/unit/grpc/grpc-interactive-command-mapper.test.ts`
- Modify: `tests/unit/json/json-command-submission.test.ts`
- Modify: `tests/unit/services/command-payload-builder.test.ts`

- [ ] **Step 1: Write failing ordered-batch mapper tests**

For each mapper, build one `SubmitCommandsRequest` with a `CreateCommand` followed by an `ExerciseCommand`. Assert two mapped commands in the same order and assert their generated oneof kinds are `create` then `exercise`.

For `buildCanonicalCommandPayload`, decode the UTF-8 JSON and require:

```ts
expect(payload).toMatchObject({
    commands: [
        { kind: "create" },
        { kind: "exercise" },
    ],
});
expect(payload).not.toHaveProperty("command");
```

- [ ] **Step 2: Run RED**

```bash
rtk proxy npx vitest run tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/json/json-command-submission.test.ts tests/unit/services/command-payload-builder.test.ts --maxWorkers=1 --testTimeout=15000
```

Expected: the current singleton mappers expose one command or still require the singular request.

- [ ] **Step 3: Implement ordered plural mapping**

Use these exact shapes:

```ts
commands: request.commands.map(mapGrpcLedgerCommand)
```

```ts
commands: request.commands.map(mapJsonCommand)
```

```ts
commands: request.commands.map(mapCanonicalCommand)
```

Change mapper signatures and imports to `SubmitCommandsRequest`. Preserve command order, command ID generation, deduplication, disclosed contracts, signers, and all envelope fields.

In the same implementation step, migrate every production service, pipeline, prepared-submission, transport-interface, concrete transport, service-registry stub, placeholder submission client, and declarative-action runtime boundary to `SubmitCommandsRequest`. The declarative action executor constructs `commands: [command]`. Delete `src/core/types/requests/submit-command-request.ts` only after `rtk rg -n 'SubmitCommandRequest|submit-command-request' src` returns no matches.

- [ ] **Step 4: Run GREEN and scoped lint**

Run the Step 2 command and:

```bash
rtk npm run build
rtk proxy npx eslint --max-warnings=0 src/transports/grpc/mappers/commands-mapper.ts src/transports/grpc/mappers/interactive-command-mapper.ts src/transports/json/mappers/commands-mapper.ts src/services/commands/command-payload-builder.ts
rtk git diff --check
```

- [ ] **Step 5: Commit**

```bash
rtk git add src/core/types/requests/submit-commands-request.ts src/core/types/requests/submit-command-request.ts src/core/types/prepared-command-submission.ts src/core/transports/transport.interface.ts src/index.ts src/services/command/command-service-client.ts src/services/command-submission/command-submission-service-client.ts src/services/commands/command-submission-pipeline.ts src/services/commands/command-payload-builder.ts src/client/service-registry.ts src/transports/grpc/grpc-transport.ts src/transports/grpc/mappers/commands-mapper.ts src/transports/grpc/mappers/interactive-command-mapper.ts src/transports/json/json-transport.ts src/transports/json/mappers/commands-mapper.ts src/testing/runtime/declarative-action-executor.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/json/json-command-submission.test.ts tests/unit/services/command-payload-builder.test.ts
rtk git commit -m "feat: migrate SDK to atomic command batches"
```

---

### Task 3: Migrate command service, signing, and testing consumers

**Files:**
- Modify all directly corresponding unit tests under `tests/unit/services`, `tests/unit/grpc`, `tests/unit/signing`, and `tests/unit/testing`.

- [ ] **Step 1: Establish RED with the migrated client/pipeline tests**

Mechanically migrate the selected client, pipeline, signing, and declarative-action tests to `SubmitCommandsRequest({ commands: [...] })` before production signatures. Add an assertion that `PreparedCommandSubmission.request.commands` retains both original commands after `prepareAsync`.

Run:

```bash
rtk proxy npx vitest run tests/unit/services/command-submission-pipeline.test.ts tests/unit/services/grpc-command-signing.test.ts tests/unit/services/json-command-signing-not-supported.test.ts tests/unit/signing/interactive-command-signing-contracts.test.ts tests/unit/testing/declarative-action-executor.test.ts tests/unit/grpc/grpc-command-runtime.test.ts --maxWorkers=1 --testTimeout=15000
```

Expected: module or construction failures because these consumers still import or instantiate the deleted singular request.

- [ ] **Step 2: Migrate every selected consumer**

Replace imports, annotations, and constructors with `SubmitCommandsRequest({ commands: [...] })`. Add the two-command prepared-submission assertion without changing signing behavior.

- [ ] **Step 3: Run GREEN, build, and transport surface checks**

Run the Step 1 command, then:

```bash
rtk proxy npx vitest run tests/unit/core/transport-surface.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts --maxWorkers=1 --testTimeout=15000
rtk git diff --check
```

- [ ] **Step 4: Commit**

Stage the exact production and selected test files, then:

```bash
rtk git commit -m "refactor: migrate command submission surface"
```

---

### Task 4: Migrate all repository consumers and enforce singular API removal

**Files:**
- Modify remaining files under `tests/integration`, `tests/contract`, `tests/live`, `tests/unit`, `examples/shared`, and `examples` containing the old identifier or module path.
- Modify: `tests/unit/public/submit-commands-public-surface.test.ts`

- [ ] **Step 1: Capture the migration RED inventory**

Run:

```bash
rtk rg -n 'SubmitCommandRequest|submit-command-request' src examples tests
rtk npm run examples:check
```

Expected: remaining old test/example/document references and example typecheck failures.

- [ ] **Step 2: Migrate all singleton callers mechanically**

For every ordinary caller, apply only this semantic rewrite:

```ts
new SubmitCommandRequest({ command })
```

becomes:

```ts
new SubmitCommandsRequest({ commands: [command] })
```

Migrate typed arrays, fixture return types, transport mocks, callback annotations, live-fuzz fixtures, and contract/integration imports. Preserve each caller's command order and existing behavior. Do not add compatibility casts.

- [ ] **Step 3: Implement the exact absence guard**

At this stage, the public-surface test recursively reads handwritten `src`, `examples`, and `tests`, excluding generated protobufs and historical spec/plan docs. Use TypeScript AST for property access and fail only when the property identifier is exactly `command` on an expression whose static source text is `request` or a known `SubmitCommandsRequest` variable. Separately search exact identifier/module-path tokens. Task 6 extends the guard to README and `DOCUMENTATION.md` after their deliberate migration.

Require the packed/root API to export `SubmitCommandsRequest` and `NonEmptyLedgerCommands` in declarations and not export `SubmitCommandRequest`.

- [ ] **Step 4: Run GREEN across migrated consumers**

```bash
rtk npm run examples:check
rtk proxy npx vitest run tests/unit/public/submit-commands-public-surface.test.ts tests/integration/grpc/grpc-transport.integration.test.ts tests/integration/json/json-transport.integration.test.ts tests/contract/shared/command-submission.grpc.contract.test.ts tests/unit/examples/application-fixture.test.ts tests/unit/live/live-stateful-fuzzing.test.ts --maxWorkers=1 --testTimeout=15000
rtk rg -n 'SubmitCommandRequest|submit-command-request' src examples tests
rtk git diff --check
```

Expected: tests pass and `rg` returns no matches.

- [ ] **Step 5: Commit**

Stage all migrated consumer and absence-guard files, then:

```bash
rtk git commit -m "refactor: remove singular command request"
```

---

### Task 5: Prove genuine atomic multi-command behavior in example 90

**Files:**
- Modify: `examples/90-atomic-create-and-exercise.ts`
- Modify: `examples/shared/ledger-requests.ts`
- Modify: `tests/unit/examples/ledger-requests.test.ts`
- Modify: `tests/unit/examples/application-example-sources.test.ts`
- Modify: `README.md`

- [ ] **Step 1: Write failing helper and source-contract tests**

Add a fixture-specific helper test for three unique texts:

- the first command of an invalid batch must be absent from the ACS;
- two valid-batch Message creates must each be present exactly once;
- the two response contract IDs must be distinct and equal the two ACS contract IDs;
- sender, recipient, template, and exact text payload must match.

Add source contracts requiring one invalid `SubmitCommandsRequest` with two commands, one valid `SubmitCommandsRequest` with two independent commands, exactly two command-service submissions, and the ACS atomicity proof. Ban a singleton-only plural request in this example.

Run:

```bash
rtk proxy npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000
```

Expected: failure because example 90 still demonstrates only one composite command per submission.

- [ ] **Step 2: Implement the invalid atomic batch**

Construct `SubmitCommandsRequest.commands` in this order:

1. a valid `CreateCommand` for unique `invalidFirstText`;
2. the existing invalid `CreateAndExerciseCommand` using `UnknownChoice`.

Submit once and retain the existing structured version-neutral rejection classifier. Never retry the invalid batch.

- [ ] **Step 3: Implement the valid atomic batch**

Submit one request containing two independent `CreateCommand` instances with unique `firstText` and `secondText`. Require the transaction response to contain exactly two matching created events with distinct contract IDs. Traverse the stable paginated ACS through the existing public traversal helper and prove the invalid first text is absent while both valid texts are active exactly once.

Keep one `OperationDeadline`, fresh per-call request options, current client disposal, durable-state warnings, and bounded safe output. Log the two resulting contract IDs and an explicit atomic-batch proof without raw protobuf responses.

- [ ] **Step 4: Document batch semantics**

Update README's example 90 description and command-submission section to say a request contains a non-empty ordered atomic batch. Do not rename the package script or example file.

- [ ] **Step 5: Run GREEN and commit**

```bash
rtk proxy npx vitest run tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000
rtk npm run examples:check
rtk git diff --check
rtk git add examples/90-atomic-create-and-exercise.ts examples/shared/ledger-requests.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts README.md
rtk git commit -m "feat: prove atomic command batches"
```

---

### Task 6: Update the published reference and migration documentation

**Files:**
- Modify: `DOCUMENTATION.md`
- Modify: `README.md` if migration guidance is not already complete
- Modify: `tests/unit/public/submit-commands-public-surface.test.ts`

- [ ] **Step 1: Extend the documentation test first**

Require `DOCUMENTATION.md` to import and use `SubmitCommandsRequest`, show both singleton and multi-command `commands` arrays, explain ordered atomic interpretation, and contain no exact `SubmitCommandRequest` identifier.

Run:

```bash
rtk proxy npx vitest run tests/unit/public/submit-commands-public-surface.test.ts --maxWorkers=1 --testTimeout=15000
```

Expected: failure while the published reference remains singular.

- [ ] **Step 2: Migrate documentation**

Replace the request type, imports, constructor examples, and parameter descriptions. Preserve singular response documentation. Add a concise migration block:

```ts
new SubmitCommandsRequest({
    ...envelope,
    commands: [previousCommand],
});
```

State explicitly that no compatibility alias exists.

- [ ] **Step 3: Run GREEN and commit**

```bash
rtk proxy npx vitest run tests/unit/public/submit-commands-public-surface.test.ts --maxWorkers=1 --testTimeout=15000
rtk git diff --check
rtk git add DOCUMENTATION.md README.md tests/unit/public/submit-commands-public-surface.test.ts
rtk git commit -m "docs: document atomic command batches"
```

---

### Task 7: Verify locally, package the breaking surface, and prove both participant versions

**Files:** No intended tracked edits; sanitized live evidence stays under ignored `.superpowers/sdd/2026-08-02-submit-commands-request/`.

- [ ] **Step 1: Run focused command proof**

```bash
rtk proxy npx vitest run tests/unit/types/request-validation.test.ts tests/unit/types/ledger-command-types.test.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/json/json-command-submission.test.ts tests/unit/services/command-payload-builder.test.ts tests/unit/services/command-submission-pipeline.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/unit/public/submit-commands-public-surface.test.ts tests/unit/examples/ledger-requests.test.ts tests/unit/examples/application-example-sources.test.ts --maxWorkers=1 --testTimeout=15000
```

- [ ] **Step 2: Run complete repository verification sequentially**

```bash
rtk npm run examples:check
rtk npm run build
rtk npm test
rtk npm run test:live
rtk npm run verify:pack
rtk npm pack --dry-run
rtk git diff --check
```

Run ESLint with `--max-warnings=0` over every changed TypeScript file. Report the known full-repository lint baseline separately if broad lint is attempted.

- [ ] **Step 3: Inspect the packed public surface**

Verify the packed declarations and exports contain `SubmitCommandsRequest` and `NonEmptyLedgerCommands`, contain no `SubmitCommandRequest` or `submit-command-request`, and do not package examples, `.superpowers`, generated localnet state, credentials, or environment files.

- [ ] **Step 4: Run the exact example 90 package script on both versions**

Run `npm run example:workflow:atomic` sequentially against:

1. Participant 3.5.7 default actor;
2. Participant 3.5.7 explicit parsed actor;
3. Participant 3.5.8 default actor;
4. Participant 3.5.8 explicit parsed actor.

Use the same source and no version branch. Refresh credentials only within child-scoped commands. Never print or persist tokens, authorization headers, endpoints, raw responses, DAR bytes, contract payloads, or environment dumps.

Record sanitized evidence containing only version/common path, run marker, actor, invalid-batch rejection kind, two valid contract IDs, and the boolean ACS proof that the invalid first create is absent and both valid creates are active.

- [ ] **Step 5: Final scope audit**

Confirm:

- no old singular identifier/module/property remains outside historical design/plan documents and generated protobuf semantics;
- no compatibility alias or overload exists;
- generated protobuf and localnet configuration are unchanged;
- all commands remain ordered and atomic through gRPC, JSON, interactive preparation, and canonical payloads;
- the worktree contains no unexpected edits.

Commit any verification-only test/document corrections separately; otherwise make no final commit.
