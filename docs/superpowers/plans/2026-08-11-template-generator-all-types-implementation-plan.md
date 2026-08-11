# Template Generator All-Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit every modeled named DAML data type from a DAR/Dalf rather than only types reachable from generated template fields and choices.

**Architecture:** Extend `DamlLfSemanticModel` with a full data-type enumeration carrying `TypeConReference` identities. Keep template analysis and recursive type resolution intact, then ask the existing `AnalyzedDamlTypeBuilder` to materialize every enumerated data type as an additional root. Keep `ContractId<T>` target resolution opaque and continue not analyzing value definitions.

**Tech Stack:** TypeScript, DAML-LF semantic model, Vitest, fflate test fixtures.

## Global Constraints

- Preserve the existing generated template API and descriptor shapes.
- Preserve opaque `ContractId<T>` output as `string` with a target-free descriptor.
- Treat every serializable `DamlLfDataType` as an output candidate; exclude non-serializable internal/type-level definitions using LF's raw `serializable` flag.
- Do not modify the user's pre-existing `package.json` or `package-lock.json` version changes.
- Do not silently emit `unknown` for missing structured type dependencies.

---

### Task 1: Add regression coverage for all-type roots

**Files:**
- Modify: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

**Interfaces:**
- Tests consume the existing `DamlInterfaceAnalyzer` and `DamlInterfaceGenerator` APIs.
- The fixture adds `createUnusedLocalTypeLf2ArchiveBytes()` for a local named type that is not referenced by a template.

- [ ] **Step 1: Write the failing analyzer test**

Add a test that creates a compilation with an `Unused` record alongside a
template whose fields and choices contain only `Text`, then asserts:

```ts
expect(result.typeDefinitions.map((definition) => definition.identity.name))
    .toContain("Unused");
```

- [ ] **Step 2: Write the failing generator tests**

Add a fixture mode whose unused local record contains only a text field and add
an integration test asserting the generated named-type file contains
`export interface UnusedExternalType`. Change the existing Dalf and DAR tests
for `createUnusedExternalReferencesLf2ArchiveBytes()` to expect rejection with
`missing-package-id:Splice.Api.Token.HoldingV1:Holding`, because the unresolved
data type is now an analysis root. Update the materialization test to use the
unused-local fixture and rename it to describe the additional local type.

- [ ] **Step 3: Run the focused tests to verify RED**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts
```

Expected: the analyzer all-type assertion fails because the current builder
only registers template-reachable definitions, and the changed unused-external
expectations fail because current generation skips that dependency.

### Task 2: Enumerate and build all serializable modeled data types

**Files:**
- Modify: `src/daml-lf/semantics/daml-lf-semantic-model.ts`
- Modify: `src/daml-interface/analysis/daml-interface-analyzer.ts`

**Interfaces:**
- `DamlLfSemanticModel.getDataTypes()` returns immutable entries containing a
  `TypeConReference` and its `DamlLfDataType`, including the LF serializability
  metadata.
- `AnalyzedDamlTypeBuilder.buildDefinitionOrThrow(reference, context)` ensures
  the named definition is registered and fully analyzed without synthetic type
  arguments.

- [ ] **Step 1: Add semantic-model enumeration**

Implement `getDataTypes()` by walking the compilation's packages/modules and
returning each `DamlLfDataType` with its package ID, module name, and data-type
name as a `TypeConReference`. Preserve package/module/definition order.

- [ ] **Step 2: Add the builder root operation**

Refactor the existing named-reference registration into a shared helper. The
new root operation must validate the data type's parameters, install the
`undefined` placeholder before descending, build records/variants/enums using
the existing recursive logic, and leave the existing cycle handling unchanged.

- [ ] **Step 3: Make every semantic data type an analyzer root**

Analyze templates first so template/choice errors retain their current
contexts. Then iterate `semanticModel.getDataTypes()` and call
`typeBuilder.buildDefinitionOrThrow()` for each entry. Return the complete
builder definition set in `DamlInterfaceAnalysisResult`.

- [ ] **Step 4: Run the focused tests to verify GREEN**

Run the Task 1 focused Vitest command. Expected: all analyzer, generator, and
materialization tests pass, including recursive and opaque `ContractId<T>`
coverage.

### Task 3: Preserve serializability metadata and filter generator roots

**Files:**
- Modify: `src/daml-lf/model/daml-lf-data-type.ts`
- Modify: `src/daml-lf/model/lf-2-model-mapper.ts`
- Modify: `src/daml-interface/analysis/daml-interface-analyzer.ts`
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`

- [ ] **Step 1: Add the NatSyn-shaped regression**

Add a non-serializable data type with a kind-`nat` parameter to an archive
fixture and assert that generation succeeds without emitting it. Verify that
the test fails before the production change with the unsupported kind error.

- [ ] **Step 2: Carry the LF flag through the model**

Store `DefDataType.serializable` on `DamlLfDataType`, defaulting manually
constructed model instances to serializable for existing fixture ergonomics,
and populate it from the LF2 mapper.

- [ ] **Step 3: Filter only non-serializable roots**

Keep all serializable data types as analyzer roots. Skip only entries whose LF
serializable flag is false; do not restore reachability pruning or add a
name-specific `NatSyn` exception.

- [ ] **Step 4: Run the regression and all supplied DARs**

Run the focused integration test, build the SDK, and generate each DAR in the
supplied utility directory. Every DAR must complete without an analyzer error.

### Task 4: Align documentation and inspect the diff

**Files:**
- Modify: `docs/superpowers/specs/2026-07-29-template-generation-without-external-package-validation-design.md`
- Modify: `docs/superpowers/plans/2026-07-29-template-generation-without-external-package-validation-implementation-plan.md`

- [ ] **Step 1: Remove stale skip-unreachable claims**

Update the older design and plan to state that the generator's all-type policy
causes unresolved structured references in any modeled data type to fail. Keep
the distinction that ordinary `DamlLfCompilation.createOrThrow` remains strict
for general semantic/evaluator consumers and that value definitions are not
emitted by this generator.

- [ ] **Step 2: Check the focused diff**

Run:

```bash
rtk git diff --check
rtk git diff --stat
rtk git status --short
```

Expected: only the intended generator, semantic-model, tests, and documentation
files are changed, plus the user's pre-existing package version edits.

### Task 5: Full verification

**Files:**
- Test only; no additional source changes expected.

- [ ] **Step 1: Run the DAML-interface unit and integration suites**

Run:

```bash
rtk npm test -- tests/unit/daml-interface tests/integration/daml-interface
```

Expected: zero failures.

- [ ] **Step 2: Run the TypeScript build**

Run:

```bash
rtk npm run build
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 3: Review final status**

Run:

```bash
rtk git diff --check
rtk git status --short
```

Confirm the unrelated package version edits remain intact and no generated
artifacts or temporary files were added.
