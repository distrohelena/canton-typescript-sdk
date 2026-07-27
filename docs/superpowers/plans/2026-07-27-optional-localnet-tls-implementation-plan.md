# Optional localnet TLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add opt-in generated or user-supplied TLS to every CN Quickstart participant Ledger/Admin API and make generated trust roots usable by the SDK gRPC client.

**Architecture:** Keep TLS disabled by default. When enabled, the Bash launcher validates or generates a CA/server pair, writes one deterministic Canton HOCON/Compose overlay that composes with the existing ES256 overlay, and applies `ledger-api.tls` plus `admin-api.tls` to primary and extra participants. Extend the SDK’s common gRPC options with in-memory trust-root bytes so clients can verify the generated CA without filesystem coupling.

**Tech Stack:** Bash, OpenSSL, Docker Compose, HOCON, TypeScript, `@grpc/grpc-js`, Vitest.

---

## File structure

- `node/start-local.sh` — validate TLS settings, generate/validate runtime material, produce the combined Canton/Compose overlay, and select direct Compose startup.
- `node/stop-local.sh` — include the persisted TLS overlay during direct Compose shutdown.
- `node/test-start-local.sh` and `node/test-stop-local.sh` — shell behavior and compatibility tests.
- `src/client/canton-client-options.ts` — store optional SDK trust-root bytes.
- `src/transports/grpc/grpc-call-options-factory.ts` and `grpc-channel-factory.ts` — pass roots into TLS credentials.
- `tests/unit/core/canton-client-options.test.ts` and `tests/unit/grpc/grpc-channel-factory.test.ts` — SDK contracts.
- `README.md` and `DOCUMENTATION.md` — launcher and SDK documentation.

## Task 1: Add SDK trust-root plumbing

**Files:**

- Modify: `tests/unit/core/canton-client-options.test.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`
- Modify: `src/client/canton-client-options.ts`
- Modify: `src/transports/grpc/grpc-call-options-factory.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`

- [ ] **Step 1: Write the failing option test.** Construct `CantonClientOptions` with `grpcTlsRootCertificates: new Uint8Array(...)` and assert it is retained; assert omission remains `undefined`.
- [ ] **Step 2: Run the red test.** Run `npm test -- tests/unit/core/canton-client-options.test.ts`; expect failure because the option does not exist.
- [ ] **Step 3: Implement the option.** Add `grpcTlsRootCertificates?: Uint8Array` to the constructor input and public readonly fields without changing TLS defaults.
- [ ] **Step 4: Write the failing credential test.** Assert TLS creation calls `createSsl(roots)`, TLS without roots calls `createSsl()`, and insecure creation still calls `createInsecure()`.
- [ ] **Step 5: Run the red credential test.** Run `npm test -- tests/unit/grpc/grpc-channel-factory.test.ts`; expect failure because roots are not propagated.
- [ ] **Step 6: Implement propagation.** Pass `options.grpcTlsRootCertificates` from `createGrpcOperations` to `createGrpcChannelCredentials`; preserve insecure behavior.
- [ ] **Step 7: Run focused SDK tests.** Run `npm test -- tests/unit/core/canton-client-options.test.ts tests/unit/grpc/grpc-channel-factory.test.ts`; expect PASS.
- [ ] **Step 8: Commit.** `git add` the five files and commit `feat: support custom gRPC TLS roots`.

## Task 2: Add failing launcher TLS tests

**Files:**

- Modify: `node/test-start-local.sh`
- Modify: `node/test-stop-local.sh`

- [ ] **Step 1: Extend stubs.** Record Compose arguments and inspect generated files without printing private key or token contents; add file-mode assertions.
- [ ] **Step 2: Add generated-mode tests.** Run with `LOCALNET_TLS=1` and `EXTRA_PARTICIPANTS=2`; assert direct Compose, read-only CA/server/key mounts, both TLS blocks for `app-provider`, `app-user`, `sv`, and every `extra-N`.
- [ ] **Step 3: Add supplied-mode tests.** Generate temporary OpenSSL material, assert supplied mounts and no generated material, and add failures for partial paths, unreadable files, and mismatched key/certificate.
- [ ] **Step 4: Add compatibility/stop tests.** Assert TLS disabled preserves Make startup, TLS enabled bypasses it, and stop includes the persisted TLS overlay.
- [ ] **Step 5: Run red.** Run `bash node/test-start-local.sh && bash node/test-stop-local.sh`; expect failure because the launcher lacks TLS support.

