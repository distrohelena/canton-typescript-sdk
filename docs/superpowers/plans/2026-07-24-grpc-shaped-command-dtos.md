# gRPC-Shaped Command DTOs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace string/template-payload command DTOs with the structured, gRPC-shaped command model across gRPC, JSON, and every SDK call site.

**Architecture:** Reuse the existing public `TemplateId` shape as the SDK analogue of protobuf `Identifier`, and reuse `DamlRecord` as the exact SDK representation of protobuf `Record`. Command DTOs own the normalized public model; the gRPC mapper copies it directly to generated protobufs, while the JSON mapper converts it only at the JSON wire boundary.

**Tech Stack:** TypeScript, Vitest, protobuf-es generated Ledger API v2 types, JSON Ledger API mapper.

---

### Task 1: Establish the structured command DTO contract

**Files:**
- Modify: `tests/unit/types/ledger-command-types.test.ts`
- Modify: `src/core/types/commands/create-command.ts`
- Modify: `src/core/types/commands/exercise-command.ts`
- Modify: `src/core/types/commands/exercise-by-key-command.ts`
- Modify: `src/core/types/commands/create-and-exercise-command.ts`
- Modify: `src/core/types/sdk-command.ts`

- [ ] **Step 1: Write failing constructor tests for the new API**

  Cover a structured `{ packageId, moduleName, entityName }` template ID and `new DamlRecord({ owner: "Alice" })` create arguments. Assert malformed identifiers (empty module/entity), non-`DamlRecord` create arguments, missing exercise-by-key key, and missing choice/contract ID throw `ValidationError`.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `rtk npm test -- tests/unit/types/ledger-command-types.test.ts`

  Expected: FAIL because DTO constructors still require string `templateId`, `payload`, and `argument`.

- [ ] **Step 3: Implement the normalized command DTOs**

  Import `TemplateId` and `DamlRecord`. Replace all public command `templateId: string` fields with `TemplateId`; replace `payload` with `createArguments: DamlRecord`; rename exercise `argument` to `choiceArgument`. Keep `contractId`, `contractKey`, and choice arguments as the protobuf-compatible string/`unknown` forms. Validate `moduleName` and `entityName`, allow empty `packageId`, require `DamlRecord` create arguments, and preserve existing required-field validation. Apply the same property types to `SdkCommand`.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run: `rtk npm test -- tests/unit/types/ledger-command-types.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the DTO change**

  ```bash
  rtk git add src/core/types/commands src/core/types/sdk-command.ts tests/unit/types/ledger-command-types.test.ts
  rtk git commit -m "feat: align command dtos with grpc"
  ```

### Task 2: Map the canonical command model directly to gRPC

**Files:**
- Modify: `tests/unit/grpc/grpc-commands-mapper.test.ts`
- Modify: `src/transports/grpc/mappers/commands-mapper.ts`
- Modify: `src/services/commands/command-payload-builder.ts`
- Modify: `tests/unit/services/command-payload-builder.test.ts`

- [ ] **Step 1: Write failing gRPC and canonical-payload tests**

  Change all command fixtures to a package-bearing structured ID and `DamlRecord`. For each command kind assert the generated protobuf `Identifier` retains all three properties, the `createArguments` protobuf record has the expected fields, and choice arguments map through `mapValue`. Assert the signing payload uses `createArguments` and `choiceArgument`, never `payload` or `argument`.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `rtk npm test -- tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/services/command-payload-builder.test.ts`

  Expected: FAIL because gRPC still parses colon strings and reads legacy DTO property names.

- [ ] **Step 3: Implement direct protobuf-shaped mapping**

  Delete `parseTemplateIdentifier`. Copy `command.templateId` into protobuf `Identifier`; map `command.createArguments` via `mapRecord(command.createArguments.fields)`; map `choiceArgument` directly. Update canonical signing serialization to carry the same property names and preserve the structured identifier object.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `rtk npm test -- tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/services/command-payload-builder.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the gRPC mapping change**

  ```bash
  rtk git add src/transports/grpc/mappers/commands-mapper.ts src/services/commands/command-payload-builder.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/services/command-payload-builder.test.ts
  rtk git commit -m "feat: map structured commands to grpc"
  ```

### Task 3: Adapt the normalized commands to the JSON Ledger API

