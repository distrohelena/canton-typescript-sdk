# Local Quickstart Scripts Design

## Goal

Add repo-local helper scripts for starting and stopping a Canton quickstart-backed local ledger stack for SDK testing, while keeping developer-specific quickstart paths out of source control.

## Scope

This change adds:

- `node/start-local.sh`
- `node/stop-local.sh`
- root `.env.example`
- root `.gitignore` entry for `.env`
- optional `package.json` convenience scripts

This change does not vendor or duplicate the quickstart checkout itself.

## Design

The scripts should closely follow the existing pattern in `~/env/daml-ops/node/start-local.sh` and `~/env/daml-ops/node/stop-local.sh`.

### Script Location

Shell scripts live under `node/`:

- `node/start-local.sh`
- `node/stop-local.sh`

This keeps executable local-tooling helpers grouped together without turning `node/` into a configuration directory.

### Config Location

Developer-specific configuration lives at the repo root:

- `.env.example` committed
- `.env` ignored

The only required value is:

- `CN_QUICKSTART_DIR=/absolute/path/to/cn-quickstart/quickstart`

### Resolution Order

The scripts should resolve the quickstart directory in this order:

1. `CN_QUICKSTART_DIR` from the current shell environment
2. `CN_QUICKSTART_DIR` from the repo root `.env`
3. the same relative-path fallbacks used by the existing `daml-ops` scripts

### Runtime Behavior

Once the quickstart directory is resolved, the scripts should behave near-identically to the existing `daml-ops` versions:

- prefer `make start-local-ledger` / `make stop-local-ledger` when available
- otherwise fall back to direct `docker compose` orchestration
- keep the same health wait and auth-mode logic
- keep the quickstart-owned `.env`, `.env.local`, and compose-file handling inside the quickstart checkout

The TypeScript SDK repo should not duplicate quickstart runtime config beyond the path pointer.

### Package Scripts

Add convenience commands:

- `start:local-ledger`
- `stop:local-ledger`

These should simply call the shell scripts.

## Recommendation

Implement near-identical shell behavior with a root-level `.env` pointer, because it preserves the known working workflow from `daml-ops` while keeping the SDK repo’s local configuration minimal.
