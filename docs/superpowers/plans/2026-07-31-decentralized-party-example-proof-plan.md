# Decentralized Party Example Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a runnable TypeScript example that creates a decentralized Ed25519 party and proves its PartyToParticipant topology is active on localnet.

**Architecture:** The example follows the hosted and external examples: it obtains the localnet synchronizer, creates ephemeral in-memory Ed25519 key pairs, and uses `createDecentralizedPartyAsync`. It then polls the topology-manager read API until the PartyToParticipant mapping exposes the expected participant, party-signing keys, and threshold, or fails with a bounded timeout. Decentralized creation does not create the deprecated PartyToKeyMapping topology.

**Tech Stack:** TypeScript, Node.js `crypto`, SDK gRPC transport, existing localnet helpers.

---

### Task 1: Add the create-and-prove example

**Files:**
- Create: `examples/30-decentralized-party-ed25519.ts`
- Modify: `examples/shared/party-keys.ts`

- [ ] **Step 1: Write a failing structural test**

Assert the new example exists and invokes decentralized party creation plus PartyToParticipant topology verification.

- [ ] **Step 2: Run the structural test to verify it fails**

Run: `npm run examples:check` plus the focused test.
Expected: failure because the example file does not exist.

- [ ] **Step 3: Implement the minimum example**

Create two unique owner signers and one party-signing signer; call `createDecentralizedPartyAsync` with 2-of-2 owners and 1-of-1 party key; then poll `listPartyToParticipantAsync` for the created party and verify its participant, embedded party-signing key fingerprint, and threshold.

- [ ] **Step 4: Run the structural test and type-check**

Run: `npm run examples:check` and the focused test.
Expected: pass.

### Task 2: Prove it on localnet

**Files:**
- Test: `examples/30-decentralized-party-ed25519.ts`

- [ ] **Step 1: Run the example using Ledger- and Participant-admin JWT credentials**

Run: `npm run example:party:decentralized` with a shared token authorized for both Ledger Admin and Participant Admin, or with both `SDK_EXAMPLE_LEDGER_ADMIN_BEARER_TOKEN` and `SDK_EXAMPLE_PARTICIPANT_ADMIN_BEARER_TOKEN` set.
Expected: printed party identifier and confirmed PartyToParticipant mapping with its embedded Ed25519 key and threshold.

- [ ] **Step 2: Run regression checks**

Run: `npm run examples:check`, `npm run build`, and `git diff --check`.
Expected: all exit zero.

- [ ] **Step 3: Commit**

Run: `git add examples ... && git commit -m "feat: prove decentralized party example"`.
