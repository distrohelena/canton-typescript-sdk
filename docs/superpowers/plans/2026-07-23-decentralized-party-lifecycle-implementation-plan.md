# Decentralized Party Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide a safe, ergonomic SDK lifecycle for creating Canton decentralized-namespace external parties, with both online callbacks and offline detached signing.

**Architecture:** The party-management client will build a deterministic decentralized namespace and generic topology proposals, then use the topology manager to obtain canonical transaction bytes/hashes. A new DTO family preserves the exact prepared bundle and assigns each required signature to an owner or party protocol key. Finalization validates detached results locally and sends per-transaction signatures to the existing external-party allocation RPC.

**Tech Stack:** TypeScript, Vitest, generated Canton v30 protobufs, gRPC transport, existing Canton hashing helpers.

---

## File structure

- Create `src/core/types/requests/create-decentralized-party-request.ts` — validated shared/online creation inputs, key owners, callback request/result types.
- Create `src/core/types/requests/finalize-decentralized-party-request.ts` — immutable prepared bundle and caller-returned detached signatures.
- Create `src/services/party-management/decentralized-party-lifecycle.ts` — deterministic ID derivation, proposal construction, callback collection, and finalization validation.
- Modify `src/core/types/canton-hash-purpose.ts` — name the Canton decentralized-namespace hash purpose (`37`).
- Modify `src/core/types/topology/topology-signature-format.ts` and `src/services/topology-manager-write/topology-signed-transaction-assembler.ts` — support ECDSA DER/SHA-256 topology signatures alongside Ed25519 concat signatures.
- Modify `src/transports/grpc/mappers/topology-manager-write-mapper.ts` — serialize decentralized namespace definitions and namespace delegations, and retain `ecSecp256k1` `keySpec` with deprecated scheme unspecified.
- Modify `src/services/party-management/party-management-service-client.ts`, `src/client/service-registry.ts`, and `src/index.ts` — inject the participant-admin topology writer into the ledger-admin party service and expose the three public lifecycle methods and DTOs.
- Modify `tests/unit/client/canton-hashing-client.test.ts`, `tests/unit/core/topology-write-dto.test.ts`, `tests/unit/services/topology-signed-transaction-assembler.test.ts`, `tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts`, `tests/unit/services/parties-client.test.ts`, `tests/unit/client/service-registry-endpoints.test.ts`, `tests/unit/json/json-parties-client.test.ts`, and `tests/unit/smoke/package-shape.test.ts` — unit, mapper, client, endpoint wiring, JSON rejection, and package export coverage.
- Modify `README.md` — concise online and offline usage examples and the Canton bootstrap/threshold semantics.

### Task 1: Canonical identifiers and topology DTO support

**Files:**
- Modify: `src/core/types/canton-hash-purpose.ts`
- Modify: `src/core/types/topology/topology-signature-format.ts`
- Modify: `src/services/topology-manager-write/topology-signed-transaction-assembler.ts`
- Modify: `tests/unit/client/canton-hashing-client.test.ts`
- Modify: `tests/unit/services/topology-signed-transaction-assembler.test.ts`

- [ ] **Step 1: Write failing tests for the derived decentralized namespace and ECDSA topology signatures.**

  Add a fixed two-owner test vector that derives owner fingerprints via `CantonClient.hashing.computePublicKeyFingerprint`, sorts them, hashes their length-prefixed UTF-8 values with purpose `37`, and asserts the expected multihash namespace. Add an assembler case using a secp256k1 detached signature and assert `format: "der"` and `signingAlgorithmSpec: "ecDsaSha256"` in the assembled transaction.

- [ ] **Step 2: Run the focused tests and verify they fail.**

  Run: `rtk npm test -- tests/unit/client/canton-hashing-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts`

  Expected: FAIL because purpose `37` and the ECDSA topology signature format are not yet modeled.

- [ ] **Step 3: Implement the smallest reusable primitives.**

  Add `decentralizedNamespace = 37` to `CantonHashPurpose`. Add an `ecDsaSha256` topology signature format that maps to wire format `der` and algorithm `ecDsaSha256`; keep the existing Ed25519 mapping unchanged. Do not duplicate the existing public-key normalization—call `computeCantonPublicKeyFingerprint` from the lifecycle helper planned in Task 3.

