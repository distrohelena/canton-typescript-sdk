# NPM Publish Readiness Design

## Summary

The Canton TypeScript SDK should be prepared for an immediate public npm release under the scoped package name `@distrohelena/canton-typescript-sdk`.

This first public release will publish the library surfaces only:
- root package
- `./grpc`
- `./json`
- `./daml-lf`
- `./daml-interface`

It will not publish a CLI `bin` surface yet.

The published tarball should contain compiled library artifacts only, plus the minimal required package documents.

## Goals

- Make the package publicly publishable on npm now.
- Rename the package to `@distrohelena/canton-typescript-sdk`.
- Use `Apache-2.0` licensing to match the surrounding Canton/proto ecosystem already present in the repository.
- Publish only the supported library entrypoints.
- Exclude raw protobuf sources, source TypeScript, tests, local scripts, and internal docs from the tarball.
- Add a repeatable local verification flow that validates the packed artifact before publish.

## Non-Goals

- Publish a CLI command.
- Introduce a full release automation pipeline.
- Publish source TypeScript alongside compiled output.
- Publish raw `proto/` sources.
- Publish internal planning/spec documents.

## Public Package Identity

The public npm identity will be:
- `@distrohelena/canton-typescript-sdk`

This name should be reflected in:
- `package.json`
- README install examples
- README import examples
- any pack/publish verification assumptions

## License

The package should use:
- `Apache-2.0`

A root `LICENSE` file should be added so npm and GitHub metadata are consistent.

## Published Surface

The package should expose only the supported library subpaths:
- `.`
- `./grpc`
- `./json`
- `./daml-lf`
- `./daml-interface`

The package should not expose:
- a CLI `bin`
- raw generated/proto source trees as a supported source surface
- internal planning or test assets

## Tarball Contents

The tarball should include:
- `dist/**`
- `README.md`
- `LICENSE`

The tarball should exclude:
- `src/**`
- `proto/**`
- `tests/**`
- `docs/**`
- `node/**`
- `scripts/**`
- `DOCUMENTATION.md`
- local environment files

This should be enforced by `package.json` publish controls, not by convention alone.

## Package Metadata

`package.json` should be updated to include or finalize:
- `name`
- `license`
- `repository`
- `homepage`
- `bugs`
- `keywords`
- `files`
- `publishConfig.access = "public"`

`private: true` should be removed.

## Verification Contract

The package is considered publish-ready only if all of the following pass locally:

1. `npm run build`
2. `npm test`
3. `npm pack`
4. tarball content inspection confirms only intended files are shipped
5. packed package inspection confirms the intended export entrypoints are present

The verification flow should validate the actual packed artifact, not just the repository layout.

## README Expectations

README should be updated so that a public consumer can use it directly.

Minimum README updates:
- install command uses `@distrohelena/canton-typescript-sdk`
- import examples use the scoped name
- subpath examples use the scoped name
- publish-ready wording should not reference private/local-only assumptions

## Recommended Implementation Scope

The publish-readiness work should cover:
- package metadata cleanup
- root `LICENSE`
- publish surface tightening via `files`
- README package-name updates
- pack verification support

It should not expand into release automation, changelog policy, or CLI productization in this pass.

## Decision Summary

Chosen decisions:
- prepare for public npm release now
- publish as `@distrohelena/canton-typescript-sdk`
- use `Apache-2.0`
- publish library surfaces only
- publish compiled output only
- exclude `src/**`
- exclude `proto/**`
- include only `dist/**`, `README.md`, and `LICENSE` in the tarball
- require local `build`, `test`, and `pack` verification before publish
