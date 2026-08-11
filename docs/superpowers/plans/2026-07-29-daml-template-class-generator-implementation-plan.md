# DAML Template Class Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate collision-safe, typed DAML contract and choice-event classes that materialize from the SDK’s gRPC, PQS, and JSON-shaped results without unsafe casts.

**Architecture:** Preserve complete DAML-LF type structure during archive analysis and resolve type constructors through the compilation. A reusable `daml-interface` runtime normalizes source envelopes and converts either Ledger API protobuf values or already-JSON/PQS payloads using emitted descriptors. Each generated template then calls that runtime to construct an instance extending `DamlTemplate`; generated choice-event classes represent the typed exercise result. Generated output imports the public runtime through the literal `@distrohelena/canton-typescript-sdk/daml-interface` package subpath and uses a generated descriptor registry with lazy lookup to resolve referenced and recursive named types.

**Tech Stack:** TypeScript 5.9, Vitest 3, protobuf-ts Ledger API v2 messages, existing DAML-LF archive model, Node ESM.

---

## File structure

| Path | Responsibility |
| --- | --- |
| `src/daml-lf/model/daml-lf-builtin-type.ts` | Complete serializable DAML-LF builtin type discriminants. |
| `src/daml-lf/model/daml-lf-type.ts` | Recursive type applications and type-constructor arguments. |
| `src/daml-lf/model/daml-lf-data-type.ts` | Record/variant/enum constructor shape retained from archives. |
| `src/daml-lf/model/lf-2-model-mapper.ts` | Maps archive type applications and data constructors without discarding arguments. |
| `src/daml-lf/daml-lf-compilation.ts`, `src/daml-lf/semantics/daml-lf-semantic-model.ts` | Recursively validate and resolve referenced data types. |
| `src/daml-interface/analysis/*` | Converts resolved DAML-LF types and named data definitions to generator-safe descriptor metadata and detects generation-time naming collisions. |
| `src/daml-interface/runtime/*` (new) | Public base class, source normalizer, descriptor-driven value conversion, and focused errors. |
| `src/daml-interface/emission/type-script-name-resolver.ts` | Stable package/module paths, namespace aliases, safe identifiers, and deterministic collision suffixes. |
| `src/daml-interface/emission-model/*`, `named-type-emitter.ts` (new), `template-binding-emitter.ts`, `registry-emitter.ts`, `support-file-emitter.ts` | Emits named record/variant/enum declarations, a lazy descriptor registry, instance classes, choice-event classes, runtime re-export, full-identity registry, and namespaced root barrel. |
| `src/daml-interface/index.ts` | Publicly exports the runtime consumed by generated projects. |
| `tests/unit/daml-lf/*`, `tests/unit/daml-interface/*`, `tests/integration/daml-interface/*` | Parser, conversion, emission, collision, compilation, and materialization coverage. |

Do not modify the root `README.md`, root `package.json`, or `test.txt`; they are unrelated pre-existing worktree changes.

### Task 1: Retain the complete serializable DAML-LF type shape

**Files:**
- Modify: `src/daml-lf/model/daml-lf-builtin-type.ts`
- Modify: `src/daml-lf/model/daml-lf-type.ts`
- Modify: `src/daml-lf/model/daml-lf-data-type.ts`
- Modify: `src/daml-lf/model/lf-2-model-mapper.ts`
- Modify: `tests/unit/daml-lf/lf-2-model-mapper.test.ts`
- Test: `tests/unit/daml-lf/lf-2-model-mapper.test.ts`

- [ ] **Step 1: Add failing mapper cases for all Ledger API serializable forms.**

  Construct LF2 archive fixtures containing `Unit`, `Bool`, `Int64`, `Date`, `Timestamp`, `Numeric`, `Party`, `Text`, `ContractId`, `Optional`, `List`, `TextMap`, `GenMap`, records, variants, and enums. Assert that mapped types retain their builtin/type-constructor identity and ordered type arguments.

- [ ] **Step 2: Run the focused mapper tests.**

  Run: `rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts`

  Expected: FAIL because the current mapper reduces all but four primitives to `unknown` and drops application arguments.

- [ ] **Step 3: Extend the LF model minimally.**

  Add serializable builtin enum members and make `DamlLfType` retain immutable `typeArguments`. Make `DamlLfDataType` retain a discriminated definition shape: record fields, variant constructor names plus argument types, or enum constructor names. Do not model non-serializable `Any`, `Update`, arrows, or type representations as supported generator inputs.

