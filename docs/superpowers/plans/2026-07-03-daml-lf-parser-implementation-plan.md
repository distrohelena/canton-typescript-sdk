# DAML-LF Parser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `canton-typescript-sdk/daml-lf` subpath that loads `DAR` and `DALF` artifacts into an immutable, compiler-style DAML-LF model with symbol resolution, semantic indexing, and an interpreter scaffold.

**Architecture:** Build the package in layers. Start by scaffolding the public `./daml-lf` surface and parser exception types, then add LF archive decoding and `DAR` container loading, then map decoded LF `2.x` packages into a public immutable model. After that, add workspace/compilation symbol resolution and a semantic layer that exposes interpreter-facing queries, followed by interpreter scaffold contracts and docs.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated LF archive types, `fflate` for zip container parsing

---

## File Structure

### New package surface and exports

- Create: `src/daml-lf/index.ts`
- Modify: `package.json`
- Test: `tests/unit/daml-lf/package-shape.test.ts`

### New parser errors

- Create: `src/daml-lf/errors/daml-lf-archive.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-decode.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-version-not-supported.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-resolution.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-semantic.exception.ts`

### Container layer

- Create: `src/daml-lf/container/dar-archive.ts`
- Create: `src/daml-lf/container/dar-package-entry.ts`
- Create: `src/daml-lf/container/dar-manifest.ts`
- Create: `src/daml-lf/container/dar-archive-loader.ts`
- Test: `tests/unit/daml-lf/dar-archive-loader.test.ts`

### Decoding layer

- Create: `src/daml-lf/decoding/daml-lf-language-version.ts`
- Create: `src/daml-lf/decoding/archive-payload-envelope.ts`
- Create: `src/daml-lf/decoding/archive-payload-decoder.ts`
- Create: `src/daml-lf/decoding/package-decoder.interface.ts`
- Create: `src/daml-lf/decoding/package-decoder-registry.ts`
- Create: `src/daml-lf/decoding/lf-2-package-decoder.ts`
- Create: `src/daml-lf/daml-lf-package-loader.ts`
- Test: `tests/unit/daml-lf/archive-payload-decoder.test.ts`
- Test: `tests/unit/daml-lf/lf-2-package-decoder.test.ts`

### Public immutable model

- Create: `src/daml-lf/model/daml-lf-node-kind.ts`
- Create: `src/daml-lf/model/daml-lf-symbol-kind.ts`
- Create: `src/daml-lf/model/daml-lf-builtin-type.ts`
- Create: `src/daml-lf/model/daml-lf-package.ts`
- Create: `src/daml-lf/model/daml-lf-module.ts`
- Create: `src/daml-lf/model/daml-lf-definition.ts`
- Create: `src/daml-lf/model/daml-lf-data-type.ts`
- Create: `src/daml-lf/model/daml-lf-record.ts`
- Create: `src/daml-lf/model/daml-lf-variant.ts`
- Create: `src/daml-lf/model/daml-lf-enum.ts`
- Create: `src/daml-lf/model/daml-lf-template.ts`
- Create: `src/daml-lf/model/daml-lf-interface.ts`
- Create: `src/daml-lf/model/daml-lf-choice.ts`
- Create: `src/daml-lf/model/daml-lf-value-definition.ts`
- Create: `src/daml-lf/model/daml-lf-type.ts`
- Create: `src/daml-lf/model/daml-lf-kind.ts`
- Create: `src/daml-lf/model/daml-lf-expression.ts`
- Create: `src/daml-lf/model/daml-lf-expression-visitor.ts`
- Create: `src/daml-lf/model/daml-lf-type-visitor.ts`
- Create: `src/daml-lf/model/package-reference.ts`
- Create: `src/daml-lf/model/module-reference.ts`
- Create: `src/daml-lf/model/type-con-reference.ts`
- Create: `src/daml-lf/model/value-reference.ts`
- Create: `src/daml-lf/model/lf-2-model-mapper.ts`
- Test: `tests/unit/daml-lf/lf-2-model-mapper.test.ts`