- [ ] **Step 4: Re-run focused tests.**

  Run: `rtk npm test -- tests/unit/client/canton-hashing-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit the primitive support.**

  Run: `rtk git add src/core/types/canton-hash-purpose.ts src/core/types/topology/topology-signature-format.ts src/services/topology-manager-write/topology-signed-transaction-assembler.ts tests/unit/client/canton-hashing-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts && rtk git commit -m "feat: support decentralized topology signatures"`

### Task 2: Generic topology mapper variants

**Files:**
- Modify: `src/transports/grpc/mappers/topology-manager-write-mapper.ts`
- Modify: `tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts`

- [ ] **Step 1: Write failing mapper tests.**

  Construct a `GenerateTopologyTransactionsRequest` containing one `DecentralizedNamespaceDefinition`, one root `NamespaceDelegation`, and one `PartyToParticipant` with `TopologySigningPublicKey({ keySpec: "ecSecp256k1" })`. Assert the generated protobuf oneofs are `decentralizedNamespaceDefinition`, `namespaceDelegation`, and `partyToParticipant`, that the key spec is `EC_SECP256K1`, and its deprecated scheme is `UNSPECIFIED`.

- [ ] **Step 2: Run the focused mapper test and verify it fails.**

  Run: `rtk npm test -- tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts`

  Expected: FAIL with unsupported mapping type for decentralized definitions/delegations.

- [ ] **Step 3: Implement only the required mapping branches.**

  Import the two existing SDK topology classes and their generated protobuf equivalents. Extend `mapGrpcTopologyMapping` with oneof branches; map delegation namespace, target key, root-delegation boolean, and any restriction. Preserve the generic key mapper’s `keySpec`; explicitly leave the deprecated scheme unspecified for `ecSecp256k1`.

- [ ] **Step 4: Re-run the focused mapper test.**

  Run: `rtk npm test -- tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit mapper support.**

  Run: `rtk git add src/transports/grpc/mappers/topology-manager-write-mapper.ts tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts && rtk git commit -m "feat: map decentralized topology proposals"`

### Task 3: Public DTOs and deterministic preparation

**Files:**
- Create: `src/core/types/requests/create-decentralized-party-request.ts`
- Create: `src/core/types/requests/finalize-decentralized-party-request.ts`
- Create: `src/services/party-management/decentralized-party-lifecycle.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/services/parties-client.test.ts`
- Test: `tests/unit/client/service-registry-endpoints.test.ts`
- Test: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write failing DTO/preparation tests.**

  Cover validation for empty hint/synchronizer, fewer than two owners, duplicate canonical fingerprints, absent signing callbacks in the online request, absent explicit thresholds, and out-of-range thresholds. Stub `getParticipantIdAsync` and the injected participant-admin `generateTransactionsAsync`; assert preparation resolves the local participant UID, then submits in order: serial-1 DND, one root delegation per owner, then `PartyToParticipant` whose `party` equals `hint::derivedNamespace`, whose local host uses that resolved UID and requested confirmation/observation permission, and whose embedded keys/threshold match input. Assert all returned signing requests use canonical generated transaction hashes and SDK-derived fingerprints.

- [ ] **Step 2: Run focused client/export tests and verify failure.**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/smoke/package-shape.test.ts`

  Expected: FAIL because the request types and lifecycle methods do not exist.

- [ ] **Step 3: Implement immutable request and prepared-bundle DTOs.**

  Define separate owner and party-signing-key inputs containing `publicKey` and optional callback; online creation requires every callback while offline preparation allows none. Define immutable prepared transaction metadata with role and required signer fingerprints; define detached results by signing-request ID and signature result so finalization—not callers—sets `signedByFingerprint`. Clone all byte arrays and arrays in constructors.

- [ ] **Step 4: Implement prepare and export it through the client.**

  In `decentralized-party-lifecycle.ts`, convert external keys to `TopologySigningPublicKey` with the correct format, usage, key spec, and derived fingerprint. Derive the namespace with existing `computeCantonPublicKeyFingerprint` plus `computeCantonHashHex(..., CantonHashPurpose.decentralizedNamespace)`. Resolve the local host through the ledger-admin `getParticipantIdAsync`, build exactly the Task 3 proposal sequence using that UID (including confirmation threshold validation), call the injected participant-admin `TopologyManagerWriteServiceClient.generateTransactionsAsync`, and reject a response count/order mismatch. Make the new topology-writer constructor argument on `PartyManagementServiceClient` optional: all current direct `GrpcLedgerClient`, `JsonLedgerClient`, channel-factory, and unit-test constructions remain source compatible, while invoking decentralized preparation without the dependency throws a clear `NotSupportedError` before any signer runs. In `service-registry.ts`, construct the topology-writer service once and inject that instance into `PartyManagementServiceClient`; retain the same instance as `topologyManagerWriteService` in the registry. Add endpoint-wiring tests for both the injected participant-admin path and the missing-endpoint error.

- [ ] **Step 5: Re-run focused client/export tests.**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/smoke/package-shape.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit preparation API.**

  Run: `rtk git add src/core/types/requests/create-decentralized-party-request.ts src/core/types/requests/finalize-decentralized-party-request.ts src/services/party-management/decentralized-party-lifecycle.ts src/services/party-management/party-management-service-client.ts src/client/service-registry.ts src/index.ts tests/unit/services/parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/smoke/package-shape.test.ts && rtk git commit -m "feat: prepare decentralized party topology"`

### Task 4: Offline finalization and online callback lifecycle

**Files:**
- Modify: `src/services/party-management/decentralized-party-lifecycle.ts`
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/json/json-parties-client.test.ts`

