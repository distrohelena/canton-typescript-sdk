# Local Quickstart Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add repo-local helper scripts for starting and stopping a Canton quickstart ledger stack using a root `.env` pointer to the developer's quickstart checkout.

**Architecture:** Keep executable helpers under `node/`, keep developer-specific config at the repo root, and preserve the existing `daml-ops` shell behavior as closely as possible. The scripts should read `CN_QUICKSTART_DIR` from the current environment or root `.env`, then run the same quickstart-ledger startup and shutdown flow.

**Tech Stack:** Bash, root `.env` / `.env.example`, npm package scripts

---

## File Structure

- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `node/start-local.sh`
- Create: `node/stop-local.sh`

### Task 1: Add Root Environment Contract

**Files:**
- Create: `.env.example`
- Modify: `.gitignore`
- Test: manual file presence verification

- [ ] **Step 1: Write the failing expectation**

Expected root files:

- `.env.example` exists and documents `CN_QUICKSTART_DIR`
- `.gitignore` ignores root `.env`

- [ ] **Step 2: Verify the expectation fails**

Run: `ls -la .env.example`
Expected: missing file

- [ ] **Step 3: Write minimal implementation**

Create `.env.example` with:

```bash
CN_QUICKSTART_DIR=/absolute/path/to/cn-quickstart/quickstart
```

Update `.gitignore` to include:

```gitignore
.env
```

- [ ] **Step 4: Verify it passes**

Run: `sed -n '1,80p' .env.example`
Expected: shows the `CN_QUICKSTART_DIR` example

- [ ] **Step 5: Commit**

```bash
git add .env.example .gitignore
git commit -m "chore: add root env contract for local quickstart scripts"
```

### Task 2: Add `node/start-local.sh`

**Files:**
- Create: `node/start-local.sh`
- Test: `node/start-local.sh --help` is not required; verify via shell syntax and dry path resolution

- [ ] **Step 1: Write the failing expectation**

Expected behavior:

- script resolves `CN_QUICKSTART_DIR` from shell env first
- then from root `.env`
- then from the same relative fallback locations used by `daml-ops`
- startup behavior matches the existing `daml-ops` script as closely as possible

- [ ] **Step 2: Verify it fails**

Run: `bash -n node/start-local.sh`
Expected: file missing

- [ ] **Step 3: Write minimal implementation**

Create `node/start-local.sh` by adapting the existing `~/env/daml-ops/node/start-local.sh` script:

- keep the quickstart resolution logic
- add root `.env` reading before fallback locations
- keep `make start-local-ledger` preference
- keep the direct `docker compose` fallback path

- [ ] **Step 4: Verify it passes**

Run: `bash -n node/start-local.sh`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add node/start-local.sh
git commit -m "feat: add local quickstart start script"
```

### Task 3: Add `node/stop-local.sh`

**Files:**
- Create: `node/stop-local.sh`
- Test: shell syntax verification

- [ ] **Step 1: Write the failing expectation**

Expected behavior:

- script resolves the same root `.env` quickstart path
- shutdown behavior matches the existing `daml-ops` stop script as closely as possible

- [ ] **Step 2: Verify it fails**

Run: `bash -n node/stop-local.sh`
Expected: file missing

- [ ] **Step 3: Write minimal implementation**

Create `node/stop-local.sh` by adapting the existing `~/env/daml-ops/node/stop-local.sh` script:

- keep the same quickstart resolution logic
- keep `make stop-local-ledger` preference
- keep the direct `docker compose` fallback path

- [ ] **Step 4: Verify it passes**

Run: `bash -n node/stop-local.sh`
Expected: exit 0

- [ ] **Step 5: Commit**

```bash
git add node/stop-local.sh
git commit -m "feat: add local quickstart stop script"
```

### Task 4: Add npm Convenience Scripts

**Files:**
- Modify: `package.json`
- Test: script presence verification

- [ ] **Step 1: Write the failing expectation**

Expected package scripts:

- `start:local-ledger`
- `stop:local-ledger`

- [ ] **Step 2: Verify it fails**

Run: `npm run`
Expected: the two local-ledger commands are absent

- [ ] **Step 3: Write minimal implementation**

Add:

```json
"start:local-ledger": "bash node/start-local.sh",
"stop:local-ledger": "bash node/stop-local.sh"
```

- [ ] **Step 4: Verify it passes**

Run: `npm run`
Expected: both local-ledger scripts appear

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "chore: add npm wrappers for local quickstart scripts"
```

### Task 5: Verify The Tooling Change

**Files:**
- Modify as needed: `README.md` only if usage note is necessary

- [ ] **Step 1: Run shell syntax verification**

Run:

```bash
bash -n node/start-local.sh
bash -n node/stop-local.sh
```

Expected: both exit 0

- [ ] **Step 2: Verify npm script registration**

Run: `npm run`
Expected: `start:local-ledger` and `stop:local-ledger` are listed

- [ ] **Step 3: Optional dry configuration check**

Run with a fake path only if the script supports a non-destructive resolution check. Otherwise skip.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: add local quickstart tooling"
```

## Notes For The Implementer

- Preserve the `daml-ops` shell behavior closely; do not redesign the runtime flow.
- Keep developer-specific configuration at the root `.env`, not under `node/`.
- Do not commit the real `.env`.
- Prefer shell compatibility and clarity over abstraction for this feature.