### Workspace, compilation, and symbols

- Create: `src/daml-lf/daml-lf-workspace.ts`
- Create: `src/daml-lf/daml-lf-compilation.ts`
- Create: `src/daml-lf/symbols/daml-lf-symbol.ts`
- Create: `src/daml-lf/symbols/package-symbol.ts`
- Create: `src/daml-lf/symbols/module-symbol.ts`
- Create: `src/daml-lf/symbols/type-symbol.ts`
- Create: `src/daml-lf/symbols/value-symbol.ts`
- Create: `src/daml-lf/symbols/choice-symbol.ts`
- Create: `src/daml-lf/symbols/interface-symbol.ts`
- Create: `src/daml-lf/symbols/daml-lf-symbol-table.ts`
- Test: `tests/unit/daml-lf/daml-lf-compilation.test.ts`

### Semantic layer and interpreter scaffold

- Create: `src/daml-lf/semantics/daml-lf-semantic-model.ts`
- Create: `src/daml-lf/interpreter/daml-lf-runtime-value.ts`
- Create: `src/daml-lf/interpreter/daml-lf-evaluation-context.interface.ts`
- Create: `src/daml-lf/interpreter/daml-lf-builtin-dispatch.ts`
- Create: `src/daml-lf/interpreter/daml-lf-interpreter-scaffold.ts`
- Test: `tests/unit/daml-lf/daml-lf-semantic-model.test.ts`
- Test: `tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts`

### Shared test fixtures and docs

- Create: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

## Task 1: Scaffold The `./daml-lf` Package Surface

**Files:**
- Modify: `package.json`
- Create: `src/daml-lf/index.ts`
- Create: `src/daml-lf/errors/daml-lf-archive.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-decode.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-version-not-supported.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-resolution.exception.ts`
- Create: `src/daml-lf/errors/daml-lf-semantic.exception.ts`
- Test: `tests/unit/daml-lf/package-shape.test.ts`

- [ ] **Step 1: Write the failing package-shape test**

Add assertions like:

```ts
const damlLfModule = await import("../../../src/daml-lf/index.js");

expect(damlLfModule.DarArchiveLoader).toBeTypeOf("function");
expect(damlLfModule.DamlLfPackageLoader).toBeTypeOf("function");
expect(damlLfModule.DamlLfDecodeException).toBeTypeOf("function");
```

Also assert the root package does not accidentally export the parser surface:

```ts
const rootModule = await import("../../../src/index.js");

expect(rootModule).not.toHaveProperty("DarArchiveLoader");
expect(rootModule).not.toHaveProperty("DamlLfPackageLoader");
```

- [ ] **Step 2: Run the package-shape test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/package-shape.test.ts
```

Expected:

- `FAIL`
- missing `src/daml-lf/index.ts`
- missing parser exports

- [ ] **Step 3: Add the new package export and error classes**

Update `package.json`:

```json
"./daml-lf": {
    "types": "./dist/daml-lf/index.d.ts",
    "import": "./dist/daml-lf/index.js"
}
```

Create a minimal `src/daml-lf/index.ts` that exports:

- placeholder `DarArchiveLoader`
- placeholder `DamlLfPackageLoader`
- parser exception classes

Use the same class-first style as the rest of the SDK:

```ts
export class DamlLfDecodeException extends Error {
    public constructor(message: string) {
        super(message);
        this.name = "DamlLfDecodeException";
    }
}
```

- [ ] **Step 4: Run the package-shape test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add package.json src/daml-lf tests/unit/daml-lf/package-shape.test.ts
git commit -m "feat: scaffold daml lf package surface"
```

## Task 2: Add Synthetic LF Fixtures And The Raw LF 2.x Decoder Pipeline

