# Generated DAML File Specs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit one runnable, colocated Node `*.spec.ts` file for every non-spec production module in a generated DAML TypeScript project.

**Architecture:** Add spec artifacts to the generated-project model and writer, then add a dedicated static-class test-spec emitter. It will use separate TypeScript-value and JSON-ledger-value sample emitters built from analyzed DAML types. `ProjectEmitter` produces all production modules first (including registry and index), then emits specs for that completed set. Integration helpers will compile the specs and recursively execute compiled specs with Node's native test runner.

**Tech Stack:** TypeScript, Node `node:test`, `node:assert/strict`, Vitest integration tests, DAML LF analysis/emission model.

---

### Task 1: Model and write generated spec artifacts

**Files:**
- Create: `src/daml-interface/emission-model/generated-spec-file.ts`
- Modify: `src/daml-interface/emission-model/generated-daml-interface-project.ts`
- Modify: `src/daml-interface/writing/daml-interface-writer.ts`
- Modify: `tests/unit/daml-interface/project-emitter.test.ts`
- Create: `tests/unit/daml-interface/daml-interface-writer.test.ts`

- [ ] **Step 1: Write failing model/writer tests**

Add a project containing one production template file and one `GeneratedSpecFile`. Assert the project preserves `specFiles`, and `DamlInterfaceWriter.writeProjectAsync` writes both paths. Assert a spec path ending in `.spec.ts` is accepted as an artifact and is never included in the production-source enumeration introduced by this task.

```ts
expect(project.specFiles.map((file) => file.path)).toEqual([
    "generated/packages/sample/iou.spec.ts",
]);
await expect(readFile(join(output, "generated/packages/sample/iou.spec.ts"), "utf8"))
    .resolves.toContain("node:test");
```

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- tests/unit/daml-interface/project-emitter.test.ts tests/unit/daml-interface/daml-interface-writer.test.ts`

Expected: FAIL because `specFiles` and `GeneratedSpecFile` do not exist.

- [ ] **Step 3: Implement the artifact model and writer support**

Create the immutable artifact class:

```ts
export class GeneratedSpecFile {
    public constructor(
        public readonly path: string,
        public readonly contents: string,
        public readonly productionPath: string,
    ) {}
}
```

Extend `GeneratedDamlInterfaceProject` with `readonly specFiles`, defaulting to `[]`, and an explicit `productionFiles` collection that contains only template, named-type, support, registry, and index modules. Extend `DamlInterfaceWriter`'s existing artifact list with `...project.specFiles`.

- [ ] **Step 4: Run focused tests and lint**

Run: `npm test -- tests/unit/daml-interface/project-emitter.test.ts tests/unit/daml-interface/daml-interface-writer.test.ts`

Run: `npm exec -- eslint src/daml-interface/emission-model/generated-spec-file.ts src/daml-interface/emission-model/generated-daml-interface-project.ts src/daml-interface/writing/daml-interface-writer.ts tests/unit/daml-interface/project-emitter.test.ts tests/unit/daml-interface/daml-interface-writer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/emission-model/generated-spec-file.ts src/daml-interface/emission-model/generated-daml-interface-project.ts src/daml-interface/writing/daml-interface-writer.ts tests/unit/daml-interface/project-emitter.test.ts tests/unit/daml-interface/daml-interface-writer.test.ts
git commit -m "feat: model generated DAML specs"
```

### Task 2: Synthesize finite TypeScript and ledger event samples

**Files:**
- Create: `src/daml-interface/emission/generated-test-sample-emitter.ts`
- Modify: `src/daml-interface/analysis/analyzed-daml-type.ts` only if an existing analyzed type lacks data needed for field labels/variant constructors
- Create: `tests/unit/daml-interface/generated-test-sample-emitter.test.ts`

- [ ] **Step 1: Write failing sample-emitter tests**

Cover both output representations from the same analyzed type:

- TypeScript samples use `DamlNumeric`, `DamlParty`, `DamlDate`, `DamlTimestamp`, `DamlUnit`, `bigint`, generated records, and generated variants.
- Ledger samples use int64/numeric strings, `{}` unit, labelled records, `{ tag, value }` variants, JSON text maps, and generic-map pairs.
- A generic `Node<string>` and `Node<bigint>` are independently instantiated.
- A finite optional-recursive type terminates at the configured depth.
- Strict `Loop { next: Loop }` throws an error including the DAML identity and value path.

```ts
expect(samples.emitLedgerValueOrThrow(nodeText, context)).toEqual({
    label: "sample-text",
    next: undefined,
});
expect(() => samples.emitLedgerValueOrThrow(strictLoop, context)).toThrow(
    "Sample.Module:Loop",
);
```

- [ ] **Step 2: Run the sample-emitter test to verify failure**

Run: `npm test -- tests/unit/daml-interface/generated-test-sample-emitter.test.ts`

Expected: FAIL because the emitter does not exist.

- [ ] **Step 3: Implement separate sample emitters in one static class**

Implement `GeneratedTestSampleEmitter` as a static-only class. Its public static operations must separately return TypeScript expression source and JSON ledger-value expression source; do not expose module-level functions. Carry an immutable recursion context with expanded type identities, generic bindings, and path segments. At the depth boundary, choose only an optional/empty collection/finite variant escape. If none exists, throw `DamlInterfaceEmissionError` (or the repository’s existing emission error type) with identity and path.

Implement helpers for all analyzed descriptor kinds, including `typeVariable` lookup and named references with concrete type arguments. Emit source imports through explicit dependency collection rather than hard-coding generated package paths.

- [ ] **Step 4: Run focused tests and build**

Run: `npm test -- tests/unit/daml-interface/generated-test-sample-emitter.test.ts tests/unit/daml-interface/daml-interface-analyzer.test.ts`

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/emission/generated-test-sample-emitter.ts src/daml-interface/analysis/analyzed-daml-type.ts tests/unit/daml-interface/generated-test-sample-emitter.test.ts
git commit -m "feat: synthesize generated DAML test samples"
```

