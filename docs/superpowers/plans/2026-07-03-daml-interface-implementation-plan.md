# DAML Interface Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `canton-typescript-sdk/daml-interface` subpath that uses `daml-lf` to generate ethers-style TypeScript bindings from `DAR` and `DALF` inputs, including per-template classes, typed create/exercise helpers, typed event decoders, a registry, and a CLI that writes files to disk.

**Architecture:** Extend `daml-lf` first so it can represent templates, choices, and richer type metadata through the public model and semantic layer. Then build `daml-interface` on top of those semantic APIs with a strict analyzer, an intermediate emission model, a TypeScript emitter, a disk writer, and a CLI. Keep one file per template, shared support files, a registry file, and an index file as the default output layout.

**Tech Stack:** TypeScript, Vitest, existing `daml-lf` package, existing Canton SDK types, `fflate` for archive loading reuse, Node filesystem and path APIs

---

## File Structure

### New `daml-interface` package surface

- Create: `src/daml-interface/index.ts`
- Modify: `package.json`
- Test: `tests/unit/daml-interface/package-shape.test.ts`

### `daml-lf` model and semantic extensions required by the generator

- Modify: `src/daml-lf/index.ts`
- Modify: `src/daml-lf/model/daml-lf-node-kind.ts`
- Modify: `src/daml-lf/model/daml-lf-type.ts`
- Modify: `src/daml-lf/model/daml-lf-data-type.ts`
- Create: `src/daml-lf/model/daml-lf-template.ts`
- Create: `src/daml-lf/model/daml-lf-choice.ts`
- Create: `src/daml-lf/model/daml-lf-choice-parameter.ts`
- Create: `src/daml-lf/model/daml-lf-template-id.ts`
- Modify: `src/daml-lf/model/lf-2-model-mapper.ts`
- Modify: `src/daml-lf/semantics/daml-lf-semantic-model.ts`
- Test: `tests/unit/daml-lf/template-semantic-model.test.ts`

### `daml-interface` errors and analysis layer

- Create: `src/daml-interface/errors/daml-interface-generation.exception.ts`
- Create: `src/daml-interface/errors/daml-interface-unsupported-shape.exception.ts`
- Create: `src/daml-interface/errors/daml-interface-write.exception.ts`
- Create: `src/daml-interface/analysis/analyzed-template.ts`
- Create: `src/daml-interface/analysis/analyzed-choice.ts`
- Create: `src/daml-interface/analysis/daml-interface-analyzer.ts`
- Test: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`

### `daml-interface` emission model

- Create: `src/daml-interface/emission-model/generated-daml-interface-project.ts`
- Create: `src/daml-interface/emission-model/generated-template-binding-file.ts`
- Create: `src/daml-interface/emission-model/generated-support-file.ts`
- Create: `src/daml-interface/emission-model/generated-registry-file.ts`
- Create: `src/daml-interface/emission-model/generated-template-binding.ts`
- Create: `src/daml-interface/emission-model/generated-choice-binding.ts`

### `daml-interface` TypeScript emission layer

- Create: `src/daml-interface/emission/type-script-name-resolver.ts`
- Create: `src/daml-interface/emission/template-binding-emitter.ts`
- Create: `src/daml-interface/emission/support-file-emitter.ts`
- Create: `src/daml-interface/emission/registry-emitter.ts`
- Create: `src/daml-interface/emission/project-emitter.ts`
- Test: `tests/unit/daml-interface/template-binding-emitter.test.ts`
- Test: `tests/unit/daml-interface/registry-emitter.test.ts`

### Generator and writer services

- Create: `src/daml-interface/daml-interface-generator-options.ts`
- Create: `src/daml-interface/daml-interface-generator.ts`
- Create: `src/daml-interface/writing/daml-interface-writer.ts`
- Test: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`

### CLI

- Create: `src/daml-interface/cli/daml-interface-cli.ts`
- Create: `src/daml-interface/cli/daml-interface-cli-options.ts`
- Create: `src/daml-interface/cli/daml-interface-cli-main.ts`
- Modify: `package.json`
- Test: `tests/unit/daml-interface/daml-interface-cli.test.ts`

### Docs

- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Scaffold The `./daml-interface` Package Surface

**Files:**
- Modify: `package.json`
- Create: `src/daml-interface/index.ts`
- Create: `src/daml-interface/errors/daml-interface-generation.exception.ts`
- Create: `src/daml-interface/errors/daml-interface-unsupported-shape.exception.ts`
- Create: `src/daml-interface/errors/daml-interface-write.exception.ts`
- Test: `tests/unit/daml-interface/package-shape.test.ts`

- [ ] **Step 1: Write the failing package-shape test**

Add assertions like:

```ts
const module = await import("../../../src/daml-interface/index.js");

expect(module.DamlInterfaceGenerator).toBeTypeOf("function");
expect(module.DamlInterfaceWriter).toBeTypeOf("function");
expect(module.DamlInterfaceGenerationException).toBeTypeOf("function");
```

Also assert the root SDK still does not export these generator types:

```ts
const rootModule = await import("../../../src/index.js");

expect(rootModule).not.toHaveProperty("DamlInterfaceGenerator");
expect(rootModule).not.toHaveProperty("DamlInterfaceWriter");
```

- [ ] **Step 2: Run the package-shape test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/package-shape.test.ts
```

Expected:

- `FAIL`
- missing `src/daml-interface/index.ts`
- missing subpath export

- [ ] **Step 3: Add the subpath export, placeholder services, and exception classes**

Update `package.json` with:

```json
"./daml-interface": {
    "types": "./dist/daml-interface/index.d.ts",
    "import": "./dist/daml-interface/index.js"
}
```

Create a minimal `src/daml-interface/index.ts` that exports:

- placeholder `DamlInterfaceGenerator`
- placeholder `DamlInterfaceWriter`
- generator exception classes

- [ ] **Step 4: Run the package-shape test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add package.json src/daml-interface tests/unit/daml-interface/package-shape.test.ts
git commit -m "feat: scaffold daml interface package surface"
```

## Task 2: Extend `daml-lf` To Expose Templates, Choices, And Semantic Shape

**Files:**
- Modify: `src/daml-lf/index.ts`
- Modify: `src/daml-lf/model/daml-lf-node-kind.ts`
- Modify: `src/daml-lf/model/daml-lf-type.ts`
- Modify: `src/daml-lf/model/daml-lf-data-type.ts`
- Create: `src/daml-lf/model/daml-lf-template.ts`
- Create: `src/daml-lf/model/daml-lf-choice.ts`
- Create: `src/daml-lf/model/daml-lf-choice-parameter.ts`
- Create: `src/daml-lf/model/daml-lf-template-id.ts`
- Modify: `src/daml-lf/model/lf-2-model-mapper.ts`
- Modify: `src/daml-lf/semantics/daml-lf-semantic-model.ts`
- Test: `tests/unit/daml-lf/template-semantic-model.test.ts`

- [ ] **Step 1: Write the failing `daml-lf` template semantics test**

Use a synthetic or manually constructed public model with a template and one choice. Add assertions like:

```ts
const semanticModel = compilation.createSemanticModel();

expect(
    semanticModel.getTemplates().map((template) => template.name),
).toEqual(["Iou"]);

expect(
    semanticModel.getTemplateChoicesOrThrow(templateId).map((choice) => choice.name),
).toEqual(["Transfer"]);
```

Also assert field and choice parameter typing is exposed:

```ts
expect(template.fields.map((field) => field.name)).toEqual(["issuer", "owner", "amount"]);
expect(choice.parameter.name).toBe("newOwner");
```

- [ ] **Step 2: Run the template semantics test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/template-semantic-model.test.ts
```

Expected:

- `FAIL`
- missing template classes
- missing semantic helpers

- [ ] **Step 3: Add the public template and choice model to `daml-lf`**

Add immutable classes for:

- template identity
- template metadata
- template fields
- choices
- choice parameters

Update the LF 2.x mapper to map template definitions into the public model.

Update `DamlLfSemanticModel` to expose generator-facing queries such as:

```ts
getTemplates(): readonly DamlLfTemplate[]
getTemplateChoicesOrThrow(templateId: DamlLfTemplateId): readonly DamlLfChoice[]
```

Do not add generator logic here. Only expose semantic shape.

- [ ] **Step 4: Run the template semantics test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/template-semantic-model.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-lf tests/unit/daml-lf/template-semantic-model.test.ts
git commit -m "feat: extend daml lf template semantics"
```

## Task 3: Build The Strict Interface Analysis Layer

**Files:**
- Create: `src/daml-interface/analysis/analyzed-template.ts`
- Create: `src/daml-interface/analysis/analyzed-choice.ts`
- Create: `src/daml-interface/analysis/daml-interface-analyzer.ts`
- Create: `src/daml-interface/daml-interface-generator-options.ts`
- Create: `src/daml-interface/daml-interface-generator.ts`
- Test: `tests/unit/daml-interface/daml-interface-analyzer.test.ts`

- [ ] **Step 1: Write the failing analyzer test**

Create a test that feeds template-rich `daml-lf` objects into the analyzer and asserts extracted generator concepts:

```ts
const result = new DamlInterfaceAnalyzer().analyzeOrThrow(compilation);

expect(result.templates).toHaveLength(1);
expect(result.templates[0].className).toBe("Iou");
expect(result.templates[0].createFields.map((field) => field.name)).toEqual([
    "issuer",
    "owner",
    "amount",
]);
expect(result.templates[0].choices.map((choice) => choice.name)).toEqual([
    "Transfer",
]);
```

Also add a strict-failure test:

```ts
expect(() => analyzer.analyzeOrThrow(unsupportedCompilation)).toThrow(
    DamlInterfaceUnsupportedShapeException,
);
```

- [ ] **Step 2: Run the analyzer test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts
```

Expected:

- `FAIL`
- missing analyzer classes

- [ ] **Step 3: Implement the strict analyzer**

Create:

- `AnalyzedTemplate`
- `AnalyzedChoice`
- `DamlInterfaceAnalyzer`

The analyzer should:

- consume `DamlLfCompilation` and `DamlLfSemanticModel`
- extract template fields and choices
- normalize names for generated class and file naming
- throw on unsupported shapes

- [ ] **Step 4: Run the analyzer test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/daml-interface-analyzer.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/analysis src/daml-interface/errors src/daml-interface/daml-interface-generator-options.ts src/daml-interface/daml-interface-generator.ts tests/unit/daml-interface/daml-interface-analyzer.test.ts
git commit -m "feat: add daml interface analyzer"
```

## Task 4: Add The Emission Model And Per-Template Emitter

**Files:**
- Create: `src/daml-interface/emission-model/generated-daml-interface-project.ts`
- Create: `src/daml-interface/emission-model/generated-template-binding-file.ts`
- Create: `src/daml-interface/emission-model/generated-support-file.ts`
- Create: `src/daml-interface/emission-model/generated-registry-file.ts`
- Create: `src/daml-interface/emission-model/generated-template-binding.ts`
- Create: `src/daml-interface/emission-model/generated-choice-binding.ts`
- Create: `src/daml-interface/emission/type-script-name-resolver.ts`
- Create: `src/daml-interface/emission/template-binding-emitter.ts`
- Test: `tests/unit/daml-interface/template-binding-emitter.test.ts`

- [ ] **Step 1: Write the failing template emitter test**

Create a test that emits a single template binding and asserts the generated source contains the expected ethers-style surface:

```ts
const file = new TemplateBindingEmitter().emitTemplateFile(analyzedTemplate);

expect(file.path).toBe("generated/main/iou.ts");
expect(file.contents).toContain("export class Iou");
expect(file.contents).toContain("public static readonly templateId");
expect(file.contents).toContain("public static create(");
expect(file.contents).toContain("public static exerciseTransfer(");
expect(file.contents).toContain("public static decodeCreatedEvent(");
```

- [ ] **Step 2: Run the emitter test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/template-binding-emitter.test.ts
```

Expected:

- `FAIL`
- missing emission-model and emitter classes

- [ ] **Step 3: Implement the emission model and template emitter**

Build a small intermediate output model and a single-template emitter that produces:

- one file per template
- static-heavy class
- typed create fields
- typed choice payloads
- typed created and exercised event wrapper types

The emitter should not write files yet.

- [ ] **Step 4: Run the emitter test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/template-binding-emitter.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/emission-model src/daml-interface/emission tests/unit/daml-interface/template-binding-emitter.test.ts
git commit -m "feat: add template binding emitter"
```

## Task 5: Add Support Files, Registry Emission, And Project Assembly

**Files:**
- Create: `src/daml-interface/emission/support-file-emitter.ts`
- Create: `src/daml-interface/emission/registry-emitter.ts`
- Create: `src/daml-interface/emission/project-emitter.ts`
- Modify: `src/daml-interface/daml-interface-generator.ts`
- Test: `tests/unit/daml-interface/registry-emitter.test.ts`
- Test: `tests/integration/daml-interface/daml-interface-generator.integration.test.ts`

- [ ] **Step 1: Write the failing registry and project-generation tests**

Add a registry-emitter test such as:

```ts
const registryFile = new RegistryEmitter().emitRegistry(project);

expect(registryFile.path).toBe("generated/registry.ts");
expect(registryFile.contents).toContain("decodeCreatedEvent");
expect(registryFile.contents).toContain("decodeExercisedEvent");
expect(registryFile.contents).toContain("templateId");
```

Add an integration-style generator test that expects:

```ts
const project = await generator.generateFromArchiveOrThrowAsync(bytes);

expect(project.templateFiles).toHaveLength(1);
expect(project.registryFile.path).toBe("generated/registry.ts");
expect(project.indexFile.path).toBe("generated/index.ts");
```