- [ ] **Step 4: Map type applications and data constructors recursively.**

  In `Lf2ModelMapper.mapType`, flatten `tapp` into its application head and ordered arguments. Map all serializable `BuiltinType` values. In `mapDataType`, map record, variant, and enum data constructors rather than replacing non-record definitions with an empty field list.

- [ ] **Step 5: Re-run focused mapper tests.**

  Run: `rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit the self-contained model change.**

  ```bash
  rtk git add src/daml-lf/model tests/unit/daml-lf/lf-2-model-mapper.test.ts
  rtk git commit -m "feat: retain DAML LF serializable type shapes"
  ```

### Task 2: Resolve recursive DAML descriptors for generation

**Files:**
- Modify: `src/daml-lf/daml-lf-compilation.ts`
- Modify: `src/daml-lf/semantics/daml-lf-semantic-model.ts`
- Create: `src/daml-interface/analysis/analyzed-daml-type.ts`
- Create: `src/daml-interface/analysis/analyzed-daml-type-definition.ts`
- Modify: `src/daml-interface/analysis/analyzed-template.ts`
- Modify: `src/daml-interface/analysis/analyzed-choice.ts`
- Modify: `src/daml-interface/analysis/daml-interface-analyzer.ts`
- Modify: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`
- Test: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`

- [ ] **Step 1: Write failing analyzer tests for nested types and named records.**

  Cover `Optional Text`, `List (ContractId Trade)`, a referenced record, a referenced variant, an enum, and a mutually recursive named record pair. Assert that analysis returns recursive descriptors, including DAML field labels and resolved constructor identity, rather than `unknown`, and that the analysis result exports every modeled named type definition once.

- [ ] **Step 2: Run the analyzer test.**

  Run: `rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts`

  Expected: FAIL because `assertSupportedTypeOrThrow()` currently accepts only `Text`.

- [ ] **Step 3: Add immutable generator descriptors.**

  Define a closed `AnalyzedDamlType` union with primitive, contract-id, optional, list, text-map, gen-map, record, variant, enum, and named-reference cases. Define `AnalyzedDamlTypeDefinition` with one full identity and record/variant/enum shape. Record descriptors contain ordered `{ damlLabel, propertyName, type }` fields; variants contain constructor name and payload descriptor. Carry descriptors in `AnalyzedTemplateField` and `AnalyzedChoice`, and carry the complete modeled named-definition set in `DamlInterfaceAnalysisResult`.

- [ ] **Step 4: Resolve and validate types through the semantic model.**

  Add a semantic-model operation that returns the full `DamlLfDataType` for a `TypeConReference`. Recursively validate each type argument and referenced field/constructor type in `DamlLfCompilation`. During descriptor construction, register each named definition by its full identity before descending; emit `namedReference` nodes for repeats, so mutually recursive types terminate and are available to later emission.

- [ ] **Step 5: Replace text-only rejection with explicit supported-shape errors.**

  Accept every descriptor defined above. Reject only non-serializable builtins, missing/malformed type arguments, unresolved constructors, and unsupported higher-kinded/generic forms, with the template field or choice context in `DamlInterfaceUnsupportedShapeException`.

- [ ] **Step 6: Re-run the analyzer test.**

  Run: `rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts`

  Expected: PASS.

- [ ] **Step 7: Commit descriptor analysis.**

  ```bash
  rtk git add src/daml-lf/daml-lf-compilation.ts src/daml-lf/semantics src/daml-interface/analysis tests/unit/daml-interface/daml-interface-analyzer.test.ts
  rtk git commit -m "feat: analyze DAML template value descriptors"
  ```

### Task 3: Add the public generated-binding runtime and value converter

**Files:**
- Create: `src/daml-interface/runtime/daml-template.ts`
- Create: `src/daml-interface/runtime/daml-type-descriptor.ts`
- Create: `src/daml-interface/runtime/daml-value-converter.ts`
- Create: `src/daml-interface/runtime/daml-materialization-error.ts`
- Modify: `src/daml-interface/index.ts`
- Create: `tests/unit/daml-interface/daml-value-converter.test.ts`
- Test: `tests/unit/daml-interface/daml-value-converter.test.ts`

- [ ] **Step 1: Write failing unit tests for the base class and primitive conversion from both value encodings.**

  Assert `new DamlTemplate("cid").contractId` returns `cid` without exposing a mutable contract-ID field. For both protobuf `Value` and equivalent already-decoded JSON/PQS payloads, assert: `int64` becomes `bigint`; `numeric` becomes `new DamlNumeric(value)`; `party` becomes `new DamlParty(value)`; dates become `DamlDate`; timestamps become `DamlTimestamp`; and unit becomes `DamlUnit` according to the descriptor.

- [ ] **Step 2: Add failing nested conversion and mismatch cases.**

  Test optionals, lists, maps, labelled and positional records, variants, enums, contract IDs, absent values, wrong protobuf oneof kinds, wrong JSON scalar/object shapes, and invalid numeric/party content. Cover a `namedReference` resolved by a supplied lazy registry and a self-recursive record. Require errors to name the descriptor path such as `Iou.amount`.

- [ ] **Step 3: Run the converter test.**

  Run: `rtk npm test -- tests/unit/daml-interface/daml-value-converter.test.ts`

  Expected: FAIL because no generated-binding runtime exists.

- [ ] **Step 4: Implement descriptor types and `DamlTemplate`.**

  `DamlTemplate` must have only `#contractId`, a constructor receiving it, and a readonly `contractId: string` property. Export descriptor and materialization-error types from the `daml-interface` subpath. Reuse the existing root SDK value classes: `DamlNumeric`, `DamlParty`, `DamlDate`, `DamlTimestamp`, `DamlUnit`, `DamlRecord`, `DamlVariant`, `DamlEnum`, `DamlTextMap`, and `DamlGenMap`; do not introduce duplicate parallel values.