**Files:**
- Create: `tests/fixtures/daml-lf/sample-lf-package-fixture.ts`
- Create: `src/daml-lf/decoding/daml-lf-language-version.ts`
- Create: `src/daml-lf/decoding/archive-payload-envelope.ts`
- Create: `src/daml-lf/decoding/archive-payload-decoder.ts`
- Create: `src/daml-lf/decoding/package-decoder.interface.ts`
- Create: `src/daml-lf/decoding/package-decoder-registry.ts`
- Create: `src/daml-lf/decoding/lf-2-package-decoder.ts`
- Create: `src/daml-lf/daml-lf-package-loader.ts`
- Test: `tests/unit/daml-lf/archive-payload-decoder.test.ts`
- Test: `tests/unit/daml-lf/lf-2-package-decoder.test.ts`

- [ ] **Step 1: Write failing decoder tests against synthetic protobuf-backed fixtures**

Create fixture helpers that use the existing generated protobuf message types to produce valid binary payloads:

```ts
const archiveBytes = Archive.toBinary({
    hashFunction: HashFunction.SHA256,
    payload: ArchivePayload.toBinary({
        minor: "1",
        patch: 0,
        sum: {
            oneofKind: "damlLf2",
            damlLf2: Package.toBinary({
                modules: [/* minimal module */],
                internedStrings: ["Sample", "Module"],
                internedDottedNames: [],
                internedTypes: [],
                internedKinds: [],
                internedExprs: [],
            }),
        },
    }),
    hash: "placeholder",
});
```

Add tests like:

```ts
const envelope = ArchivePayloadDecoder.decodeArchiveOrThrow(archiveBytes);
expect(envelope.languageVersion.toString()).toBe("2.1");
expect(envelope.packagePayload).toBeInstanceOf(Uint8Array);
```

```ts
const loader = new DamlLfPackageLoader();
const result = loader.loadPackageOrThrow(sampleLf2PackageBytes);
expect(result.languageVersion.minor).toBe("1");
expect(result.rawPackage.modules).toHaveLength(1);
```

- [ ] **Step 2: Run the decoder tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/archive-payload-decoder.test.ts tests/unit/daml-lf/lf-2-package-decoder.test.ts
```

Expected:

- `FAIL`
- missing decoder classes
- missing loader

- [ ] **Step 3: Implement the version envelope and raw LF 2.x package decoder**

Build a narrow decoder pipeline:

- `ArchivePayloadDecoder` decodes `daml_lf.Archive` and `daml_lf.ArchivePayload`
- `DamlLfLanguageVersion` represents the version components
- `Lf2PackageDecoder` decodes the raw `daml_lf_2.Package`
- `PackageDecoderRegistry` selects the decoder by version and payload sum kind
- `DamlLfPackageLoader` exposes:

```ts
public loadPackageOrThrow(payload: Uint8Array): {
    readonly languageVersion: DamlLfLanguageVersion;
    readonly rawPackage: LfArchivePackage;
}
```

Do not map to the public immutable model yet. Task 2 only builds the raw decode boundary.

- [ ] **Step 4: Run the decoder tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/archive-payload-decoder.test.ts tests/unit/daml-lf/lf-2-package-decoder.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-lf/decoding src/daml-lf/daml-lf-package-loader.ts tests/fixtures/daml-lf tests/unit/daml-lf/archive-payload-decoder.test.ts tests/unit/daml-lf/lf-2-package-decoder.test.ts
git commit -m "feat: add daml lf raw package decoder"
```

## Task 3: Add The `DAR` Container Loader

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/daml-lf/container/dar-archive.ts`
- Create: `src/daml-lf/container/dar-package-entry.ts`
- Create: `src/daml-lf/container/dar-manifest.ts`
- Create: `src/daml-lf/container/dar-archive-loader.ts`
- Test: `tests/unit/daml-lf/dar-archive-loader.test.ts`

- [ ] **Step 1: Add the failing `DAR` loader tests**

Use the synthetic fixture builder to construct a minimal in-memory zip archive with:

- `META-INF/MANIFEST.MF`
- one `.dalf` payload entry

Test examples:

```ts
const archive = await new DarArchiveLoader().loadDarOrThrowAsync(sampleDarBytes);

