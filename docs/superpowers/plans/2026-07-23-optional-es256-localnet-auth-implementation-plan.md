# Optional ES256 Localnet Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an opt-in, self-managed ES256 JWT path to the packaged localnet launchers for all primary and extra participants.

**Architecture:** Keep existing Quickstart authentication intact and add a second Canton `jwt-jwks` auth service when `LOCALNET_ES256_JWT=1`. A package-owned Node helper generates/validates P-256 material and mints JOSE-compliant tokens; Bash generates a JWKS sidecar and HOCON/Compose overlays, then starts or stops them with the existing topology.

**Tech Stack:** Bash, Node.js built-in `node:crypto`, Node ESM, Docker Compose, HOCON, Vitest.

---

## File structure

- `node/es256-jwt.mjs` — published CLI/helper for P-256 key generation, public JWK derivation, JWKS matching, and ES256 token minting.
- `node/start-local.sh` — validates opt-in settings, generates/reuses runtime files, adds the JWKS sidecar/config overlay, and writes a safe token file.
- `node/stop-local.sh` — resolves the same ES256 overlay and stops the sidecar with the localnet.
- `node/test-start-local.sh` — shell-level generated, supplied, disabled, extra-participant, and invalid-configuration cases.
- `node/test-stop-local.sh` — shell-level sidecar topology shutdown checks.
- `tests/unit/node/es256-jwt.test.ts` — crypto contract tests for JWK and JWT production.
- `tests/unit/package/npm-pack-verification-script.test.ts` — asserts the helper is shipped.
- `scripts/verify-npm-pack.mjs` — requires `package/node/es256-jwt.mjs` in the tarball.
- `README.md` — documents activation, runtime files, supplied-key setup, and bearer-token use.

### Task 1: Create the ES256 helper contract with red unit tests

**Files:**

- Create: `tests/unit/node/es256-jwt.test.ts`
- Create: `node/es256-jwt.mjs`

- [ ] **Step 1: Write failing helper tests**

  Test an exported `generateKeyMaterialAsync(runtimeDirectory)` returning a PEM P-256 private key, a JWK `{ kty: "EC", crv: "P-256", x, y, kid, use: "sig", alg: "ES256" }`, and a JWKS `{ keys: [jwk] }`. Test `mintToken(...)` produces three base64url parts whose decoded header is exactly `{ alg: "ES256", typ: "JWT", kid }` and whose payload has `sub`, `aud`, `iat`, `nbf`, and bounded `exp`.

  Verify the signature with `node:crypto.verify("sha256", signingInput, { key: publicKey, dsaEncoding: "ieee-p1363" }, signature)`. Add invalid TTL, non-P-256 key, and mismatching supplied JWKS tests.

- [ ] **Step 2: Run red**

  Run: `rtk npm test -- tests/unit/node/es256-jwt.test.ts`

  Expected: FAIL because `node/es256-jwt.mjs` does not exist.

- [ ] **Step 3: Implement only the helper**

  Use `generateKeyPairSync("ec", { namedCurve: "prime256v1" })`, `createPublicKey(...).export({ format: "jwk" })`, `createPrivateKey`, and `sign("sha256", input, { key, dsaEncoding: "ieee-p1363" })`. Generate a stable `kid` from the public JWK thumbprint (SHA-256 over canonical `crv`, `kty`, `x`, `y`). Provide CLI subcommands `init`, `validate-supplied`, and `mint`; emit JSON/token only to stdout and diagnostics to stderr. Create private files mode `0600` and public JWKS/token files mode `0600`.

- [ ] **Step 4: Run green**

  Run: `rtk npm test -- tests/unit/node/es256-jwt.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add node/es256-jwt.mjs tests/unit/node/es256-jwt.test.ts
  rtk git commit -m "feat: add ES256 localnet token helper"
  ```

### Task 2: Make the helper a required packed runtime asset

**Files:**

