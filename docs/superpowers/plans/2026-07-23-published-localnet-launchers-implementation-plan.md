# Published Localnet Launchers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish the DAML Ops localnet launchers in the SDK npm tarball and expose stable start/stop commands to package consumers.

**Architecture:** The `node/` directory remains a verbatim mirror of the current DAML Ops working-tree scripts. `package.json` expands the package allowlist and declares two shell-backed `bin` commands. The existing tarball verifier is extended so automated tests and `npm run verify:pack` reject packages that omit the launcher files or expose incorrect bin metadata.

**Tech Stack:** npm package metadata, Bash, Node.js ESM, Vitest, tar.

**Source baseline:** Copy from `/home/helena/env/daml-ops/node` at implementation time. Its checked-out commit is `f8e119f52d6f6ebcc01df2ad96f3492d0f557408`, with deliberate uncommitted localnet improvements in `start-local.sh` and `test-start-local.sh`; the working tree, not only that commit, is the source of truth.

---

## File structure

- `node/start-local.sh` — published start launcher, synced verbatim from DAML Ops.
- `node/stop-local.sh` — published stop launcher, synced verbatim from DAML Ops.
- `node/test-start-local.sh` — start-launcher behavioral test, synced verbatim from DAML Ops.
- `node/test-stop-local.sh` — stop-launcher behavioral test, newly synced verbatim from DAML Ops.
- `package.json` — declares packed `node/` assets, two `bin` commands, and the stop-test npm script.
- `tests/unit/package/npm-pack-verification-script.test.ts` — locks package metadata and pack-verifier behavior.
- `scripts/verify-npm-pack.mjs` — validates launcher tar entries and packed `bin` metadata.
- `README.md` — documents installed and `npm exec` launcher usage plus `CN_QUICKSTART_DIR` configuration.

### Task 1: Lock package publication expectations with failing unit tests

**Files:**

- Modify: `tests/unit/package/npm-pack-verification-script.test.ts`

- [ ] **Step 1: Add the failing package-metadata assertions**

  Extend `PackageJsonShape` with `bin?: Record<string, string>`. Change the expected `files` list to include `"node"`, and add expectations for:

  ```ts
  expect(packageJson.bin).toEqual({
      "canton-localnet-start": "node/start-local.sh",
      "canton-localnet-stop": "node/stop-local.sh",
  });
  expect(packageJson.scripts?.["test:stop-local-script"]).toBe(
      "bash node/test-stop-local.sh",
  );
  ```

- [ ] **Step 2: Add failing allowed-path and packed-bin verifier tests**

  Extend the verifier module type with helpers exported for testing. Add cases that require `package/node/start-local.sh`, `package/node/stop-local.sh`, `package/node/test-start-local.sh`, and `package/node/test-stop-local.sh` to be allowed, while `package/node/unexpected.sh` remains disallowed. Add a test asserting the expected two bin mappings are required.

- [ ] **Step 3: Run the focused test to verify it fails**

  Run: `rtk npm test -- tests/unit/package/npm-pack-verification-script.test.ts`

  Expected: FAIL because `package.json` lacks the `node` packed path, bin mappings, stop-test script, and verifier support.

- [ ] **Step 4: Commit the test-only red state if the project convention allows it; otherwise leave it uncommitted until Task 2**

  Do not commit a knowingly failing default test suite unless repository policy explicitly permits red commits.

### Task 2: Implement published package metadata and tarball validation

**Files:**

- Modify: `package.json`
- Modify: `scripts/verify-npm-pack.mjs`

- [ ] **Step 1: Update `package.json` minimally**

  Add `"node"` to the `files` array. Add exactly:

  ```json
  "bin": {
    "canton-localnet-start": "node/start-local.sh",
    "canton-localnet-stop": "node/stop-local.sh"
  }
  ```

  Add `"test:stop-local-script": "bash node/test-stop-local.sh"` next to the existing localnet script test command. Preserve all existing public exports and scripts.

- [ ] **Step 2: Extend the pack verifier**

  In `scripts/verify-npm-pack.mjs`, define an explicit required set for the four `package/node/*.sh` files. Keep all other `package/node/` entries disallowed, and fail with a clear error naming each required script absent from the tarball. Export a small helper that returns the expected bin map (or validates it) for unit testing. Add validation that the packed `package.json` contains precisely the two launcher bin entries with the paths above. Fail with a clear error naming any missing/mismatched command.

- [ ] **Step 3: Run the focused test to verify it passes**

  Run: `rtk npm test -- tests/unit/package/npm-pack-verification-script.test.ts`

  Expected: PASS.

