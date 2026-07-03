# DAML Interface Generator Design

## Goal

Add a new `canton-typescript-sdk/daml-interface` package surface that uses `daml-lf` to generate ethers-style TypeScript bindings from DAML templates and choices.

## Decision Summary

- add a dedicated `./daml-interface` subpath export
- build `daml-interface` strictly on top of `daml-lf`
- make it a code generator, not another semantic model package
- support both `DAR` and `DALF` inputs through the existing `daml-lf` loading path
- generate one file per template plus shared support files, a registry, and an index file
- generate static-heavy template classes
- make generated output depend on the Canton SDK directly
- include typed create helpers, typed exercise helpers, typed event/result decoders, and a registry
- fail generation strictly when a required template or choice shape is unsupported
- include a CLI in the first milestone

## Why This Is A Separate Package

`daml-interface` should not live inside `daml-lf`.

The two packages have different responsibilities:

- `daml-lf` parses and models compiled DAML-LF artifacts
- `daml-interface` generates developer-facing TypeScript bindings from the parsed model

Keeping them separate preserves a clean compiler-style layering:

- parse and resolve first
- generate source code second

This also prevents the generator from reaching directly into raw protobuf structures and bypassing the semantic boundary we just created.

## Package Boundary

Expose the package as:

- `canton-typescript-sdk/daml-interface`

Recommended source layout:

- `src/daml-interface/index.ts`
- `src/daml-interface/analysis/...`
- `src/daml-interface/emission-model/...`
- `src/daml-interface/emission/...`
- `src/daml-interface/writing/...`
- `src/daml-interface/cli/...`
- `src/daml-interface/errors/...`

This package should depend on:

- `src/daml-lf/...`
- the root Canton SDK public request and command helpers

It should not duplicate LF parsing logic.

## Layered Architecture

### 1. Analysis Layer

Purpose:

- consume `DamlLfPackage`, `DamlLfCompilation`, and `DamlLfSemanticModel`
- extract generator-relevant concepts
- validate that template and choice shapes are supported for generation

The analyzer should extract:

- template identity
- template fields
- choice names
- choice argument and result shapes
- event decoding metadata
- template and interface relationships where needed for emitted bindings

If a required shape is unsupported, generation should fail here, before emission.

### 2. Emission-Model Layer

Purpose:

- represent generated bindings as an internal project model rather than direct string concatenation

Important concepts should include:

- generated template class
- generated create field type
- generated choice payload type
- generated event wrapper type
- generated registry entry
- emitted file metadata

This layer is the boundary that keeps the generator maintainable as the emitted API grows.

### 3. Emission Layer

Purpose:

- turn the emission model into TypeScript source strings

Outputs should include:

- one file per template
- shared support files
- a registry file
- an index file

This layer owns:

- file naming
- import layout
- emitted TypeScript syntax
- SDK integration helpers

### 4. Writing And CLI Layer

Purpose:

- write emitted files to disk
- expose CLI entry points

The writer should be explicit and file-system oriented.

The CLI should:

- accept `DAR` or `DALF`
- choose the correct `daml-lf` loading path
- run the generator
- write files to the requested output directory

## Public API Shape

The public package should center on a small set of service-style classes:

- `DamlInterfaceGenerator`
- `DamlInterfaceGeneratorOptions`
- `DamlInterfaceWriter`
- `DamlInterfaceCli`
- `GeneratedDamlInterfaceProject`
- `GeneratedTemplateBindingFile`

Responsibilities:

- `DamlInterfaceGenerator`
  - main library entry point
  - loads or accepts parsed input
  - builds the generated binding project model
- `DamlInterfaceWriter`
  - persists emitted files to disk
- `DamlInterfaceCli`
  - wraps generation plus writing behind command-line entry points
- `GeneratedDamlInterfaceProject`
  - reports the emitted file set and metadata
- `GeneratedTemplateBindingFile`
  - represents one generated template output

## Generated API Style

Generated template bindings should be static-heavy and ethers-like.

For a template such as `Main.Iou`, the generated class should feel like:

```ts
export class Iou {
    public static readonly templateId = "Main:Iou";

    public static create(fields: IouCreateFields): CreateCommand { ... }

    public static exerciseTransfer(
        contractId: string,
        choice: IouTransferChoice,
    ): SubmitCommandRequest { ... }

    public static decodeCreatedEvent(event: unknown): IouCreatedEvent { ... }

    public static decodeExercisedEvent(event: unknown): IouTransferExercisedEvent { ... }
}
```

Each template file should also include:

- typed create field interfaces
- typed choice payload interfaces
- typed created event wrappers
- typed exercised event wrappers
- helpers that produce Canton SDK request or command objects directly

## Generation Flow

The first milestone should implement this pipeline:

1. input loading through `daml-lf`
2. template and choice analysis
3. emission-model construction
4. TypeScript source emission
5. file writing
6. CLI orchestration

Inputs:

- `DAR`
- `DALF`

Both should load through:

- `DarArchiveLoader`
- `DamlLfPackageLoader`
- `DamlLfWorkspace`
- `DamlLfCompilation`
- `DamlLfSemanticModel`

The generator should analyze templates through the semantic layer, not by reaching directly into raw LF protobuf structures from the emitter.

## Generated Output Layout

The emitted project should contain:

- one file per template
- shared support files
- a registry file
- a barrel/index file

Representative shape:

- `generated/main/iou.ts`
- `generated/main/account.ts`
- `generated/support/decoding.ts`
- `generated/support/contracts.ts`
- `generated/registry.ts`
- `generated/index.ts`

One file per template is the required default layout for milestone 1.

## Registry

Milestone 1 should include a generated registry capable of decoding heterogeneous events by template id and choice name.

The registry should allow callers to:

- map created events to the correct generated template binding
- map exercised events to the correct generated choice wrapper

This keeps generated bindings ergonomic when callers work over mixed ledger streams instead of only one template type at a time.

## SDK Integration

Generated bindings should depend on the Canton SDK directly.

They should be able to produce SDK-friendly objects such as:

- create command helpers
- exercise command helpers
- event decoding wrappers aligned with the SDK data model

This package is not meant to produce standalone neutral DTOs first.

## Strict Failure Model

Generation should fail if `daml-lf` cannot model a required template or choice shape safely.

It should not:

- skip unsupported templates silently
- emit partial `unknown` fallback stubs
- continue best-effort through unsupported constructs

Primary exception types should include:

- `DamlInterfaceGenerationException`
- `DamlInterfaceUnsupportedShapeException`
- `DamlInterfaceWriteException`

## CLI

The first milestone should include a CLI in the same repo and the same package milestone.

CLI requirements:

- accept input path
- accept output directory
- detect `DAR` versus `DALF`
- run generation
- write bindings to disk

This package should not be library-only in milestone 1.

## Testing Strategy

Tests should be layered:

- unit tests for LF-to-interface analysis
- unit tests for emitted naming and path rules
- unit tests for template-file emission
- unit tests for registry emission
- unit tests for CLI argument parsing
- integration tests that load small LF fixtures and assert emitted file outputs

Fixture strategy:

- small synthetic LF fixtures first
- reuse `daml-lf` fixtures where practical

Verification should prioritize:

- strict failure behavior
- stable file layout
- emitted SDK integration shape
- generated template and choice typing
- registry decode coverage

## Milestone 1 Success Criteria

Milestone 1 is successful when:

- `canton-typescript-sdk/daml-interface` exists
- it consumes `daml-lf` rather than duplicating parsing
- it accepts `DAR` and `DALF`
- it emits one file per template
- it emits shared support files, a registry file, and an index file
- generated classes expose typed create helpers
- generated classes expose typed exercise helpers
- generated classes expose typed event and result decoders
- a generated registry can decode heterogeneous events by template id and choice name
- the CLI writes bindings to disk

## Out Of Scope

This design does not include:

- runtime-only reflection bindings
- partial generation with `unknown` fallbacks
- source `.daml` parsing
- a standalone non-SDK binding target
- multiple output style variants in milestone 1