- Modify: `tests/unit/package/npm-pack-verification-script.test.ts`
- Modify: `scripts/verify-npm-pack.mjs`

- [ ] **Step 1: Write failing package-verifier assertions**

  Add `package/node/es256-jwt.mjs` to the expected allowed-and-required packed paths, while retaining rejection of arbitrary `package/node/*` files.

- [ ] **Step 2: Run red**

  Run: `rtk npm test -- tests/unit/package/npm-pack-verification-script.test.ts`

  Expected: FAIL because the verifier lacks the new required path.

- [ ] **Step 3: Extend the verifier minimally**

  Add only `package/node/es256-jwt.mjs` to its explicit required/allowed runtime set. Do not publish tests or source files.

- [ ] **Step 4: Run green and pack check**

  Run:

  ```bash
  rtk npm test -- tests/unit/package/npm-pack-verification-script.test.ts
  rtk npm run verify:pack
  ```

  Expected: both PASS; the tarball contains the helper.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add scripts/verify-npm-pack.mjs tests/unit/package/npm-pack-verification-script.test.ts
  rtk git commit -m "test: require ES256 helper in package"
  ```

### Task 3: Add an additive ES256 Compose and Canton configuration overlay

**Files:**

- Modify: `node/test-start-local.sh`
- Modify: `node/start-local.sh`
- Modify: `node/test-stop-local.sh`
- Modify: `node/stop-local.sh`

- [ ] **Step 1: Add failing generated-mode shell tests**

  Extend the Docker stubs to record generated Compose/configuration files. Add a case with `LOCALNET_ES256_JWT=1` and `EXTRA_PARTICIPANTS=3` that expects:

  - a `localnet-es256-jwks` service and the generated JWKS volume,
  - `jwt-jwks`, the internal sidecar URL, and target audience in the primary overlay for `app-provider`, `app-user`, and `sv`,
  - the same `jwt-jwks` entry in every `extra-N` participant configuration,
  - the sidecar in initial startup and stop Compose arguments,
  - a mode-`0600` emitted token path, without its token contents in output.

  Add a disabled-mode regression asserting no ES256 files/Compose arguments are created.

- [ ] **Step 2: Run red**

  Run: `rtk bash node/test-start-local.sh && rtk bash node/test-stop-local.sh`

  Expected: FAIL because the scripts do not recognize `LOCALNET_ES256_JWT` or generate an overlay.

- [ ] **Step 3: Implement opt-in settings and generated-mode files**

  In both launchers, parse `LOCALNET_ES256_JWT` strictly as `0|1` (default `0`). Keep the existing `EXTRA_PARTICIPANTS` plus OAuth2 rejection: ES256 supports extras through the existing shared-secret provisioning path, not OAuth2 extra-PQS provisioning. Add one helper to resolve runtime state:

  - default runtime directory: `${START_LOCAL_ES256_RUNTIME_DIR:-$REPO_ROOT/.generated/localnet-es256}`;
  - default JWKS URL: `http://localnet-es256-jwks/jwks.json`;
  - `LOCALNET_ES256_ROTATE=1` regenerates generated material;
  - call `node/es256-jwt.mjs init` and `mint` only in generated mode;
  - generate `compose-es256-jwks.yaml` using a static `nginx:alpine` service and a read-only JWKS volume;
  - in that same Compose overlay, override `canton` by mounting the original `${LOCALNET_DIR}/conf/canton/app.conf` at `/app/base-app.conf`, mounting the generated composite file at `/app/app.conf`, and declaring `depends_on.localnet-es256-jwks.condition: service_started`; the composite begins `include file("/app/base-app.conf")` and then appends `auth-services += { type = jwt-jwks, url = ..., target-audience = "https://canton.network.global" }` for `app-provider`, `app-user`, and `sv`;
  - add the same `jwt-jwks` object to generated extra participant ledger APIs.

  Append the overlay consistently to direct start and stop Compose args, and include `localnet-es256-jwks` in the initial `up -d` service list. When ES256 is enabled, bypass `make start-local-ledger` / `make stop-local-ledger` because their targets cannot receive this generated Compose file; retain the Make-target preference unchanged when disabled. Add explicit tests for both the disabled Make path and the enabled direct-Compose path. Preserve all disabled-mode behavior and existing shared-secret/OAuth2 profiles.