## Task 3: Implement generated and supplied launcher TLS

**Files:**

- Modify: `node/start-local.sh`
- Modify: `node/stop-local.sh`
- Modify: `node/test-start-local.sh`
- Modify: `node/test-stop-local.sh`

- [ ] **Step 1: Add strict settings.** Implement `resolve_tls_enabled`, `tls_runtime_dir`, and rotation validation; default to disabled and fail before Docker/Make for invalid values.
- [ ] **Step 2: Generate material.** Use OpenSSL to create/reuse a mode-`0600` CA key, server key, local CA, and SAN-bearing server certificate for `localhost`, `127.0.0.1`, and `canton`; rotate only with `LOCALNET_TLS_ROTATE=1`.
- [ ] **Step 3: Validate supplied material.** Require `LOCALNET_TLS_CERT_CHAIN_PATH`, `LOCALNET_TLS_PRIVATE_KEY_PATH`, and `LOCALNET_TLS_CA_CERT_PATH` together; validate readability, parsing, CA material, and matching public keys before Compose.
- [ ] **Step 4: Compose HOCON.** Refactor ES256 preparation so TLS and ES256 share one composite config that includes `/app/base-app.conf` once. Append `ledger-api.tls` and `admin-api.tls` for all primary participants and matching blocks for all generated extras.
- [ ] **Step 5: Compose mounts.** Mount the base config, composite config, and TLS files at stable read-only `/app/localnet-tls/*` paths; preserve ES256 sidecar/dependency behavior.
- [ ] **Step 6: Wire lifecycle.** Include the overlay in all direct Compose calls, include TLS in initial startup, bypass Make whenever an overlay is required, and make stop select the persisted overlay while retaining disabled-mode Make behavior.
- [ ] **Step 7: Run green shell tests.** Run `bash node/test-start-local.sh && bash node/test-stop-local.sh`; expect all existing and new cases to pass.
- [ ] **Step 8: Commit.** Commit launcher files as `feat: add optional localnet TLS`.

## Task 4: Document the end-to-end contract

**Files:** `README.md`, `DOCUMENTATION.md`

- [ ] **Step 1: Document launcher settings.** Cover `LOCALNET_TLS`, generated runtime files, rotation, all supplied paths, SAN/hostname requirements, and the fact that client certificate authentication remains disabled.
- [ ] **Step 2: Document SDK trust roots.** Show `readFileSync`/`Uint8Array` usage with `grpcTlsRootCertificates`; explain TLS remains default and insecure mode is explicit.
- [ ] **Step 3: Verify docs and syntax.** Run `bash -n node/start-local.sh`, `bash -n node/stop-local.sh`, `npm run build`, and `git diff --check`.
- [ ] **Step 4: Commit.** Commit docs as `docs: document localnet TLS`.

## Task 5: Full verification

- [ ] **Step 1: Run focused checks.** Run the SDK tests plus `npm run test:start-local-script` and `npm run test:stop-local-script`.
- [ ] **Step 2: Run full checks.** Run `npm run test:unit`, `npm run build`, `npm run verify:pack`, and `git diff --check`.
- [ ] **Step 3: Run live validation when available.** Start with `LOCALNET_TLS=1`, load the emitted CA into `grpcTlsRootCertificates`, and call Ledger and Admin APIs over TLS; repeat with an extra participant. Record a skip if Docker/Quickstart is unavailable.
- [ ] **Step 4: Preserve unrelated work.** Confirm only TLS implementation/docs/tests plus the existing `package.json` version change and `test.txt` remain in the worktree; do not reset or remove them.
