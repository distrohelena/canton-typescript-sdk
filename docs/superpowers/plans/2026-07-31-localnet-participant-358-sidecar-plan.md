# Canton 3.5.8 Participant Sidecar Implementation Plan

**Goal:** Start and stop an SDK-owned Canton 3.5.8 participant that connects to the existing localnet without changing `cn-quickstart`.

1. Add start/stop shell launchers and package bins. Generate all Compose, Canton config, exported synchronizer JSON, and runtime data under `.generated/participant-358`.
2. Start `ghcr.io/digital-asset/decentralized-canton-sync/docker/canton:0.6.12` with a dedicated Postgres container, project name, Docker network attachment, and non-conflicting ports.
3. Export the existing participant's `ListRegisteredSynchronizers` configuration through the SDK/protobuf client; submit it to the sidecar Admin API through `ConnectSynchronizer`; wait until one healthy synchronizer is reported.
4. Add shell/unit validation for project, port, image, and runtime isolation; test that stop targets only the sidecar. Add an opt-in Docker smoke test for a 3.5.8 Ledger API response.
5. Update README with start/stop commands, prerequisites, endpoint exports, and strict `cn-quickstart` read-only behavior.