- [ ] **Step 1: Write failing lifecycle tests.**

  Given a prepared fixture, verify finalization rejects a missing founder signature on DND, insufficient owner signatures on an owner-controlled transaction, missing proof-of-possession from any party signing key, duplicate/unknown request IDs, and malformed signature bytes before allocation. Verify success converts detached results into `ExternalPartyOnboardingTransaction`s with per-transaction signatures and an empty multihash array. Verify online creation invokes every owner for all owner requests, each party key for its PTP proof request, then calls the same finalizer. Add a JSON transport test proving it rejects before callbacks execute.

- [ ] **Step 2: Run lifecycle/JSON tests and verify failure.**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts`

  Expected: FAIL because finalization and online decentralized creation do not exist.

- [ ] **Step 3: Implement finalization.**

  Resolve each detached response against immutable prepared metadata; reject missing, duplicate, unknown, empty, or unsupported results. Require all founders for DND, at least `ownerThreshold` distinct owners for each later namespace-authorized transaction, and every initial protocol key for PTP. Convert formats consistently to `ExternalPartySignature`; construct the allocation request with `multiHashSignatures: []`, preserve identity-provider/wait/user fields, and forward options.

- [ ] **Step 4: Implement the online wrapper.**

  Require callbacks through the online request constructor, call preparation, invoke only the callback associated with each prepared request, collect results in request order, and call finalization. Propagate signer, topology, and allocation failures unchanged.

- [ ] **Step 5: Re-run lifecycle/JSON tests.**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commit lifecycle support.**

  Run: `rtk git add src/services/party-management/decentralized-party-lifecycle.ts src/services/party-management/party-management-service-client.ts tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts && rtk git commit -m "feat: finalize decentralized party lifecycle"`

### Task 5: Documentation and complete verification

**Files:**
- Modify: `README.md`
- Modify: `tests/unit/core/topology-write-dto.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`
- Create: `tests/live/specs/live-decentralized-party-lifecycle.test.ts`

- [ ] **Step 1: Add failing public-shape tests.**

  Assert the new DTOs and lifecycle methods are available from the package entry point, and that an ECDSA topology signature DTO preserves its format.

- [ ] **Step 2: Run the focused public-shape tests and verify failure if any export is missing.**

  Run: `rtk npm test -- tests/unit/core/topology-write-dto.test.ts tests/unit/smoke/package-shape.test.ts`

  Expected: PASS after Task 3 exports; otherwise fix missing exports before continuing.

- [ ] **Step 3: Document both workflows.**

  Add minimal README examples for `createDecentralizedPartyAsync` and `prepareDecentralizedPartyAsync`/`finalizeDecentralizedPartyAsync`. State explicitly that all founders sign bootstrap DND, owner threshold controls subsequent topology, and all initial party keys prove possession while `partySigningThreshold` controls Daml transaction signing.

- [ ] **Step 4: Add the opt-in live decentralized-party lifecycle test.**

  Follow `tests/live/specs/live-external-party-management.test.ts` for environment setup and cleanup. Gate the suite behind `SDK_TEST_ENABLE_DECENTRALIZED_PARTY === "1"`. With two independent externally held owner keys and two protocol signing keys, prepare a bundle; prove the SDK rejects an incomplete DND signature set and an incomplete party-key proof set without allocation; then complete all required signatures, allocate, and read the party back. Include a direct, deliberately incomplete per-transaction allocation attempt where the configured live Canton version can surface Canton’s bootstrap rejection, so the test verifies that the serial-1 DND requires both owners. Assert the final read-back party ID, namespace, hosting mapping, owner threshold, and party-signing threshold. Use a unique hint and a 60-second test timeout.

- [ ] **Step 5: Run full relevant verification.**

  Run: `rtk npm test -- tests/unit/client/canton-hashing-client.test.ts tests/unit/core/topology-write-dto.test.ts tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/services/parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/json/json-parties-client.test.ts tests/unit/smoke/package-shape.test.ts && rtk npm run build && rtk npm run lint -- --max-warnings=0 && rtk git diff --check`

  Expected: all focused tests, build, lint, and diff check PASS. If the repository-wide suite requires live infrastructure, report that separately rather than treating it as a unit failure.

- [ ] **Step 6: Run the opt-in live test when the configured Canton environment is available.**

  Run: `SDK_TEST_ENABLE_DECENTRALIZED_PARTY=1 rtk npx vitest run tests/live/specs/live-decentralized-party-lifecycle.test.ts --maxWorkers=1 --testTimeout=60000`

  Expected: PASS against a Canton environment that accepts decentralized external-party topology. If unavailable, leave the test gated and report the environment prerequisite.

- [ ] **Step 7: Commit docs and final tests.**

  Run: `rtk git add README.md tests/unit/core/topology-write-dto.test.ts tests/unit/smoke/package-shape.test.ts tests/live/specs/live-decentralized-party-lifecycle.test.ts && rtk git commit -m "docs: describe decentralized party lifecycle"`