expect(archive.mainPackageEntry.path).toBe("Sample.dalf");
expect(archive.packageEntries).toHaveLength(1);
expect(archive.manifest.mainDalfPath).toBe("Sample.dalf");
```

Also add a malformed-manifest test:

```ts
await expect(
    new DarArchiveLoader().loadDarOrThrowAsync(bytesWithoutManifest),
).rejects.toThrow(DamlLfArchiveException);
```

- [ ] **Step 2: Run the `DAR` loader tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/dar-archive-loader.test.ts
```

Expected:

- `FAIL`
- missing `DarArchiveLoader`
- missing zip handling

- [ ] **Step 3: Add zip dependency and implement the archive loader**

Install a small zip dependency:

```bash
rtk npm install fflate
```

Implement:

- `DarManifest` parsing for the entries needed by the loader
- `DarArchiveLoader.loadDarOrThrowAsync(...)`
- `DarArchive` and `DarPackageEntry` immutable classes

Use `fflate` to unzip in-memory bytes and locate the manifest plus `.dalf` entries.

- [ ] **Step 4: Run the `DAR` loader tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/dar-archive-loader.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/daml-lf/container tests/unit/daml-lf/dar-archive-loader.test.ts
git commit -m "feat: add dar archive loader"
```

## Task 4: Map Raw LF 2.x Packages Into The Public Immutable Model

**Files:**
- Create: `src/daml-lf/model/daml-lf-node-kind.ts`
- Create: `src/daml-lf/model/daml-lf-symbol-kind.ts`
- Create: `src/daml-lf/model/daml-lf-builtin-type.ts`
- Create: `src/daml-lf/model/daml-lf-package.ts`
- Create: `src/daml-lf/model/daml-lf-module.ts`
- Create: `src/daml-lf/model/daml-lf-definition.ts`
- Create: `src/daml-lf/model/daml-lf-data-type.ts`
- Create: `src/daml-lf/model/daml-lf-record.ts`
- Create: `src/daml-lf/model/daml-lf-variant.ts`
- Create: `src/daml-lf/model/daml-lf-enum.ts`
- Create: `src/daml-lf/model/daml-lf-template.ts`
- Create: `src/daml-lf/model/daml-lf-interface.ts`
- Create: `src/daml-lf/model/daml-lf-choice.ts`
- Create: `src/daml-lf/model/daml-lf-value-definition.ts`
- Create: `src/daml-lf/model/daml-lf-type.ts`
- Create: `src/daml-lf/model/daml-lf-kind.ts`
- Create: `src/daml-lf/model/daml-lf-expression.ts`
- Create: `src/daml-lf/model/daml-lf-expression-visitor.ts`
- Create: `src/daml-lf/model/daml-lf-type-visitor.ts`
- Create: `src/daml-lf/model/package-reference.ts`
- Create: `src/daml-lf/model/module-reference.ts`
- Create: `src/daml-lf/model/type-con-reference.ts`
- Create: `src/daml-lf/model/value-reference.ts`
- Create: `src/daml-lf/model/lf-2-model-mapper.ts`
- Modify: `src/daml-lf/daml-lf-package-loader.ts`
- Test: `tests/unit/daml-lf/lf-2-model-mapper.test.ts`

- [ ] **Step 1: Write the failing public-model mapper test**

Add a test that loads the synthetic LF package and asserts the public immutable shape:

```ts
const packageModel = new DamlLfPackageLoader().loadPackageOrThrow(sampleLf2PackageBytes);

expect(packageModel.packageName).toBe("sample-package");
expect(packageModel.modules).toHaveLength(1);
expect(packageModel.modules[0].name).toBe("Sample.Module");
expect(packageModel.modules[0].definitions).toHaveLength(1);
```

Also assert node/category enums are public and stable:

```ts
expect(DamlLfNodeKind.package).toBe("package");
expect(DamlLfBuiltinType.text).toBe("text");
```

- [ ] **Step 2: Run the public-model test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts
```