**Files:**
- Modify: `tests/unit/json/json-command-submission.test.ts`
- Modify: `src/transports/json/mappers/commands-mapper.ts`

- [ ] **Step 1: Write failing JSON wire-format tests**

  Use the exact structured-ID/DamlRecord DTO fixtures from the gRPC tests. Assert each JSON command serializes the template identifier only at the boundary as `packageId:moduleName:entityName` (or `moduleName:entityName` when package ID is empty), creates the JSON argument object from `DamlRecord.fields`, and emits `choiceArgument` for every exercise form.

- [ ] **Step 2: Run the focused test to verify it fails**

  Run: `rtk npm test -- tests/unit/json/json-command-submission.test.ts`

  Expected: FAIL because the JSON mapper currently forwards a structured ID object and accesses legacy `payload`/`argument` fields.

- [ ] **Step 3: Implement JSON boundary adaptation**

  Add a small private `formatJsonTemplateId(TemplateId)` helper. Map `DamlRecord.fields` through the existing JSON DAML-value conversion, add explicit handling for `DamlRecord` in nested values where needed, and use `choiceArgument` consistently. Do not add a public compatibility parser or a second JSON-specific DTO type.

- [ ] **Step 4: Run the focused test to verify it passes**

  Run: `rtk npm test -- tests/unit/json/json-command-submission.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the JSON adapter change**

  ```bash
  rtk git add src/transports/json/mappers/commands-mapper.ts tests/unit/json/json-command-submission.test.ts
  rtk git commit -m "feat: adapt structured commands to json"
  ```

### Task 4: Migrate command producers, command inspection, and examples

**Files:**
- Modify: `src/transports/grpc/mappers/command-inspection-mapper.ts`
- Modify: `src/testing/runtime/declarative-action-executor.ts`
- Modify: command-creating source/test fixtures identified by `rtk rg 'new (CreateCommand|ExerciseCommand|ExerciseByKeyCommand|CreateAndExerciseCommand)' src tests README.md`
- Modify: `README.md`

- [ ] **Step 1: Run the TypeScript build to enumerate old call sites**

  Run: `rtk npm run build`

  Expected: FAIL with each remaining string `templateId`, `payload`, and `argument` command construction location.

- [ ] **Step 2: Migrate every production call site**

  Convert constructed template strings to `TemplateId` objects at the producing boundary. Replace create payloads with `DamlRecord`; rename exercise argument properties. Ensure `command-inspection-mapper` constructs `SdkCommand` with its structured `Identifier` and `DamlRecord` output. Keep string-only template IDs that belong to testing catalog/replay/query APIs out of scope unless the compiler identifies them as command DTO inputs.

- [ ] **Step 3: Migrate test fixtures, live fuzzing helpers, and README examples**

  Update all command DTO uses to the normalized public API. Preserve unrelated query template-ID examples, which use their own model.

- [ ] **Step 4: Run the build and targeted command suite**

  Run: `rtk npm run build && rtk npm test -- tests/unit/types/ledger-command-types.test.ts tests/unit/grpc/grpc-commands-mapper.test.ts tests/unit/grpc/grpc-interactive-command-mapper.test.ts tests/unit/grpc/grpc-command-runtime.test.ts tests/unit/json/json-command-submission.test.ts tests/unit/services/command-payload-builder.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the migration**

  ```bash
  rtk git add src tests README.md
  rtk git commit -m "refactor: use structured command identifiers"
  ```

### Task 5: Final regression verification

**Files:**
- Modify: none expected

- [ ] **Step 1: Run the complete test suite**

  Run: `rtk npm test`

  Expected: PASS.

- [ ] **Step 2: Run formatting/linting if provided by package scripts**

  Run: `rtk npm run`

  Expected: inspect scripts and run the repository's applicable static checks.

- [ ] **Step 3: Verify no legacy command fields remain**

  Run: `rtk rg -n 'command\.payload|command\.argument|parseTemplateIdentifier|templateId: "[^" ]*:[^" ]*"' src tests README.md`

  Expected: no command DTO usages; any unrelated catalog/query strings must be reviewed individually rather than blindly changed.

- [ ] **Step 4: Commit verification-only corrections if needed**

  ```bash
  rtk git add -A
  rtk git commit -m "test: verify structured command dto migration"
  ```
