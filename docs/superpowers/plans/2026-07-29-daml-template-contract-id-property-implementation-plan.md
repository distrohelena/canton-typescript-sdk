# DAML Template Contract ID Property Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generated template `get()` contract-ID access with a read-only `contractId` property while preserving collision-safe DAML binding generation.

**Architecture:** `DamlTemplate` remains the sole owner of the private ID and exposes it via a getter. The resolver releases `get` as an allowed generated field/choice source name, while retaining names that collide with actual class members. Tests, generated compile fixtures, and documentation migrate to the property API.

**Tech Stack:** TypeScript, Vitest, existing DAML interface generator.

---

### Task 1: Specify the runtime property contract

**Files:**
- Modify: `tests/unit/daml-interface/daml-value-converter.test.ts`
- Modify: `src/daml-interface/runtime/daml-template.ts`

- [ ] **Step 1: Write the failing test**

```ts
const template = new DamlTemplate("cid-1");

expect(template.contractId).toBe("cid-1");
expect("get" in template).toBe(false);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `rtk npm test -- tests/unit/daml-interface/daml-value-converter.test.ts`

Expected: FAIL because `contractId` is absent and `get()` still exists.

- [ ] **Step 3: Write minimal implementation**

```ts
public get contractId(): string {
    return this.#contractId;
}
```

Remove the former `get()` method.

- [ ] **Step 4: Run test to verify it passes**

Run: `rtk npm test -- tests/unit/daml-interface/daml-value-converter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-interface/runtime/daml-template.ts tests/unit/daml-interface/daml-value-converter.test.ts
rtk git commit -m "feat: expose DAML template contract IDs as properties"
```

### Task 2: Release `get` in generated names and migrate consumers

**Files:**
- Modify: `tests/unit/daml-interface/type-script-name-resolver.test.ts`
- Modify: `src/daml-interface/emission/type-script-name-resolver.ts`
- Modify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-project-compilation.integration.test.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `docs/superpowers/specs/2026-07-29-daml-template-class-generator-design.md`
- Modify: `docs/superpowers/plans/2026-07-29-daml-template-class-generator-implementation-plan.md`

- [ ] **Step 1: Write failing resolver and generated-consumer tests**

```ts
expect(resolver.getFieldPropertyName(template, getField)).toBe("get");
expect(resolver.getChoiceParameterName(template, getChoice)).toBe("get");
expect(resolver.getFieldPropertyName(template, contractIdField)).not.toBe("contractId");
expect(resolver.getFieldPropertyName(template, constructorField)).not.toBe("constructor");
expect(iou.contractId).toBe("#iou-1");
```

Replace the existing negative `get` resolver assertion with the positive
assertion above. Update the generated-project consumer fixture to compile
`void first.get`, `void second.get`, `first.contractId`, and `second.contractId`.
Update its source assertion so the unsuffixed generated `get` field is proven,
not merely present in its input payload.

- [ ] **Step 2: Run tests to verify they fail**

Run: `rtk npm test -- tests/unit/daml-interface/type-script-name-resolver.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts tests/integration/daml-interface/generated-project-compilation.integration.test.ts`

Expected: FAIL because `get` remains reserved and emitted templates still expose the method.

- [ ] **Step 3: Implement the minimal resolver and migration changes**

Remove `get` from the TypeScript-keyword and template-member reserved-name
sets. Update test interfaces, examples, and the older design/plan language to
use `contractId` property access. Leave `contractId` and `constructor`
reserved.

- [ ] **Step 4: Run tests to verify they pass**

Run: `rtk npm test -- tests/unit/daml-interface/type-script-name-resolver.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts tests/integration/daml-interface/generated-project-compilation.integration.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-interface/emission/type-script-name-resolver.ts tests/unit/daml-interface/type-script-name-resolver.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts tests/integration/daml-interface/generated-project-compilation.integration.test.ts DOCUMENTATION.md docs/superpowers/specs/2026-07-29-daml-template-class-generator-design.md docs/superpowers/plans/2026-07-29-daml-template-class-generator-implementation-plan.md
rtk git commit -m "feat: generate DAML template contract ID properties"
```

### Task 3: Verify generated bindings end-to-end

**Files:**
- Verify: `tests/unit/daml-interface/daml-value-converter.test.ts`
- Verify: `tests/unit/daml-interface/type-script-name-resolver.test.ts`
- Verify: `tests/unit/daml-interface`
- Verify: `tests/integration/daml-interface`

- [ ] **Step 1: Run the focused generated-binding suite**

Run: `rtk npm test -- tests/unit/daml-interface tests/integration/daml-interface`

Expected: PASS, including emitted NodeNext project type-checking.

- [ ] **Step 2: Run build and scoped lint**

Run: `rtk npm run build && rtk npx eslint src/daml-interface tests/unit/daml-interface tests/integration/daml-interface --max-warnings=0 && rtk git diff --check`

Expected: all commands pass.

- [ ] **Step 3: Commit documentation-only corrections if needed**

```bash
rtk git status --short
```

Expected: only unrelated pre-existing local changes remain.