- [ ] **Step 4: Commit the package publication change**

  ```bash
  rtk git add package.json scripts/verify-npm-pack.mjs tests/unit/package/npm-pack-verification-script.test.ts
  rtk git commit -m "feat: publish localnet launchers"
  ```

### Task 3: Sync start launcher and its DAML Ops regression test verbatim

**Files:**

- Modify: `node/test-start-local.sh`
- Modify: `node/start-local.sh`
- Source: `/home/helena/env/daml-ops/node/test-start-local.sh`
- Source: `/home/helena/env/daml-ops/node/start-local.sh`

- [ ] **Step 1: Copy only the source test script and verify it is red**

  Copy `test-start-local.sh` from the DAML Ops working tree without modification, preserving its executable mode. This test includes the new Pqs `TransactionTreeStream` expectation and the corrected participant-admin right-grant stub behavior.

  Run: `rtk bash node/test-start-local.sh`

  Expected: FAIL against the older SDK `start-local.sh`, because the new test checks behavior not yet present locally.

- [ ] **Step 2: Copy the source launcher verbatim**

  Copy `start-local.sh` from DAML Ops without editing, preserving its executable mode. Do not rewrite paths, formatting, or logic.

- [ ] **Step 3: Verify green and byte-for-byte identity**

  Run:

  ```bash
  rtk bash node/test-start-local.sh
  rtk cmp -s node/start-local.sh /home/helena/env/daml-ops/node/start-local.sh
  rtk cmp -s node/test-start-local.sh /home/helena/env/daml-ops/node/test-start-local.sh
  ```

  Expected: all commands exit 0.

- [ ] **Step 4: Commit the synced start launcher**

  ```bash
  rtk git add node/start-local.sh node/test-start-local.sh
  rtk git commit -m "fix: sync localnet start launcher"
  ```

### Task 4: Sync stop launcher and its DAML Ops regression test verbatim

**Files:**

- Create: `node/test-stop-local.sh`
- Modify: `node/stop-local.sh`
- Source: `/home/helena/env/daml-ops/node/test-stop-local.sh`
- Source: `/home/helena/env/daml-ops/node/stop-local.sh`

- [ ] **Step 1: Copy only the source stop test and verify it is red**

  Copy `test-stop-local.sh` from DAML Ops unchanged, preserving executable mode.

  Run: `rtk bash node/test-stop-local.sh`

  Expected: FAIL because the SDK does not yet contain `node/stop-local.sh` behavior matching the new test/source pair (or because the test exposes the current implementation gap).

- [ ] **Step 2: Copy the source stop launcher verbatim**

  Copy DAML Ops' `stop-local.sh` unchanged, preserving executable mode.

- [ ] **Step 3: Verify green and identity for the complete `node/` contract**

  Run:

  ```bash
  rtk bash node/test-stop-local.sh
  rtk cmp -s node/stop-local.sh /home/helena/env/daml-ops/node/stop-local.sh
  rtk cmp -s node/test-stop-local.sh /home/helena/env/daml-ops/node/test-stop-local.sh
  rtk cmp -s node/start-local.sh /home/helena/env/daml-ops/node/start-local.sh
  rtk cmp -s node/test-start-local.sh /home/helena/env/daml-ops/node/test-start-local.sh
  ```

  Expected: all commands exit 0.

- [ ] **Step 4: Commit the synced stop launcher**

  ```bash
  rtk git add node/stop-local.sh node/test-stop-local.sh
  rtk git commit -m "fix: sync localnet stop launcher"
  ```

### Task 5: Document and perform final package verification

**Files:**

- Modify: `README.md`

- [ ] **Step 1: Add concise consumer documentation**

  Add a “Localnet launchers” section near “Live Integration Tests”. Document both installed commands and `npm exec --package` usage, state that `CN_QUICKSTART_DIR` points to the CN Quickstart checkout, and note that Docker Compose remains a prerequisite. Do not claim the scripts provision or replace CN Quickstart.

- [ ] **Step 2: Run format/lint and final checks**

  Run:

  ```bash
  rtk npm run lint
  rtk npm test -- tests/unit/package/npm-pack-verification-script.test.ts
  rtk bash -n node/start-local.sh
  rtk bash -n node/stop-local.sh
  rtk bash -n node/test-start-local.sh
  rtk bash -n node/test-stop-local.sh
  rtk npm run test:start-local-script
  rtk npm run test:stop-local-script
  rtk npm run verify:pack
  rtk git diff --check
  rtk git status --short
  ```

  Expected: lint and all selected tests pass; package verification confirms the launcher files and bin metadata; `git diff --check` prints nothing. Any unrelated existing failures must be reported separately.

- [ ] **Step 3: Commit documentation and final verification changes**

  ```bash
  rtk git add README.md
  rtk git commit -m "docs: document localnet launcher commands"
  ```
