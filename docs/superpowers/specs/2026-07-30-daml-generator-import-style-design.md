# DAML Generator Import Style Design

## Goal

Allow generated DAML TypeScript source to run with plain `ts-node` while
preserving the existing NodeNext/compiled-ESM output as the default.

## CLI option

Add:

```text
--module-import-style esm|ts-node
```

The default is `esm`.

- `esm` preserves current relative `.js` module specifiers and remains the
  mode for NodeNext compilation and compiled Node ESM.
- `ts-node` emits extensionless relative module specifiers so plain CommonJS
  `ts-node` can resolve generated `.ts` sources directly.

Package imports, including SDK subpaths, are unaffected.

`DamlInterfaceGeneratorOptions` owns `moduleImportStyle`; direct construction
accepts it in generator options, while the CLI parser passes the parsed value
into a newly constructed generator. Injectable CLI generators continue to be
used unchanged when supplied by unit tests. `ProjectEmitter` receives the value
and configures all downstream emitters from that one policy.

## Scope

The setting flows through one shared relative-import-specifier policy, rather
than post-processing emitted text. It is used by template relative paths, named
type relative paths, registry imports, support namespace/index barrels, and all
generated-spec imports (including dynamic sample imports and hard-coded
contracts, runtime, registry, and index support specs). It applies consistently
to template modules, named type modules, support files, registry, namespace
barrels, root index, and every generated sibling spec.

## Validation

Generator coverage emits both modes from the same fixtures:

- ESM mode retains `.js` relative specifiers and current NodeNext compilation.
- ts-node mode has no relative `.js` specifiers and is executable through plain
  CommonJS `ts-node`.
- Sibling specs follow the selected mode.
- Configured Vault Base generation verifies the ts-node import style throughout
  the generated tree.

The SDK adds `ts-node` as a development dependency. The integration fixture
uses an explicit CommonJS/Node TypeScript configuration and runs source files
through `node -r ts-node/register`. It proves the generated template and root
index load via `require`, and runs a generated source `.spec.ts` file. This mode
is intentionally incompatible with NodeNext compilation; consumers selecting it
must use a CommonJS `ts-node` configuration. SDK package imports continue to
resolve through the package's `require` export conditions.

## Non-goals

- Changing the default ESM behavior.
- Supporting `ts-node --esm` as a separate mode.
- Rewriting package imports or generated package metadata.