- [ ] **Step 5: Implement recursive protobuf and JSON/PQS value decoding.**

  Expose a single `decodeDamlValue(source, descriptor, registry, path)` entrypoint where `source` is discriminated as protobuf or JSON. Switch exhaustively on `Value.sum.oneofKind` for protobuf; for PQS/JSON validate native scalars, objects, arrays, map entries, variant envelopes, and enum constructors against the same descriptor. Resolve `namedReference` through a lazy registry keyed by full type identity, allowing recursive types. Do not return `unknown` and do not use `as` to bypass validation.

- [ ] **Step 6: Run the converter test.**

  Run: `rtk npm test -- tests/unit/daml-interface/daml-value-converter.test.ts`

  Expected: PASS.

- [ ] **Step 7: Commit the runtime.**

  ```bash
  rtk git add src/daml-interface/runtime src/daml-interface/index.ts tests/unit/daml-interface/daml-value-converter.test.ts
  rtk git commit -m "feat: add typed DAML generated-binding runtime"
  ```

### Task 4: Normalize gRPC, PQS, and JSON materialization sources

**Files:**
- Create: `src/daml-interface/runtime/daml-event-source-normalizer.ts`
- Modify: `src/daml-interface/index.ts`
- Create: `tests/unit/daml-interface/daml-event-source-normalizer.test.ts`
- Test: `tests/unit/daml-interface/daml-event-source-normalizer.test.ts`

- [ ] **Step 1: Write failing source-shape tests.**

  Cover raw generated `CreatedEvent` / `ExercisedEvent`, `GetContractResponse`, active-contract wrappers, `ContractResult`, `ExerciseResult` including its relation metadata, and camelCase/snake_case JSON equivalents. Use the same logical contract/event in each case and assert equal normalized identity and metadata, plus the correct payload encoding discriminator (`protobuf` for gRPC and `json` for PQS/JSON).

- [ ] **Step 2: Add failing invalid-source tests.**

  Assert a source with no event/payload, incomplete template identity, no contract ID, missing exercise result when required, or ambiguous nested event fails with `DamlMaterializationError` and a useful source-shape label.