Expected:

- `FAIL`
- missing model classes
- loader still returns only raw package data

- [ ] **Step 3: Implement the immutable public model and LF 2.x mapper**

Create immutable classes that wrap the decoded raw LF structures but stay near-lossless.

Update `DamlLfPackageLoader` so `loadPackageOrThrow(...)` returns a public `DamlLfPackage` and expose a separate raw helper only if needed internally:

```ts
public loadPackageOrThrow(payload: Uint8Array): DamlLfPackage
```

Keep the public classes artifact-centric and avoid inventing source spans.

- [ ] **Step 4: Run the public-model test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/lf-2-model-mapper.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-lf/model src/daml-lf/daml-lf-package-loader.ts tests/unit/daml-lf/lf-2-model-mapper.test.ts
git commit -m "feat: add daml lf public model"
```

## Task 5: Add Workspace, Compilation, And Symbol Resolution

**Files:**
- Create: `src/daml-lf/daml-lf-workspace.ts`
- Create: `src/daml-lf/daml-lf-compilation.ts`
- Create: `src/daml-lf/symbols/daml-lf-symbol.ts`
- Create: `src/daml-lf/symbols/package-symbol.ts`
- Create: `src/daml-lf/symbols/module-symbol.ts`
- Create: `src/daml-lf/symbols/type-symbol.ts`
- Create: `src/daml-lf/symbols/value-symbol.ts`
- Create: `src/daml-lf/symbols/choice-symbol.ts`
- Create: `src/daml-lf/symbols/interface-symbol.ts`
- Create: `src/daml-lf/symbols/daml-lf-symbol-table.ts`
- Test: `tests/unit/daml-lf/daml-lf-compilation.test.ts`

- [ ] **Step 1: Write the failing compilation and symbol-resolution test**

Use two synthetic packages with a cross-package reference and assert:

```ts
const workspace = new DamlLfWorkspace([packageA, packageB]);
const compilation = DamlLfCompilation.createOrThrow(workspace);

const moduleSymbol = compilation.getModuleSymbolOrThrow(moduleReference);
const typeSymbol = compilation.getTypeSymbolOrThrow(typeReference);

expect(moduleSymbol.name).toBe("Dependency.Module");
expect(typeSymbol.definition.name).toBe("DependencyRecord");
```

Also add a broken-reference test:

```ts
expect(() =>
    DamlLfCompilation.createOrThrow(brokenWorkspace),
).toThrow(DamlLfResolutionException);
```

- [ ] **Step 2: Run the compilation test to verify it fails**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/daml-lf-compilation.test.ts
```

Expected:

- `FAIL`
- missing workspace
- missing symbol table

- [ ] **Step 3: Implement workspace aggregation and explicit symbol resolution**

Add:

- `DamlLfWorkspace` for package aggregation
- `DamlLfCompilation` for precomputed indexes
- symbol classes and `DamlLfSymbolTable`

Resolution must happen during compilation creation, not in scattered lazy methods.

- [ ] **Step 4: Run the compilation test to verify it passes**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/daml-lf-compilation.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-lf/daml-lf-workspace.ts src/daml-lf/daml-lf-compilation.ts src/daml-lf/symbols tests/unit/daml-lf/daml-lf-compilation.test.ts
git commit -m "feat: add daml lf compilation and symbols"
```

## Task 6: Add The Semantic Layer And Interpreter Scaffold

**Files:**
- Create: `src/daml-lf/semantics/daml-lf-semantic-model.ts`
- Create: `src/daml-lf/interpreter/daml-lf-runtime-value.ts`
- Create: `src/daml-lf/interpreter/daml-lf-evaluation-context.interface.ts`
- Create: `src/daml-lf/interpreter/daml-lf-builtin-dispatch.ts`
- Create: `src/daml-lf/interpreter/daml-lf-interpreter-scaffold.ts`
- Modify: `src/daml-lf/index.ts`
- Test: `tests/unit/daml-lf/daml-lf-semantic-model.test.ts`
- Test: `tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts`

- [ ] **Step 1: Write the failing semantic-model and interpreter-scaffold tests**

Add semantic assertions like:

```ts
const semanticModel = compilation.createSemanticModel();

