# DAML-LF Parser Design

## Goal

Add a new `canton-typescript-sdk/daml-lf` package surface that parses `DAR` and `DALF` artifacts into a compiler-style, C#-leaning API rich enough to support a future DAML interpreter in TypeScript.

## Decision Summary

- Add a dedicated `./daml-lf` subpath export
- Treat `DAR` as a thin container over a shared `DALF` / LF package loader
- Keep the first internal model near-lossless to compiled LF
- Add a Roslyn-like public API over that model with immutable classes and enums
- Build symbol resolution and interpreter-oriented semantic indexing in milestone 1
- Support versioned loading now, with LF `2.x` implemented first
- Use exception-first APIs
- Add an interpreter scaffold, but no real LF execution yet
- Keep the initial API artifact-centric and reserve source-location slots for later

## Why This Starts From DAML-LF

The user wants a path that can eventually support both a TypeScript interpreter and a richer parser story similar to Roslyn.

Starting from compiled LF is the correct first step because it:

- gives a stable semantic artifact boundary now
- avoids pretending we already have source-accurate syntax trees and trivia
- lets interpreter-facing abstractions grow from the real executable form
- keeps room for a future source parser that can plug into the same symbol and semantic layers

This is intentionally a layered front-end, not a source parser first.

## Package Boundary

Expose the parser as:

- `canton-typescript-sdk/daml-lf`

Keep it separate from the transport SDK root surface.

Recommended source layout:

- `src/daml-lf/index.ts`
- `src/daml-lf/container/...`
- `src/daml-lf/decoding/...`
- `src/daml-lf/model/...`
- `src/daml-lf/symbols/...`
- `src/daml-lf/semantics/...`
- `src/daml-lf/interpreter/...`
- `src/daml-lf/errors/...`

This keeps the package split-ready if it later becomes its own npm package.

## Layered Architecture

### 1. Container Layer

Purpose:

- read `.dar` archives
- parse archive manifest data
- extract raw package payloads
- expose dependency and entry metadata

This layer should remain structurally thin. It should not perform semantic LF interpretation beyond archive correctness checks.

### 2. Decoding Layer

Purpose:

- decode raw `DALF` bytes into LF package objects
- select a version-specific decoder
- validate supported LF versions

Rules:

- design a versioned loader abstraction now
- implement LF `2.x` first
- preserve the compiled LF structure as closely as practical in the first internal model

This layer is where malformed payload and unsupported-version failures are raised.

### 3. Model And Symbol Layer

Purpose:

- expose immutable compiler-style classes representing packages, modules, definitions, expressions, types, and references
- resolve package, module, type, value, choice, and interface identities into explicit symbol objects

The public API should feel C#-leaning:

- classes over loose objects
- enums where they carry meaning
- explicit loaders and services
- visitors for traversing expressions and types
- no static-export utility sprawl

### 4. Semantics And Interpreter Layer

Purpose:

- expose interpreter-oriented semantic information
- answer questions about shapes and resolved meanings
- define interpreter contracts without evaluating LF yet

Milestone 1 should include:

- semantic indexing
- resolved lookups
- template and interface relationship queries
- choice signatures
- field and constructor queries
- callable and value-definition traversal helpers
- interpreter scaffold types and service boundaries

Milestone 1 should not include a real evaluator.

## Public Entry Points

The public API should center on a small set of service-style entry points:

- `DarArchiveLoader`
- `DamlLfPackageLoader`
- `DamlLfWorkspace`
- `DamlLfCompilation`
- `DamlLfSemanticModel`
- `DamlLfInterpreterScaffold`

These are the high-level surfaces that consumers should build around.

## Public Model Shape

Core immutable classes should include types such as:

- `DamlLfPackage`
- `DamlLfModule`
- `DamlLfDefinition`
- `DamlLfDataType`
- `DamlLfRecord`
- `DamlLfVariant`
- `DamlLfEnum`
- `DamlLfTemplate`
- `DamlLfInterface`
- `DamlLfChoice`
- `DamlLfValueDefinition`
- `DamlLfType`
- `DamlLfKind`
- `DamlLfExpression`

Reference and symbol classes should include types such as:

- `PackageReference`
- `ModuleReference`
- `TypeConReference`
- `ValueReference`
- `DamlLfSymbol`
- `PackageSymbol`
- `ModuleSymbol`
- `TypeSymbol`
- `ValueSymbol`
- `ChoiceSymbol`
- `InterfaceSymbol`