- [ ] **Step 4: Run green**

  Run: `rtk bash node/test-start-local.sh && rtk bash node/test-stop-local.sh`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add node/start-local.sh node/stop-local.sh node/test-start-local.sh node/test-stop-local.sh
  rtk git commit -m "feat: add optional ES256 localnet auth"
  ```

### Task 4: Support supplied persistent key and JWKS material

**Files:**

- Modify: `node/test-start-local.sh`
- Modify: `node/start-local.sh`

- [ ] **Step 1: Write failing supplied-mode and validation tests**

  Add shell cases for matching `LOCALNET_ES256_PRIVATE_KEY_PATH` plus `LOCALNET_ES256_JWKS_URL`, only one supplied value, a missing/unreadable PEM, a mismatching fetched JWKS, `LOCALNET_ES256_JWT=invalid`, and a TTL outside `1..600`. Assert supplied mode does not create the local JWKS sidecar and uses the external URL in all primary/extra HOCON entries.

- [ ] **Step 2: Run red**

  Run: `rtk bash node/test-start-local.sh`

  Expected: FAIL because supplied-mode validation and external-JWKS branching are absent.

- [ ] **Step 3: Implement supplied mode**

  Require private PEM and JWKS URL together. Use `node/es256-jwt.mjs validate-supplied` to reject non-P-256 material or JWK mismatch before any Compose command. Use the supplied key for `mint`; omit the sidecar only in this mode. Set the generated token’s default subject to `ledger-api-user`, fixed audience to `https://canton.network.global`, and reject a custom subject only if empty (document that it must already be provisioned with rights).

- [ ] **Step 4: Run green**

  Run: `rtk bash node/test-start-local.sh`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add node/start-local.sh node/test-start-local.sh
  rtk git commit -m "feat: support supplied ES256 localnet keys"
  ```

### Task 5: Document use and verify a configured localnet when available

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Document the opt-in contract**

  Add an “Optional ES256 bearer tokens” subsection under Localnet launchers. Include generated mode, supplied mode, runtime directory/rotation, token-file path, 10-minute expiry, `ledger-api-user` authorization requirement, and `SDK_TEST_LEDGER_BEARER_TOKEN=$(cat ...)`. State this is development-only and that `AUTH_MODE` remains active for Quickstart internals.

- [ ] **Step 2: Run final automated checks**

  Run:

  ```bash
  rtk npm test -- tests/unit/node/es256-jwt.test.ts
  rtk npm test -- tests/unit/package/npm-pack-verification-script.test.ts
  rtk node --check node/es256-jwt.mjs
  rtk bash -n node/start-local.sh
  rtk bash -n node/stop-local.sh
  rtk npm run test:start-local-script
  rtk npm run test:stop-local-script
  rtk npm run verify:pack
  rtk git diff --check
  ```

  Expected: PASS.

- [ ] **Step 3: Perform the opt-in integration check when Docker and CN Quickstart are available**

  Run the launcher with `LOCALNET_ES256_JWT=1`, read the emitted token path, and call an SDK Ledger API version/health operation using `SDK_TEST_LEDGER_BEARER_TOKEN`. Repeat against one extra participant with `EXTRA_PARTICIPANTS=1`. Record a skipped integration check only when Docker or the Quickstart checkout is unavailable; do not substitute a TCP check for token acceptance.

- [ ] **Step 4: Commit docs**

  ```bash
  rtk git add README.md
  rtk git commit -m "docs: document ES256 localnet bearer tokens"
  ```