- [ ] **Step 2: Run the generator tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/registry-emitter.test.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts
```

Expected:

- `FAIL`
- missing registry and project assembly

- [ ] **Step 3: Implement support-file emission, registry emission, and project generation**

Add:

- support-file emitter
- registry emitter
- project emitter
- `DamlInterfaceGenerator.generateFromDarOrThrowAsync(...)`
- `DamlInterfaceGenerator.generateFromDalfOrThrowAsync(...)`

Use the analyzer plus template emitter pipeline to build the complete in-memory project.

- [ ] **Step 4: Run the generator tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/registry-emitter.test.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/emission src/daml-interface/daml-interface-generator.ts tests/unit/daml-interface/registry-emitter.test.ts tests/integration/daml-interface/daml-interface-generator.integration.test.ts
git commit -m "feat: add daml interface project generation"
```

## Task 6: Add The Writer And CLI

**Files:**
- Create: `src/daml-interface/writing/daml-interface-writer.ts`
- Create: `src/daml-interface/cli/daml-interface-cli.ts`
- Create: `src/daml-interface/cli/daml-interface-cli-options.ts`
- Create: `src/daml-interface/cli/daml-interface-cli-main.ts`
- Modify: `src/daml-interface/index.ts`
- Modify: `package.json`
- Test: `tests/unit/daml-interface/daml-interface-cli.test.ts`

- [ ] **Step 1: Write the failing writer and CLI tests**

Writer test behavior can be covered through CLI assertions. Add tests like:

```ts
const options = DamlInterfaceCliOptions.parseOrThrow([
    "--input",
    "sample.dar",
    "--output",
    "generated",
]);

expect(options.inputPath).toBe("sample.dar");
expect(options.outputDirectory).toBe("generated");
```

Also assert the CLI delegates to the generator and writer:

```ts
await expect(
    new DamlInterfaceCli(fakeGenerator, fakeWriter).runAsync(args),
).resolves.toBe(0);
```

- [ ] **Step 2: Run the CLI test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/daml-interface-cli.test.ts
```

Expected:

- `FAIL`
- missing CLI and writer

- [ ] **Step 3: Implement the writer and CLI**

Add:

- `DamlInterfaceWriter.writeProjectAsync(project, outputDirectory)`
- CLI option parsing
- CLI main entry point
- a package script such as:

```json
"generate:daml-interface": "node ./dist/daml-interface/cli/daml-interface-cli-main.js"
```

Keep the CLI thin; it should orchestrate generator plus writer rather than embedding generation logic.

- [ ] **Step 4: Run the CLI test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-interface/daml-interface-cli.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-interface/writing src/daml-interface/cli src/daml-interface/index.ts package.json tests/unit/daml-interface/daml-interface-cli.test.ts
git commit -m "feat: add daml interface cli"
```

## Task 7: Document The New Generator And Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Update docs for `./daml-interface`**

Document:

- `canton-typescript-sdk/daml-interface`
- `DamlInterfaceGenerator`
- `DamlInterfaceWriter`
- CLI usage
- generated output shape
- strict failure behavior

Add a short example like:

```ts
import { DamlInterfaceGenerator } from "canton-typescript-sdk/daml-interface";

const project = await new DamlInterfaceGenerator().generateFromDarOrThrowAsync(
    darBytes,
);
```

Document the output shape:

- one file per template
- support files
- registry file
- index file

- [ ] **Step 2: Run full verification**

Run:

```bash
rtk npm run build
rtk npm run lint
rtk npm test
```

Expected:

- all commands `PASS`

- [ ] **Step 3: Commit**

```bash
git add README.md DOCUMENTATION.md
git commit -m "docs: add daml interface usage"
```

## Task 8: Final Surface Audit

**Files:**
- Review: `package.json`
- Review: `src/daml-interface/index.ts`
- Review: `src/index.ts`
- Review: `README.md`
- Review: `DOCUMENTATION.md`

- [ ] **Step 1: Audit the final generator surface**

Confirm:

- `./daml-interface` subpath export exists
- generator types are not exported from the root package
- the generator consumes `daml-lf` instead of raw LF protobufs in the public API
- CLI and writer are documented
- strict failure behavior is documented

- [ ] **Step 2: Run a final targeted grep**

Run:

```bash
rtk rg -n "./daml-interface|DamlInterfaceGenerator|DamlInterfaceWriter|DamlInterfaceCli|GeneratedDamlInterfaceProject|GeneratedTemplateBindingFile|generateFromDarOrThrowAsync|generateFromDalfOrThrowAsync" package.json src README.md DOCUMENTATION.md tests
```

Expected:

- matches appear in the intended generator files and docs
- no accidental generator exports in `src/index.ts`

- [ ] **Step 3: Commit any final cleanup**

```bash
git add package.json src/daml-interface src/daml-lf README.md DOCUMENTATION.md tests
git commit -m "chore: finalize daml interface surface"
```
