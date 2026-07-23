# Published localnet launchers design

## Goal

Publish the CN Quickstart localnet launchers with
`@distrohelena/canton-typescript-sdk`, while keeping the SDK copies exactly
aligned with the newer scripts in `~/env/daml-ops/node`.

## Scope

- Replace the SDK's `node/start-local.sh`, `node/stop-local.sh`, and
  `node/test-start-local.sh` with the DAML Ops versions byte-for-byte.
- Add DAML Ops' `node/test-stop-local.sh` to the SDK unchanged.
- Include the complete `node/` directory in the npm package.
- Expose start and stop launchers through npm `bin` entries:
  `canton-localnet-start` and `canton-localnet-stop`.
- Retain repository npm scripts and add an npm command for the stop-script
  test.

## Package interface

Once installed, consumers can run either executable:

```bash
npm exec --package @distrohelena/canton-typescript-sdk canton-localnet-start
npm exec --package @distrohelena/canton-typescript-sdk canton-localnet-stop
```

The launchers retain their existing configuration contract. `CN_QUICKSTART_DIR`
may point to the CN Quickstart checkout; otherwise the script searches its
existing supported relative paths. A `.env` placed at the installed package
root is also read by the scripts as today.

## Boundaries

The test shell scripts ship as part of `node/` to preserve the source directory
exactly, but are not public executables. No TypeScript API, Docker Compose
configuration, or CN Quickstart behavior changes are in scope.

## Verification

Automated verification will:

1. Compare checksums of all four SDK scripts with DAML Ops' source copies.
2. Run shell syntax checks and the start/stop script test suites.
3. Run `npm pack --dry-run` and assert the tarball includes the `node/`
   launchers.
4. Inspect the packed metadata to verify both npm `bin` commands resolve to
   the intended scripts.

## Error handling

The launchers retain their existing fail-fast behavior for an unavailable CN
Quickstart checkout or Docker Compose command. No wrapper masks, rewrites, or
otherwise changes those errors.
