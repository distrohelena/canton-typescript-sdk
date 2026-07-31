# Localnet Canton 3.5.8 Participant Sidecar Design

## Goal

Provide an opt-in Canton Participant 3.5.8 sidecar that runs alongside, but independently from, the existing CN Quickstart localnet. It supports SDK compatibility testing without a 3.5.8 Quickstart checkout or changes to the normal 3.5.7 stack.

## User interface

Add these commands:

```bash
canton-localnet-participant-358-start
canton-localnet-participant-358-stop
```

The start command requires the ordinary localnet to be running. It accepts a configurable 3.5.8 Canton image, Compose project, runtime directory, distinct Ledger/Admin/JSON ports, and explicit synchronizer connection details. It prints SDK-ready endpoint variables after a successful health check and never prints secrets.

## Architecture

`node/start-local-participant-358.sh` validates inputs and writes generated Compose/Canton configuration under an isolated `.generated/` runtime directory. Its Compose project contains only a 3.5.8 Canton participant and dedicated Postgres service. It initializes a fresh participant/database, then connects to the supplied existing-localnet synchronizer.

The sidecar must not share container names, Compose project, ports, database, volumes, generated files, or stop commands with the ordinary localnet. `node/stop-local-participant-358.sh` reconstructs the isolated project and runs scoped Compose down; it never targets the Quickstart project.

## Safety and readiness

Validate nonempty configuration and reject normal-localnet port collisions before Docker starts. Wait for participant health and prove Ledger/Admin reachability before reporting ready. A failed synchronizer connection must identify the failed configuration field and leave the normal localnet untouched.

## Testing

Extend launcher tests to assert the generated image/config, name and port isolation, rejected missing synchronizer data/colliding ports, scoped stop behavior, and packed-script inclusion. Add an opt-in Docker smoke test that starts the sidecar against an existing localnet, verifies Ledger API version 3.5.8, then stops only the sidecar. It does not allocate parties.