- [ ] **Step 3: Run normalizer tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/daml-event-source-normalizer.test.ts`

  Expected: FAIL because no normalizer exists.

- [ ] **Step 4: Implement canonical normalized created and exercised structures.**

  Export structural input types accepting the SDK’s generated gRPC types, PQS result types, and JSON-like records. Normalize to immutable shapes with full `{ packageId, moduleName, entityName }`, contract ID, payload/argument/result as discriminated protobuf-or-JSON value sources, and available event metadata. Keep transport recognition and JSON envelope aliasing in this file only; the converter owns all descriptor-aware validation.

- [ ] **Step 5: Run normalizer tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/daml-event-source-normalizer.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit source normalization.**

  ```bash
  rtk git add src/daml-interface/runtime src/daml-interface/index.ts tests/unit/daml-interface/daml-event-source-normalizer.test.ts
  rtk git commit -m "feat: normalize DAML binding event sources"
  ```

### Task 5: Make generated names and paths collision-safe

**Files:**
- Modify: `src/daml-interface/emission/type-script-name-resolver.ts`
- Modify: `src/daml-interface/emission-model/generated-template-binding.ts`
- Modify: `src/daml-interface/emission-model/generated-choice-binding.ts`
- Create: `tests/unit/daml-interface/type-script-name-resolver.test.ts`
- Modify: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`
- Test: `tests/unit/daml-interface/type-script-name-resolver.test.ts`

- [ ] **Step 1: Write failing collision tests.**

  Create templates with the same short name in different packages/modules, module/field/choice labels that normalize to the same identifier, and labels `get`, `contractId`, `constructor`, and TypeScript keywords. Assert unique paths, namespace aliases, class/event names, property names, and constructor parameter names while retaining original DAML labels.

- [ ] **Step 2: Run name-resolver tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/type-script-name-resolver.test.ts`

  Expected: FAIL because paths omit package ID and normalizers have no collision table.

- [ ] **Step 3: Implement deterministic identity-derived names.**

  Use the full package/module/entity identity as the template key. Place each output under a package-qualified directory and append a stable short hash only when sanitized names collide. Reserve `DamlTemplate` members and TypeScript keywords. Add a pre-emission validation pass which reports both full identities if a remaining output-name collision is impossible to resolve safely.

- [ ] **Step 4: Run name-resolver tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/type-script-name-resolver.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit collision prevention.**

  ```bash
  rtk git add src/daml-interface/emission/type-script-name-resolver.ts src/daml-interface/emission-model tests/unit/daml-interface/type-script-name-resolver.test.ts tests/unit/daml-interface/daml-interface-analyzer.test.ts
  rtk git commit -m "feat: prevent generated DAML binding name collisions"
  ```

### Task 6: Emit named DAML declarations and a recursive descriptor registry

**Files:**
- Create: `src/daml-interface/emission/named-type-emitter.ts`
- Create: `src/daml-interface/emission-model/generated-named-type-file.ts`
- Modify: `src/daml-interface/emission/project-emitter.ts`
- Modify: `src/daml-interface/emission-model/generated-daml-interface-project.ts`
- Modify: `src/daml-interface/emission/support-file-emitter.ts`
- Create: `tests/unit/daml-interface/named-type-emitter.test.ts`
- Modify: `tests/unit/daml-interface/project-emitter.test.ts`
- Test: `tests/unit/daml-interface/named-type-emitter.test.ts`

- [ ] **Step 1: Write failing named-type emission tests.**

  Given reachable record, variant, enum, and mutually recursive definitions, assert emitted TypeScript declares a named readonly record interface, discriminated variant union, and enum-string union under a collision-safe package/module namespace. Assert `generated/support/descriptors.ts` registers every full type identity exactly once and uses lazy resolver functions for cross-references.

- [ ] **Step 2: Run the named-type emitter tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/project-emitter.test.ts`

  Expected: FAIL because generated projects currently contain only template files and no descriptor registry.

- [ ] **Step 3: Add named-type output models and emit declarations.**

  Extend `GeneratedDamlInterfaceProject` with named-type files and include them in `DamlInterfaceWriter`. Emit one `types.ts` module per collision-safe generated package/module directory. Use descriptor type aliases/imports from `generated/support/runtime.ts`; import referenced generated type modules through resolver-provided relative paths.

- [ ] **Step 4: Emit the project-wide lazy descriptor registry.**

  Make `SupportFileEmitter.emitSupportFiles(analysis)` create `generated/support/descriptors.ts`. It must export an immutable `DamlTypeDescriptorRegistry` whose lookup key is `packageId:moduleName:entityName` and whose descriptor factories resolve referenced named descriptors lazily. Template files import this registry; no template embeds an incomplete per-file registry.

- [ ] **Step 5: Re-run the named-type emitter tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/project-emitter.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit named-type and registry emission.**

  ```bash
  rtk git add src/daml-interface/emission/named-type-emitter.ts src/daml-interface/emission-model src/daml-interface/emission/project-emitter.ts src/daml-interface/emission/support-file-emitter.ts tests/unit/daml-interface/named-type-emitter.test.ts tests/unit/daml-interface/project-emitter.test.ts
  rtk git commit -m "feat: emit DAML type declarations and descriptors"
  ```

