# DAML Generic Named Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, type, and materialize concrete applications of generic DAML records and variants, including Vault Base's `SplitUnderlying` choice result.

**Architecture:** Preserve LF type-variable binders through the DAML-LF model, analyze named applications with lexical parameter scopes, and render TypeScript generic declarations/applications. Runtime descriptors carry application arguments; descriptor factories substitute them through a static registry so the existing protobuf/PQS/JSON decoder remains the single conversion path.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated LF 2 archive types, generated NodeNext TypeScript bindings.

---

### Task 1: Retain LF generic binders and type variables

**Files:**
- Modify: `src/daml-lf/model/daml-lf-type.ts`
- Modify: `src/daml-lf/model/daml-lf-data-type.ts`
- Modify: `src/daml-lf/model/lf-2-model-mapper.ts`
- Test: `tests/unit/daml-lf/lf-2-model-mapper.test.ts`

- [ ] **Step 1: Write failing mapper tests**

Create a minimal LF 2 package with `Box a` and a `Type.var` field, plus a concrete `Box Text` application and a `Type.forall` field. Assert that the mapped data type exposes `a`, that the field exposes a type-variable reference, that the application preserves `Text` as its single type argument, and that the `forall` marker is retained rather than unwrapped.

- [ ] **Step 2: Run the focused mapper test**

Run: `rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts`

Expected: FAIL because mapper currently maps `Type.var` to `unknown` and drops `DefDataType.params`.

- [ ] **Step 3: Add immutable model fields and mapper support**

Add data-type parameter metadata with the resolved binder name and kind. Add a `typeVariable` field and a diagnostic-only `forall` marker to `DamlLfType`; do not unwrap `Type.forall`. Map `Type.var.varInternedStr` through `internedStrings`; preserve and map its arguments. Map `DefDataType.params` through the same resolver. Keep invalid interned indices and unknown kind shapes representable so analysis can issue contextual errors.

- [ ] **Step 4: Re-run the mapper test**

Run: `rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-lf/model/daml-lf-type.ts src/daml-lf/model/daml-lf-data-type.ts src/daml-lf/model/lf-2-model-mapper.ts tests/unit/daml-lf/lf-2-model-mapper.test.ts
rtk git commit -m "feat: preserve LF generic type binders"
```

### Task 2: Analyze generic named declarations and applications

