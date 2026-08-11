# Template Generation Without External Package Validation Implementation Plan

> **Superseded:** Follow `docs/superpowers/plans/2026-08-11-template-generator-all-types-implementation-plan.md` instead. This plan documents the historical lazy-reachability behavior.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Historical plan for allowing unrelated unloaded external references during template-only generation. It is superseded because named type generation now includes every modeled data type.

**Architecture:** Preserve strict `DamlLfCompilation.createOrThrow` validation for general consumers and retain the index-only factory for generator loading. The current analyzer enumerates every modeled data type as an output root and reports fully qualified identities for any missing structured dependency.

**Tech Stack:** TypeScript, DAML-LF compiler/model, Vitest.

---

### Task 1: Add a generator-specific lazy compilation factory

**Files:**
- Modify: `tests/unit/daml-lf/daml-lf-compilation.test.ts`
- Modify: `src/daml-lf/daml-lf-compilation.ts`

- [ ] **Step 1: Write failing factory tests**

Create isolated workspaces with one unused missing external direct reference in
a data type and another in a value definition. Assert strict `createOrThrow`
rejects each. Assert a new template-generation factory indexes both without
global resolution.

- [ ] **Step 2: Run red tests**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-compilation.test.ts`

Expected: FAIL because the index-only template-generation factory is missing.

- [ ] **Step 3: Implement minimally**

Add a clearly named public factory that calls only `buildIndexes`; leave
`createOrThrow` and its validation unchanged.

- [ ] **Step 4: Run green tests**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-lf/daml-lf-compilation.ts tests/unit/daml-lf/daml-lf-compilation.test.ts
rtk git commit -m "fix: defer external validation for template generation"
```

### Task 2: Prove one-Dalf/DAR generation skips unused external references

**Files:**
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`
- Modify: `src/daml-interface/daml-interface-generator.ts`
- Modify: `src/daml-interface/analysis/daml-interface-analyzer.ts`

- [ ] **Step 1: Write failing Dalf and DAR integration tests**

First create the fixture helpers and real Dalf bytes with both an unused data type and unused value definition
directly referencing missing `Splice.Api.Token.HoldingV1.Holding`. Construct a
real multi-entry DAR with `zipSync`, a manifest, this Dalf, and a second Dalf
with its own template. Assert direct Dalf generation succeeds and DAR
generation emits templates from both Dalf entries. Assert the missing package
and module identity are absent from every emitted template, named-type,
support, registry, and index file; reachable bindings still compile/materialize
normally.

Add negative Dalf and DAR tests where a template field or choice directly uses
the missing structured type. Cover both a field and a choice across the matrix.
Assert generation rejects with the exact stable identity
`missing-package-id:Splice.Api.Token.HoldingV1:Holding` in its diagnostic.

- [ ] **Step 2: Run red tests**

Run: `rtk npm test -- tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

Expected: FAIL because both generator paths still use strict global compilation
and the reachable diagnostic is not fully qualified.

- [ ] **Step 3: Implement fixture/diagnostic support**

Extend fixture creation and qualify the analyzer’s missing named-type error.
Switch both generator archive paths to the lazy compilation factory and qualify
the analyzer’s missing named-type error with its complete identity.
Do not weaken resolution for a named structured type that an emitted template
actually reaches.

- [ ] **Step 4: Run green tests**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add tests/fixtures/daml-lf/sample-lf-package-fixture.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts src/daml-interface/daml-interface-generator.ts src/daml-interface/analysis/daml-interface-analyzer.ts
rtk git commit -m "test: generate templates without external packages"
```

### Task 3: Verify lazy template generation

**Files:**
- Verify: `tests/unit/daml-lf/daml-lf-compilation.test.ts`
- Verify: `tests/unit/daml-interface`
- Verify: `tests/integration/daml-interface`

- [ ] **Step 1: Run focused suites**

Run: `rtk npm test -- tests/unit/daml-lf/daml-lf-compilation.test.ts tests/unit/daml-interface tests/integration/daml-interface`

- [ ] **Step 2: Run build, scoped lint, and diff check**

Run: `rtk npm run build && rtk npx eslint src/daml-lf/daml-lf-compilation.ts src/daml-interface/daml-interface-generator.ts src/daml-interface/analysis/daml-interface-analyzer.ts tests/unit/daml-lf/daml-lf-compilation.test.ts tests/unit/daml-interface tests/integration/daml-interface --max-warnings=0 && rtk git diff --check`

- [ ] **Step 3: Confirm only the pre-existing untracked test file remains**

Run: `rtk git status --short`