### Task 7: Emit template instances and choice-specific event classes

**Files:**
- Modify: `src/daml-interface/emission/template-binding-emitter.ts`
- Modify: `src/daml-interface/emission-model/generated-template-binding.ts`
- Modify: `src/daml-interface/emission-model/generated-choice-binding.ts`
- Modify: `tests/unit/daml-interface/template-binding-emitter.test.ts`
- Test: `tests/unit/daml-interface/template-binding-emitter.test.ts`

- [ ] **Step 1: Rewrite the emitter test as the new public contract.**

  Assert an emitted file imports generated support, exports a fields interface, exports `class Iou extends DamlTemplate implements IouFields`, has constructor signature `(contractId, issuer, owner)`, and emits `fromCreatedEvent` plus `fromExercisedEvent`. Assert a `IouTransferExercisedEvent` class exposes literal `choiceName`, `contractId`, typed `argument`, typed `result`, `consuming`, and `metadata`. Assert legacy `create`, `exerciseTransfer`, and `decode*` strings are absent.

- [ ] **Step 2: Run the emitter test.**

  Run: `rtk npm test -- tests/unit/daml-interface/template-binding-emitter.test.ts`

  Expected: FAIL because current output is static-helper based.

- [ ] **Step 3: Emit descriptor literals and the instance constructor.**

  Generate a private template descriptor with the complete full template identity and ordered field descriptors, referring to named types by full identity. Import the project-wide lazy descriptor registry from generated support. `fromCreatedEvent` calls the runtime normalizer/converter, validates identity, and invokes the generated constructor in field order. The class implements the fields interface with readonly safe property names and imports any named TypeScript declarations from its generated `types.ts` module.

- [ ] **Step 4: Emit one class per choice and discriminate exercises.**

  Each generated event class owns a literal choice-name field and receives normalized metadata, decoded argument, decoded result, and consuming flag. `fromExercisedEvent` switches only on declared DAML choice labels and returns the exact class union; unknown choices throw the runtime materialization error.

- [ ] **Step 5: Run the emitter test.**

  Run: `rtk npm test -- tests/unit/daml-interface/template-binding-emitter.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit generated class emission.**

  ```bash
  rtk git add src/daml-interface/emission/template-binding-emitter.ts src/daml-interface/emission-model tests/unit/daml-interface/template-binding-emitter.test.ts
  rtk git commit -m "feat: emit typed DAML template classes"
  ```

### Task 8: Replace registry and barrel emission with full-identity namespaces

**Files:**
- Modify: `src/daml-interface/emission/registry-emitter.ts`
- Modify: `src/daml-interface/emission/support-file-emitter.ts`
- Modify: `tests/unit/daml-interface/registry-emitter.test.ts`
- Create: `tests/unit/daml-interface/support-file-emitter.test.ts`
- Test: `tests/unit/daml-interface/registry-emitter.test.ts`
- Test: `tests/unit/daml-interface/support-file-emitter.test.ts`

- [ ] **Step 1: Write failing registry and barrel tests.**

  Assert registry cases dispatch by full package/module/entity identity to `fromCreatedEvent` and `fromExercisedEvent`, not legacy decode methods. Assert the root index uses `export * as <packageModuleAlias>` entries and two same-named templates are both importable. Assert generated support re-exports the public runtime from the literal published SDK subpath `@distrohelena/canton-typescript-sdk/daml-interface` and all generated code imports only its stable local `./support/runtime.js` bridge.

- [ ] **Step 2: Run focused emitter tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/registry-emitter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts`

  Expected: FAIL because the existing registry uses `Module:Template` and the barrel flattens exports.

- [ ] **Step 3: Implement namespaced project output.**

  Have support emission write `generated/support/runtime.ts` that re-exports `@distrohelena/canton-typescript-sdk/daml-interface`. Registry APIs accept a full `TemplateId` object or canonical full string and use only materializer methods. The index re-exports template modules through resolver-provided namespace aliases, never `export *`. Keep the package specifier in one emitter constant with a regression assertion, so an SDK rename cannot silently leave generated output broken.