### Task 3: Emit colocated specs for production modules

**Files:**
- Create: `src/daml-interface/emission/generated-spec-emitter.ts`
- Modify: `src/daml-interface/emission/project-emitter.ts`
- Modify: `src/daml-interface/emission/template-binding-emitter.ts` only to expose existing resolved field/choice metadata needed by the spec emitter
- Modify: `src/daml-interface/emission/named-type-emitter.ts` only to expose existing declaration metadata needed by the spec emitter
- Modify: `tests/unit/daml-interface/project-emitter.test.ts`
- Create: `tests/unit/daml-interface/generated-spec-emitter.test.ts`

- [ ] **Step 1: Write failing spec-emitter tests**

Use the materialization, generic-recursive, collision, and opaque-contract-ID fixture archives. Assert:

- every `project.productionFiles` path has exactly one sibling path obtained by replacing `.ts` with `.spec.ts`;
- no spec has its own spec;
- template specs import `node:test`, `node:assert/strict`, their sibling module, call `fromCreatedEvent`, and emit one `fromExercisedEvent` case per choice;
- named-type specs include compile-time `satisfies` assignments for records and every variant constructor;
- support, registry, namespace, and index specs import and exercise their corresponding generated module;
- generated specs never mention unresolved external types where the production module intentionally uses `string` contract IDs.

- [ ] **Step 2: Run the focused tests to verify failure**

Run: `npm test -- tests/unit/daml-interface/generated-spec-emitter.test.ts tests/unit/daml-interface/project-emitter.test.ts`

Expected: FAIL because no specs are emitted.

- [ ] **Step 3: Implement `GeneratedSpecEmitter` and wire it last in `ProjectEmitter`**

Implement a static-class-based emitter that receives the completed project plus analysis metadata and returns `GeneratedSpecFile[]`. It must be called only after `registryFile` and `indexFile` exist:

```ts
const completedProject = new GeneratedDamlInterfaceProject({
    templateFiles, namedTypeFiles, supportFiles, registryFile, indexFile,
});
return new GeneratedDamlInterfaceProject({
    ...completedProject,
    specFiles: GeneratedSpecEmitter.emitOrThrow(completedProject, analysis),
});
```

Use relative `.js` imports from specs to their production module. Template event fixtures must use the ledger-value emitter and contain explicit JSON event metadata; TypeScript type samples must use the TypeScript-value emitter. Do not generate package metadata, scripts, test configuration, or third-party test imports.

- [ ] **Step 4: Run focused tests and build**