Supporting public types should include:

- enums for node kinds, symbol kinds, builtin types, builtin functions, literal kinds, and similar categorical values
- visitor bases such as `DamlLfExpressionVisitor<T>` and `DamlLfTypeVisitor<T>`
- readonly collection exposure with consistent conventions across the package

## Artifact-Centric First Milestone

The initial API should be compiled-artifact-centric.

That means:

- stable package, module, definition, and expression identity
- no fabricated source trivia or exact source spans
- optional location hooks reserved in the API so future source-backed implementations can attach them

The package should not pretend to be Roslyn in source-fidelity terms on day one. It should be Roslyn-like in structure, traversal, resolution, and semantic querying.

## Loading Pipeline

The first milestone should implement this pipeline:

1. `DarArchiveLoader`
   - input: `Uint8Array` or equivalent bytes
   - output: parsed archive object with manifest and raw package payload entries
2. `DamlLfPackageLoader`
   - input: raw `DALF` bytes
   - output: decoded `DamlLfPackage`
   - internally selects the version-specific decoder
3. `DamlLfWorkspace`
   - aggregates loaded packages and dependency relationships
4. `DamlLfCompilation`
   - builds symbol tables and cross-package resolution indexes
5. `DamlLfSemanticModel`
   - exposes interpreter-facing semantic queries
6. `DamlLfInterpreterScaffold`
   - defines the evaluation contracts and runtime hooks for future execution

Resolution should be explicit and precomputed at compilation-build time rather than hidden behind scattered lazy lookups.

## Semantic Responsibilities

Milestone 1 semantics should support queries such as:

- what package or module a reference resolves to
- what fields a record defines
- what constructors a variant exposes
- what choices a template or interface exposes
- what parameter and return shapes a choice uses
- what template and interface relationships exist
- what a referenced value definition or type constructor means
- what dependencies a definition or expression reaches

This is enough to support an interpreter scaffold without implementing evaluation.

## Versioning Strategy

The loader design should assume multiple LF versions exist.

Rules:

- introduce a versioned decoder boundary now
- implement LF `2.x` first
- keep room for LF `1.x` later without changing the public entry-point shape

This avoids hard-coding the whole package to the currently vendored generated protobuf surface.

## Error Handling

The API should be exception-first.

Primary exception types should include:

- `DamlLfArchiveException`
- `DamlLfDecodeException`
- `DamlLfVersionNotSupportedException`
- `DamlLfResolutionException`
- `DamlLfSemanticException`

Preferred entry points should follow an `OrThrow` style where useful, for example:

- `loadDarOrThrowAsync(...)`
- `loadPackageOrThrowAsync(...)`
- `createCompilationOrThrow(...)`

The package should not start with a diagnostics-first API.

## Interpreter Scaffold

Milestone 1 should define, but not fully implement, the interpreter boundary.

That scaffold should include concepts such as:

- runtime value abstractions
- evaluation context contracts
- builtin dispatch registration
- callable invocation contracts
- package and symbol access services needed by an evaluator

It should be possible to start an evaluator on top of the scaffold without redesigning the parser package.

## Testing Strategy

Tests should follow the package layering:

- unit tests for archive reading
- unit tests for LF `2.x` decoding
- unit tests for immutable model construction
- unit tests for symbol resolution
- unit tests for semantic queries
- fixture-based tests using small synthetic LF payloads first
- integration tests loading real `DAR` and `DALF` samples after the loader basics work

Verification should prioritize:

- structural correctness
- reference resolution correctness
- semantic query correctness
- stable public package shape

## Milestone 1 Success Criteria

Milestone 1 is successful when:

- `DAR` and raw `DALF` inputs are both supported
- LF `2.x` packages decode into immutable public objects
- cross-package and cross-module references resolve through explicit symbols
- semantic queries expose templates, interfaces, choices, fields, value definitions, and expression/type shapes
- interpreter scaffold APIs exist
- no real LF execution is required yet

## Out Of Scope

This design does not include:

- a real DAML source parser for `.daml` files
- exact source locations or trivia reconstruction
- a complete DAML-LF interpreter
- full LF `1.x` implementation in milestone 1
- diagnostics-first compilation APIs