- [ ] **Step 4: Run focused emitter tests.**

  Run: `rtk npm test -- tests/unit/daml-interface/registry-emitter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit registry/barrel emission.**

  ```bash
  rtk git add src/daml-interface/emission/registry-emitter.ts src/daml-interface/emission/support-file-emitter.ts tests/unit/daml-interface/registry-emitter.test.ts tests/unit/daml-interface/support-file-emitter.test.ts
  rtk git commit -m "feat: namespace generated DAML binding exports"
  ```

### Task 9: Verify generated projects compile and materialize real sources

**Files:**
- Modify: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Modify: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`
- Create: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`
- Create: `tests/integration/daml-interface/generated-project-compilation.integration.test.ts`
- Modify: `DOCUMENTATION.md`
- Test: `tests/integration/daml-interface/generated-template-materialization.integration.test.ts`
- Test: `tests/integration/daml-interface/generated-project-compilation.integration.test.ts`

- [ ] **Step 1: Expand the archive fixture and write materialization tests.**

  Use a template with nested record/list/optional values and multiple choices. Generate its project into a temporary directory, then import the generated ESM module. Materialize the same contract from raw gRPC `CreatedEvent`, `GetContractResponse`, PQS `ContractResult`, and a JSON envelope; assert equal generated fields and `contractId`. Materialize each exercise form and assert the exact generated choice-event class.

- [ ] **Step 2: Write collision-project and typecheck tests.**

  Generate a DAR/workspace containing duplicate short template names and reserved labels. Run `tsc --noEmit` against a temporary NodeNext project importing both root namespaces and constructing/materializing both classes. The temporary project must declare `@distrohelena/canton-typescript-sdk` as a dependency and link that package name to this repository’s built `dist` output before compiling/importing. Assert typecheck exits zero and the generated source contains no identifier conflicts.

- [ ] **Step 3: Run the new integration tests.**

  Run: `rtk npm test -- tests/integration/daml-interface/generated-template-materialization.integration.test.ts tests/integration/daml-interface/generated-project-compilation.integration.test.ts`

  Expected: FAIL until generation, public runtime exports, and output import paths are complete.

- [ ] **Step 4: Add only the integration plumbing required by the tests.**

  Update fixture builders to express the supported archive shapes. Add a temporary-project helper that first runs or requires the repository build, writes generated files using `DamlInterfaceWriter`, writes a minimal NodeNext `package.json` and `tsconfig.json`, and creates `node_modules/@distrohelena/canton-typescript-sdk` as a link to the repository package root so Node and TypeScript resolve the actual `exports["./daml-interface"]` declaration and implementation. Keep source fixture construction local to DAML-interface tests and clean up only the explicitly created temporary directory.

- [ ] **Step 5: Update user documentation.**

  Replace static-helper examples with a generated-class example showing `Template.fromCreatedEvent(await client.contractService.getContractAsync(...))`, `contractId`, the full-identity registry, and a typed exercised-event result. State that generated projects depend on the SDK `./daml-interface` runtime subpath.

- [ ] **Step 6: Run integration tests.**

  Run: `rtk npm test -- tests/integration/daml-interface`

  Expected: PASS.

- [ ] **Step 7: Commit integration coverage and docs.**

  ```bash
  rtk git add tests/fixtures/daml-lf/sample-lf-package-fixture.ts tests/integration/daml-interface DOCUMENTATION.md
  rtk git commit -m "test: verify generated DAML template materialization"
  ```

### Task 10: Run the complete quality gate

**Files:**
- Modify only if a reported failure is within this feature’s files.
- Test: `tests/unit/daml-interface/*`
- Test: `tests/unit/daml-lf/lf-2-model-mapper.test.ts`
- Test: `tests/integration/daml-interface/*`

- [ ] **Step 1: Run all focused DAML-LF and generator tests.**

  Run: `rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts tests/unit/daml-interface tests/integration/daml-interface`

  Expected: PASS.

- [ ] **Step 2: Run static checks and full build.**

  Run: `rtk npm run lint && rtk npm run build`

  Expected: both commands exit 0.

- [ ] **Step 3: Inspect the complete feature diff.**

  Run: `rtk git diff --check && rtk git status --short`

  Expected: no whitespace errors; no unrelated `README.md`, `package.json`, or `test.txt` changes staged by this work.

- [ ] **Step 4: Record verification results in the final implementation handoff.**

  Include exact test/build commands, commit IDs, the supported value surface, the generated package dependency requirement, and any explicitly rejected non-serializable DAML-LF forms.