expect(
    semanticModel.getRecordFieldsOrThrow(typeReference).map((field) => field.name),
).toEqual(["owner", "amount"]);

expect(
    semanticModel.getTemplateChoicesOrThrow(templateReference).map((choice) => choice.name),
).toEqual(["Archive"]);
```

Add interpreter scaffold assertions like:

```ts
const scaffold = new DamlLfInterpreterScaffold(compilation);

expect(scaffold.getCompilation()).toBe(compilation);
expect(scaffold.getBuiltinDispatch()).toBeDefined();
```

- [ ] **Step 2: Run the semantic and scaffold tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/daml-lf-semantic-model.test.ts tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts
```

Expected:

- `FAIL`
- missing semantic model
- missing interpreter scaffold

- [ ] **Step 3: Implement the semantic queries and scaffold contracts**

Add:

- `DamlLfSemanticModel` with interpreter-facing lookup helpers
- `DamlLfRuntimeValue`
- `IDamlLfEvaluationContext`
- `DamlLfBuiltinDispatch`
- `DamlLfInterpreterScaffold`

Do not implement evaluation. Keep this as a contract layer over the compilation.

- [ ] **Step 4: Run the semantic and scaffold tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/daml-lf/daml-lf-semantic-model.test.ts tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/daml-lf/semantics src/daml-lf/interpreter src/daml-lf/index.ts tests/unit/daml-lf/daml-lf-semantic-model.test.ts tests/unit/daml-lf/daml-lf-interpreter-scaffold.test.ts
git commit -m "feat: add daml lf semantics scaffold"
```

## Task 7: Document The New Package And Run Full Verification

**Files:**
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Update docs for the new parser subpath**

Document:

- `canton-typescript-sdk/daml-lf`
- `DarArchiveLoader`
- `DamlLfPackageLoader`
- `DamlLfWorkspace`
- `DamlLfCompilation`
- `DamlLfSemanticModel`
- `DamlLfInterpreterScaffold`

Add a short example:

```ts
import {
    DarArchiveLoader,
    DamlLfCompilation,
} from "canton-typescript-sdk/daml-lf";

const archive = await new DarArchiveLoader().loadDarOrThrowAsync(darBytes);
const compilation = DamlLfCompilation.createOrThrowFromDar(archive);
```

State clearly:

- LF `2.x` is the only implemented version initially
- the API is artifact-centric
- the interpreter boundary is scaffold-only in milestone 1

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
git commit -m "docs: add daml lf parser usage"
```

## Task 8: Final Surface Audit

**Files:**
- Review: `package.json`
- Review: `src/daml-lf/index.ts`
- Review: `README.md`
- Review: `DOCUMENTATION.md`

- [ ] **Step 1: Audit the final parser surface**

Confirm:

- `./daml-lf` subpath export exists
- parser types are not exported from the root package
- exception-first entry points remain the public default
- LF `2.x` is documented as the only implemented decoder
- no real evaluator APIs are implied by the docs

- [ ] **Step 2: Run a final targeted grep**

Run:

```bash
rtk rg -n "./daml-lf|DarArchiveLoader|DamlLfPackageLoader|DamlLfWorkspace|DamlLfCompilation|DamlLfSemanticModel|DamlLfInterpreterScaffold|DamlLfDecodeException" package.json src README.md DOCUMENTATION.md tests
```

Expected:

- matches appear in the intended parser files and docs
- no accidental parser exports in `src/index.ts`

- [ ] **Step 3: Commit any final cleanup**

```bash
git add package.json src/daml-lf README.md DOCUMENTATION.md tests
git commit -m "chore: finalize daml lf parser surface"
```
