# Opaque DAML Contract ID Type Arguments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate bindings from one package when `ContractId<T>` targets an unloaded external type.

**Architecture:** Treat `ContractId<T>` as a string-shaped, arity-one builtin. Keep the target opaque during compilation, analysis, descriptor emission, and import traversal, while retaining strict resolution for ordinary named values.

**Tech Stack:** TypeScript, DAML-LF model/compiler, Vitest.

---

### Task 1: Make compiler and analysis contract-ID targets opaque

**Files:**
- Modify: `tests/unit/daml-lf/daml-lf-compilation.test.ts`
- Modify: `src/daml-lf/daml-lf-compilation.ts`
- Modify: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`
- Modify: `src/daml-interface/analysis/analyzed-daml-type.ts`
- Modify: `src/daml-interface/analysis/daml-interface-analyzer.ts`
- Modify: `src/daml-interface/runtime/daml-type-descriptor.ts`
- Modify: `tests/unit/daml-interface/daml-value-converter.test.ts`

- [ ] **Step 1: Write failing compiler/analyzer/descriptor tests**

Create a package whose template field uses `ContractId<missing:Holding>` and
assert compilation/analysis succeeds without the Holding package. Assert zero
and two `ContractId` arguments fail independently while one unresolved argument
succeeds, proving compiler validation stops before the target. Assert the
analyzed descriptor has only `kind: "contractId"`, while a legacy descriptor
with optional `contract` still type-checks and decodes the source ID string.

- [ ] **Step 2: Run tests to verify red**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-compilation.test.ts tests/unit/daml-interface/daml-interface-analyzer.test.ts tests/unit/daml-interface/daml-value-converter.test.ts`

Expected: FAIL because the compiler/analyzer resolve the external Holding
target and descriptors require it.

- [ ] **Step 3: Implement minimally**

Validate `ContractId` arity at the compiler boundary, but do not recurse into
its sole argument. Remove the required analyzed nested target; make the runtime
descriptor's legacy target optional and ignored by decoding.

- [ ] **Step 4: Run tests to verify green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-lf/daml-lf-compilation.ts src/daml-interface/analysis/analyzed-daml-type.ts src/daml-interface/analysis/daml-interface-analyzer.ts src/daml-interface/runtime/daml-type-descriptor.ts tests/unit/daml-lf/daml-lf-compilation.test.ts tests/unit/daml-interface/daml-interface-analyzer.test.ts tests/unit/daml-interface/daml-value-converter.test.ts
rtk git commit -m "fix: keep DAML contract ID targets opaque"
```

### Task 2: Stop generated-binding emitters from traversing contract-ID targets

**Files:**
- Modify: `src/daml-interface/emission/template-binding-emitter.ts`
- Modify: `src/daml-interface/emission/named-type-emitter.ts`
- Modify: `src/daml-interface/emission/support-file-emitter.ts`
- Modify: `tests/unit/daml-interface/template-binding-emitter.test.ts`
- Modify: `tests/unit/daml-interface/named-type-emitter.test.ts`
- Modify: `tests/unit/daml-interface/support-file-emitter.test.ts`
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

- [ ] **Step 1: Write failing emitter tests**

Use an analyzed `contractId` with no target. Assert emitted descriptors equal
`{ kind: "contractId" }`, no external named import is collected, and legacy
normalization does not recursively require a target. Add an actual one-Dalf
fixture encoding an external `ContractId<Holding>` field, choice parameter, and
choice result with no Holding package. The integration test must directly call
`generateFromDalfOrThrowAsync` and assert descriptors are exactly
`{ kind: "contractId" }`, compiled output types are `string`, and protobuf/JSON
materialization returns the three ID strings.

- [ ] **Step 2: Run tests to verify red**

Run: `rtk npm test -- tests/unit/daml-interface/template-binding-emitter.test.ts tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

Expected: FAIL because emitters access `type.contract`.

- [ ] **Step 3: Implement minimal opaque emission**

Emit only the contract-ID kind and terminate all relevant type traversals. In
`TemplateBindingEmitter.normalizeType`, recognize and validate ContractId
before mapping type arguments, so its target remains opaque in that legacy path.

- [ ] **Step 4: Run tests to verify green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-interface/emission/template-binding-emitter.ts src/daml-interface/emission/named-type-emitter.ts src/daml-interface/emission/support-file-emitter.ts tests/unit/daml-interface/template-binding-emitter.test.ts tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts tests/fixtures/daml-lf/sample-lf-package-fixture.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts
rtk git commit -m "fix: omit DAML contract ID target descriptors"
```

### Task 3: Complete the one-Dalf regression

**Files:**
- Verify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Verify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Verify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

- [ ] **Step 1: Run the prewritten one-Dalf regression to verify green**

Assert it directly calls `generateFromDalfOrThrowAsync` with exactly one Dalf
whose external Holding target package is absent. Assert descriptors are exactly
`{ kind: "contractId" }`, compiled generated types are `string`, and protobuf
and JSON materialization produce the field, choice argument, and choice result
strings.

Run: `rtk npm test -- tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

Expected: PASS, using only the fixture's one package.

- [ ] **Step 2: Commit**

```bash
rtk git status --short
```

### Task 4: Verify the feature

**Files:**
- Verify: `tests/unit/daml-lf/daml-lf-compilation.test.ts`
- Verify: `tests/unit/daml-interface`
- Verify: `tests/integration/daml-interface`

- [ ] **Step 1: Run focused verification**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-compilation.test.ts tests/unit/daml-interface tests/integration/daml-interface`

- [ ] **Step 2: Run build, scoped lint, and diff check**

Run: `rtk npm run build && rtk npx eslint src/daml-lf/daml-lf-compilation.ts src/daml-interface tests/unit/daml-lf/daml-lf-compilation.test.ts tests/unit/daml-interface tests/integration/daml-interface --max-warnings=0 && rtk git diff --check`

- [ ] **Step 3: Confirm unrelated worktree changes remain untouched**

Run: `rtk git status --short`