**Files:**
- Modify: `src/daml-interface/analysis/analyzed-daml-type.ts`
- Modify: `src/daml-interface/analysis/analyzed-daml-type-definition.ts`
- Modify: `src/daml-interface/analysis/daml-interface-analyzer.ts`
- Test: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`

- [ ] **Step 1: Write failing analyzer tests**

Cover `Box<Text>` as a choice result, an unbound type variable failure, a retained `forall` rejection with choice/field context, non-`*` parameter rejection, generic enum rejection, and an arity mismatch. Assert that `Box<Text>` produces a named reference containing one analyzed primitive type argument and that the resulting named declaration retains one safe generic parameter name.

- [ ] **Step 2: Run the analyzer test**

Run: `rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts`

Expected: FAIL with the current "generic named type applications are not supported" error.

- [ ] **Step 3: Add lexical generic analysis**

Add `typeVariable` and `typeArguments` to analyzed types and parameter metadata to analyzed named definitions. Thread a lexical binder map through recursive analysis. Validate parameter kind `*`, exact named application arity, and reject `forall`, applied type variables, unbound variables, and parameterized enums. Keep canonical named definitions keyed solely by identity; applications are values of the analyzed type, not duplicate definitions.

- [ ] **Step 4: Re-run the analyzer test**

Run: `rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-interface/analysis tests/unit/daml-interface/daml-interface-analyzer.test.ts
rtk git commit -m "feat: analyze generic DAML named applications"
```

### Task 3: Emit generic TypeScript declarations and applications

**Files:**
- Modify: `src/daml-interface/emission/named-type-emitter.ts`
- Modify: `src/daml-interface/emission/template-binding-emitter.ts`
- Test: `tests/unit/daml-interface/named-type-emitter.test.ts`
- Test: `tests/unit/daml-interface/template-binding-emitter.test.ts`

- [ ] **Step 1: Write failing emitter tests**

Assert `export interface Box<T>` with a `readonly value: T` field and a template choice return type `Box<string>`. Add an imported type-name collision with a generic parameter and assert the parameter is renamed safely while every use is updated.

- [ ] **Step 2: Run the focused emitter tests**

Run: `rtk npm test -- tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/template-binding-emitter.test.ts`

Expected: FAIL because current emitters only render bare named references and do not know type variables.

- [ ] **Step 3: Render generic declarations and applications**

Render generic parameter lists on record and variant aliases/interfaces. Render `typeVariable` references using their resolved safe names and render applications as `Box<Amount>` at use sites. Imports remain bare TypeScript symbols (`import type { Box, Amount }`); recursively collect named references inside application arguments. Keep direct imports when names do not collide; reuse existing readable namespace aliases only for collisions.

- [ ] **Step 4: Re-run emitter tests**

Run: `rtk npm test -- tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/template-binding-emitter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-interface/emission/named-type-emitter.ts src/daml-interface/emission/template-binding-emitter.ts tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/template-binding-emitter.test.ts
rtk git commit -m "feat: emit generic DAML TypeScript types"
```

### Task 4: Resolve generic runtime descriptors

**Files:**
- Modify: `src/daml-interface/runtime/daml-type-descriptor.ts`
- Modify: `src/daml-interface/runtime/daml-value-converter.ts`
- Modify: `src/daml-interface/emission/support-file-emitter.ts`
- Test: `tests/unit/daml-interface/daml-value-converter.test.ts`
- Test: `tests/unit/daml-interface/support-file-emitter.test.ts`

- [ ] **Step 1: Write failing descriptor tests**

Construct a generic `Box<T>` factory and a `Box<Text>` named-reference descriptor. Add self-recursive `Node<T>` and mutually recursive `Left<T>`/`Right<T>` descriptor cases. Assert the converter resolves argument descriptors, materializes a string-valued record, rejects missing/extra generic arguments, and independently handles two applications of the same identity with different arguments.

- [ ] **Step 2: Run focused descriptor tests**

Run: `rtk npm test -- tests/unit/daml-interface/daml-value-converter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts`

Expected: FAIL because named references have no argument descriptors and `resolve` accepts only identity.

- [ ] **Step 3: Add immutable generic factory resolution**

Extend `DamlNamedReferenceDescriptor` with `typeArguments`. Change registry resolution to `resolve(identity, typeArguments)` returning a concrete descriptor. Emit descriptor factories accepting one descriptor parameter per declaration parameter and substitute those variables lexically into emitted record/variant descriptors. Validate factory arity before constructing the descriptor; deep-freeze each concrete result. Update the converter to resolve using the application's ordered descriptors.

- [ ] **Step 4: Re-run descriptor tests**

Run: `rtk npm test -- tests/unit/daml-interface/daml-value-converter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/daml-interface/runtime src/daml-interface/emission/support-file-emitter.ts tests/unit/daml-interface/daml-value-converter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts
rtk git commit -m "feat: materialize generic DAML descriptors"
```

### Task 5: Verify recursive applications and Vault Base generation

**Files:**
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Modify: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`

- [ ] **Step 1: Write failing integration tests**

Add self-recursive `Node<T>`, mutually recursive `Left<T>`/`Right<T>`, and a generic variant fixture. Generate bindings, typecheck the NodeNext project, and materialize `Node<Text>` plus `Node<Int64>` independently and a nested `Left<Text> → Right<Text>` value. Add an integration test that generates `/home/helena/env/daml-ops/oz-research/vault-base/.daml/dist/vault-base-0.0.1.dar` and asserts it contains `SplitUnderlying<...>` rather than failing.

- [ ] **Step 2: Run the integration tests**

Run: `rtk npm test -- tests/integration/daml-interface/daml-interface-generator.integration.test.ts tests/integration/daml-interface/generated-template-materialization.integration.test.ts`

Expected: FAIL before the preceding implementation tasks and PASS afterward.

- [ ] **Step 3: Regenerate Vault Base bindings**

Run:

```bash
rtk node dist/daml-interface/cli/daml-interface-cli-main.js --input /home/helena/env/daml-ops/oz-research/vault-base/.daml/dist/vault-base-0.0.1.dar --output /home/helena/env/daml-ops/oz-research/vault-base/generated-templates
```

Expected: exit 0 and readable generated package directories.

- [ ] **Step 4: Run final verification**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts tests/unit/daml-interface tests/integration/daml-interface
rtk npm run build
rtk git diff --check
```

Expected: all selected tests and build pass; no whitespace errors.

- [ ] **Step 5: Commit**

```bash
rtk git add tests/fixtures/daml-lf/sample-lf-package-fixture.ts tests/integration/daml-interface
rtk git commit -m "test: cover generic DAML template generation"
```