Run: `npm test -- tests/unit/daml-interface/generated-spec-emitter.test.ts tests/unit/daml-interface/project-emitter.test.ts tests/unit/daml-interface/template-binding-emitter.test.ts tests/unit/daml-interface/named-type-emitter.test.ts`

Run: `npm run build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/emission/generated-spec-emitter.ts src/daml-interface/emission/project-emitter.ts src/daml-interface/emission/template-binding-emitter.ts src/daml-interface/emission/named-type-emitter.ts tests/unit/daml-interface/generated-spec-emitter.test.ts tests/unit/daml-interface/project-emitter.test.ts
git commit -m "feat: emit generated DAML file specs"
```

### Task 4: Compile and run generated project specs end to end

**Files:**
- Modify: `tests/integration/daml-interface/generated-project-test-helper.ts`
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-project-compilation.integration.test.ts`

- [ ] **Step 1: Write failing integration assertions**

Extend `generateTemporaryProjectAsync` tests to assert every production source has exactly one sibling spec. Include `generated/**/*.spec.ts` in the temporary project compiler input. Add a helper that recursively finds compiled `.spec.js` files under `dist/generated` and invokes `node --test` with explicit paths. Add a test that verifies the generated specs execute successfully for the materialization and generic-recursive fixtures.

Add the same assertions to the configured Vault Base test: it must confirm every emitted production file has a spec and execute the compiled Vault Base specs when `DAML_INTERFACE_VAULT_BASE_DAR` is configured.

- [ ] **Step 2: Run the integration tests to verify failure**

Run: `DAML_INTERFACE_VAULT_BASE_DAR=/home/helena/env/daml-ops/oz-research/vault-base/.daml/dist/vault-base-0.0.1.dar npm test -- tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts tests/integration/daml-interface/generated-project-compilation.integration.test.ts`

Expected: FAIL until generated specs exist, compile, and execute.

- [ ] **Step 3: Implement compile-and-run helper behavior**

Use Node `readdir` recursion or `glob`-free directory traversal in the SDK test helper, then call `execFileSync(process.execPath, ["--test", ...specPaths])`. Preserve the helper’s `try`/`catch` cleanup so temporary output is always removed. Do not use shell globstar or create a generated `package.json`.

- [ ] **Step 4: Run integration suite, build, and focused lint**

Run: `DAML_INTERFACE_VAULT_BASE_DAR=/home/helena/env/daml-ops/oz-research/vault-base/.daml/dist/vault-base-0.0.1.dar npm test -- tests/unit/daml-interface tests/integration/daml-interface`

Run: `npm run build`

Run: `npm exec -- eslint src/daml-interface/emission-model/generated-spec-file.ts src/daml-interface/emission/generated-test-sample-emitter.ts src/daml-interface/emission/generated-spec-emitter.ts src/daml-interface/emission/project-emitter.ts src/daml-interface/writing/daml-interface-writer.ts tests/unit/daml-interface tests/integration/daml-interface`

Run: `git diff --check`

Expected: PASS; the full repository lint/test baseline is outside this task and should be reported separately if it still fails.

- [ ] **Step 5: Commit**

```bash
git add tests/integration/daml-interface/generated-project-test-helper.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts tests/integration/daml-interface/generated-project-compilation.integration.test.ts
git commit -m "test: execute generated DAML specs"
```

### Task 5: Regenerate and inspect Vault Base output

**Files:**
- External output: `/home/helena/env/daml-ops/oz-research/vault-base/generated-templates`

- [ ] **Step 1: Regenerate the user’s DAR**

Run:

```bash
node dist/daml-interface/cli/daml-interface-cli-main.js --input /home/helena/env/daml-ops/oz-research/vault-base/.daml/dist/vault-base-0.0.1.dar --output /home/helena/env/daml-ops/oz-research/vault-base/generated-templates
```

- [ ] **Step 2: Verify generated sibling specs**

Verify `test-underlying-holding.spec.ts` exists beside
`test-underlying-holding.ts`, `types.spec.ts` exists beside `types.ts`, and
support/index/registry output has the same pairing. Inspect the
`SplitUnderlying` spec to ensure it checks the `Tuple2<string, string>` result.

- [ ] **Step 3: Report external output without committing it in this repository**

Do not stage the external generated directory. Confirm `git status --short`
contains only the pre-existing user `package.json` change and the implementation
commits in this repository.
