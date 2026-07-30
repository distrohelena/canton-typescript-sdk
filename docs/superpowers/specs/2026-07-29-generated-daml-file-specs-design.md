# Generated DAML File Specs Design

## Goal

Every TypeScript source file emitted by the DAML interface generator must have a
colocated, runnable `*.spec.ts` file. The generated project remains free of a
generated `package.json` and third-party test-runner dependency.

## Layout

For every generated source file, emit exactly one sibling spec file with the
same stem:

```text
generated/packages/<package>/<module>/iou.ts
generated/packages/<package>/<module>/iou.spec.ts
generated/packages/<package>/<module>/types.ts
generated/packages/<package>/<module>/types.spec.ts
generated/support/descriptors.ts
generated/support/descriptors.spec.ts
generated/index.ts
generated/index.spec.ts
```

The project model and writer carry spec files in the same way as existing
template, named-type, support, registry, and index files. Specs are emitted
under `generated/`; no root package metadata, test configuration, or scripts
are generated.

## Runtime model

Specs use only Node's built-in `node:test` and `node:assert/strict`. A consuming
project compiles them with its normal TypeScript configuration and runs the
compiled files with Node's test runner, for example:

```bash
node --test dist/generated/**/*.spec.js
```

Generated specs therefore require no generator-owned package manager or test
framework version. Consumers remain responsible for providing the normal Node
TypeScript typings and compilation configuration used by their project.

## Generated coverage

### Template files

Each template spec imports its sibling binding and validates:

- `fromCreatedEvent` materializes the generated template class and preserves
  its `contractId` and fields.
- Each choice has an exercised-event sample and returns the exact generated
  choice event class.
- Choice argument, result, consuming flag, and generated metadata are
  preserved.

### Named type files

Named-type specs include compile-time sample assignments for each generated
record, variant, and enum/type alias exposed by the file. They also contain a
minimal Node test so the file is a runnable test module. Variants exercise each
constructor.

### Support, registry, and barrel files

Each generated support, registry, and index file receives a sibling spec that
imports its matching module and checks its public generated surface. Descriptor
registry specs resolve every non-generic type and representative concrete
applications of generic types.

## Sample synthesis

A generator-owned sample synthesizer derives deterministic representative values
from analyzed DAML types:

- Primitives use stable values appropriate to their TypeScript and ledger
  representations.
- Records and variants recursively synthesize their fields/constructors.
- Lists, maps, tuples, and optionals use values that exercise their decoder
  paths, with empty values at recursion boundaries where required.
- Generic declarations receive concrete representative type arguments.
- Recursive references are bounded by a fixed depth and then terminate through
  an empty optional/collection or a minimal constructor value.
- External opaque contract IDs remain strings; specs must not force users to
  load external DARs merely to test their own generated project.

Generation fails with an identity- and path-specific error if a reachable
generated type cannot be assigned a legal representative sample. It must never
silently omit that source file's spec.

## SDK verification

Integration coverage will generate a temporary project and verify that every
emitted `.ts` source has exactly one sibling `.spec.ts` file, typecheck source
and specs together, compile them, and execute the compiled specs through
Node's test runner. The configured Vault Base DAR integration follows the same
path when `DAML_INTERFACE_VAULT_BASE_DAR` is set.

## Non-goals

- No generated `package.json`, package scripts, lockfile, test configuration,
  or third-party test framework.
- No requirement to resolve unrelated external packages/DARs.
- No attempt to create production fixtures beyond deterministic test samples.
