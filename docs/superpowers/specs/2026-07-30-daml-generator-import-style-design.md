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

## Scope

The setting flows through emission path generation. It applies consistently to
template modules, named type modules, support files, registry, namespace
barrels, root index, and every generated sibling spec. It is not implemented by
rewriting output strings after emission.

## Validation

Generator coverage emits both modes from the same fixtures:

- ESM mode retains `.js` relative specifiers and current NodeNext compilation.
- ts-node mode has no relative `.js` specifiers and is executable through plain
  `ts-node`.
- Sibling specs follow the selected mode.
- Configured Vault Base generation verifies the ts-node import style throughout
  the generated tree.

## Non-goals

- Changing the default ESM behavior.
- Supporting `ts-node --esm` as a separate mode.
- Rewriting package imports or generated package metadata.
