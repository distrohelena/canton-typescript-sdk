# Localnet Readiness Wait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start the localnet only when Canton and its dependent services are actually ready, without rejecting slow hardware after an arbitrary timeout.

**Architecture:** Replace the bounded health loops with one lifecycle-aware polling helper: `wait_for_container_readiness <container> <predicate> [predicate args...]`. It polls each service every two seconds, waits indefinitely while the container is running but unready, and reports health transitions plus 30-second log-tail diagnostics. The helper invokes `container_health_is_ready` for Splice/onboarding and `canton_and_extras_are_ready` for Canton with the extra-participant count.

**Tech Stack:** Bash, Docker CLI inspection/logs, existing shell regression harness.

---

### Task 1: Add failing readiness-wait regression cases

**Files:**
- Modify: `node/test-start-local.sh:20-190` — extend `run_case` and its fake Docker binary with deterministic inspect-state sequences and a no-op fake `sleep`.
- Modify: `node/test-start-local.sh:385-610` — add launcher cases near the current direct-start and extra-participant cases.

- [ ] **Step 1: Add a failing slow-Canton launcher test**

Extend the fake `docker inspect` implementation so a `slow-canton` mode returns `running starting` for Canton’s first 31 health polls and `running healthy` on the next poll. Add a fake `sleep` executable in `stubbin` that exits successfully so the test remains fast. Run the direct-start fallback with `slow-canton`; assert startup completes and that the output includes the readiness transition/progress diagnostic.

- [ ] **Step 2: Run the shell suite and confirm the slow-Canton case fails for the current 30-poll limit**

Run: `bash node/test-start-local.sh`

Expected: non-zero exit; the new slow-Canton scenario is rejected after the existing 30 checks with `canton did not become healthy after 60 seconds.`

- [ ] **Step 3: Add a failing exited-Canton diagnostic test**

Add an `exited-canton` fake-Docker mode that returns `exited none` for Canton lifecycle inspection and emits a deterministic line for `docker logs --tail 40 canton`. Run the direct-start fallback expecting failure, and assert output includes the lifecycle state and the log-tail marker.

- [ ] **Step 4: Run the shell suite and confirm the exited-container diagnostic assertion fails for the right reason**

Run: `bash node/test-start-local.sh`

Expected: non-zero exit; current code only reads `.State.Health.Status`, retries until its fixed deadline, and never requests container logs.

- [ ] **Step 5: Add a failing slow-dependent-service test**

Run the direct-start fallback with `EXTRA_PARTICIPANTS=1`. In a `slow-splice` mode, return `running healthy` for Canton, `running starting` for the first 61 Splice polls, then `running healthy`; keep onboarding healthy. Assert the launcher reaches the extra-PQS startup command. This demonstrates the generic Splice/onboarding wait no longer has its former 60-poll cutoff.

- [ ] **Step 6: Run the shell suite and confirm the slow-dependent-service case fails at the existing 60-poll limit**

Run: `bash node/test-start-local.sh`

Expected: non-zero exit; the new case fails with `splice did not become healthy after 120 seconds.`

- [ ] **Step 7: Commit the red test harness**

```bash
rtk git add node/test-start-local.sh
rtk git commit -m "test: cover localnet readiness waiting"
```

### Task 2: Replace deadline-based loops with lifecycle-aware readiness waiting

**Files:**
- Modify: `node/start-local.sh:961-995` — replace `wait_for_container_health` and `wait_for_canton_health`.
- Modify: `node/start-local.sh:1193-1194` — remove the obsolete attempts/delay arguments from dependent-service calls.

- [ ] **Step 1: Add shared container-state and diagnostics helpers**

Read Docker lifecycle state and health status together using a single `docker inspect` format. Add a helper to print the last 40 container log lines. Treat an empty inspection result or any lifecycle state other than `running` as terminal: write the container name/state and the log tail to stderr, then return failure. Do not treat a running container with health `starting` or `unhealthy` as terminal.

- [ ] **Step 2: Implement the one shared readiness loop**

Implement an unbounded `wait_for_container_readiness(container, predicate, ...)` loop. On each two-second poll it first reads the lifecycle/health state, handles terminal lifecycle failures, then invokes the supplied predicate with the container name and its optional arguments. Return when the predicate succeeds; otherwise retain the latest observed lifecycle/health state, print on changes, and every 30 seconds print the state plus the bounded log tail. Remove attempt counters, elapsed-time failures, and the two optional numeric arguments.

- [ ] **Step 3: Add small readiness predicates and wire all callers through the shared helper**

Add `container_health_is_ready(container)` for the ordinary Docker-health check and `canton_and_extras_are_ready(container, extra_participants)` for Canton health plus `extra_participants_healthy`. Call the shared helper for Canton with `canton_and_extras_are_ready "$extra_participants"`, and for Splice/onboarding with `container_health_is_ready`. Since generated extra participants run in the Canton container, an endpoint still missing while Canton is running remains a wait condition; a non-running Canton container immediately emits Canton diagnostics and fails.

- [ ] **Step 4: Update dependent-service call sites**

Replace `wait_for_container_health splice 60 2` with `wait_for_container_readiness splice container_health_is_ready`, and replace `wait_for_container_health splice-onboarding 60 2` with `wait_for_container_readiness splice-onboarding container_health_is_ready`. Preserve the surrounding extra-participant provisioning order.

- [ ] **Step 5: Run the focused regression suite and verify all new cases pass**

Run: `bash node/test-start-local.sh`

Expected: exit 0. The slow Canton and slow Splice sequences complete, the exited Canton case fails immediately with its lifecycle/log diagnostics, and existing launcher cases still pass.

- [ ] **Step 6: Run static shell validation**

Run: `bash -n node/start-local.sh && bash -n node/test-start-local.sh`

Expected: exit 0.

- [ ] **Step 7: Inspect the final diff and commit**

Run: `rtk git diff --check && rtk git status --short`

Expected: no whitespace errors; only the readiness-wait implementation and its test harness are staged for this task.

```bash
rtk git add node/start-local.sh node/test-start-local.sh
rtk git commit -m "fix: wait for localnet readiness"
```
