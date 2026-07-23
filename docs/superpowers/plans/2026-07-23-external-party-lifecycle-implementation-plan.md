# External Party Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one gRPC party-management convenience method that creates an externally controlled party from caller-owned ED25519 or secp256k1 signing material.

**Architecture:** Keep the existing generate-topology and allocate-external-party RPC wrappers unchanged. A new SDK-local request DTO and `PartyManagementServiceClient` method orchestrate those wrappers, invoke a caller-provided signer for every required payload, attach the returned signatures with Canton’s generated key fingerprint, and return the existing allocation response.

**Tech Stack:** TypeScript, existing external-party DTOs, gRPC transport, Vitest.

---

## File structure

- `src/core/types/requests/create-external-party-request.ts` — immutable convenience request and signer callback input/result types.
- `src/services/party-management/party-management-service-client.ts` — one orchestration method layered on current low-level service calls.
- `src/index.ts` — public exports for the request and callback types.
- `tests/unit/services/parties-client.test.ts` — lifecycle ordering, payload, signature-assembly, validation, and failure tests.
- `tests/unit/json/json-parties-client.test.ts` — non-gRPC lifecycle propagation regression.
- `README.md` — concise HSM/KMS/wallet signer example.

### Task 1: Define the lifecycle request and callback contract

**Files:**

- Create: `src/core/types/requests/create-external-party-request.ts`
- Modify: `tests/unit/services/parties-client.test.ts`

- [ ] **Step 1: Write failing request-contract tests**

  Add tests that construct `CreateExternalPartyRequest` with a raw ED25519 public key and verify it preserves synchronizer, party hint, public key, observation/confirmation options, allocation options, and the callback. Add a secp256k1 fixture using `ExternalPartySigningKeySpec.ecSecp256k1` and `ExternalPartySigningAlgorithmSpec.ecDsaSha256`. Assert constructor validation rejects empty synchronizer, empty party hint, empty `keyData`, and absent signer.

- [ ] **Step 2: Run red**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts`

  Expected: FAIL because `CreateExternalPartyRequest` does not exist.

- [ ] **Step 3: Implement the minimal DTO**

  Define exported types:

  ```ts
  type ExternalPartySigningPayloadKind = "topology-transaction" | "multi-hash";
  interface ExternalPartySigningRequest {
    readonly payload: Uint8Array;
    readonly kind: ExternalPartySigningPayloadKind;
    readonly partyId: string;
    readonly publicKeyFingerprint: string;
  }
  interface ExternalPartySigningResult {
    readonly signature: Uint8Array;
    readonly format: ExternalPartySignatureFormat;
    readonly signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec;
  }
  type ExternalPartySigner = (request: ExternalPartySigningRequest) => Promise<ExternalPartySigningResult>;
  ```

  Make the request copy all byte arrays/arrays defensively, require non-empty synchronizer, party hint, and public-key material, and retain the existing generation/allocation option names. Do not validate cryptographic compatibility locally beyond those structural preconditions.

- [ ] **Step 4: Run green**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add src/core/types/requests/create-external-party-request.ts tests/unit/services/parties-client.test.ts
  rtk git commit -m "feat: add external party lifecycle request"
  ```

### Task 2: Orchestrate topology generation, caller signing, and allocation

**Files:**

- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `tests/unit/services/parties-client.test.ts`
- Modify: `tests/unit/json/json-parties-client.test.ts`

- [ ] **Step 1: Write failing lifecycle tests**

  Give the fake transport a topology response with two transactions, a multi-hash, party ID, and fingerprint. Call `createExternalPartyAsync` with a signer spy and one `RequestOptions` instance. Assert, in order:

  1. generation receives an equivalent `GenerateExternalPartyTopologyRequest` and the same options;
  2. signer calls receive each raw transaction with `kind: "topology-transaction"`, then the raw multi-hash with `kind: "multi-hash"`, all with generated party/fingerprint context;
  3. allocation receives an `AllocateExternalPartyRequest` with one `ExternalPartyOnboardingTransaction` per topology transaction, each callback signature, the multi-hash signature, generated `signedByFingerprint`, and the same options;
  4. the returned value is the low-level `AllocateExternalPartyResponse`.

  Add ED25519 and secp256k1 signing-result fixtures. Add a signer-rejection test asserting allocation is never called and the exact signer error rejects. Add a generation/transport rejection test asserting the signer is not called. In `json-parties-client.test.ts`, call the new method through a JSON client and assert its existing `NotSupportedError` rejects before the signer callback or allocation can run.

- [ ] **Step 2: Run red**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts`

  Expected: FAIL because `createExternalPartyAsync` is absent.

- [ ] **Step 3: Implement only service-local orchestration**

  Add `createExternalPartyAsync(request, options?)` to `PartyManagementServiceClient`. Create the existing generation request from the convenience request, await topology generation, then process `topologyTransactions` sequentially and call the supplied signer for each. Convert every result into an `ExternalPartySignature` whose `signedByFingerprint` is always `generated.publicKeyFingerprint`. Sign `generated.multiHash` with the `multi-hash` kind, assemble the existing allocation request, and delegate to `allocateExternalPartyAsync` with the original `options`.

  Preserve generated empty transaction arrays exactly. Do not catch/translate signer or transport exceptions. Do not add transport-interface or mapper changes: this method composes existing public service methods.

- [ ] **Step 4: Run green and existing service regression tests**

  Run:

  ```bash
  rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add src/services/party-management/party-management-service-client.ts tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts
  rtk git commit -m "feat: add external party lifecycle helper"
  ```

### Task 3: Export and document the convenience surface

**Files:**

- Modify: `src/index.ts`
- Modify: `README.md`
- Modify: `tests/unit/services/parties-client.test.ts`

- [ ] **Step 1: Add a failing public-entry-point import**

  Import `CreateExternalPartyRequest` and signer-related types from `src/index.ts` in the lifecycle test, proving consumers do not need internal paths.

- [ ] **Step 2: Run red**

  Run: `rtk npm test -- tests/unit/services/parties-client.test.ts`

  Expected: FAIL because the new symbols are not publicly exported.

- [ ] **Step 3: Export and document**

  Export the request and signer types from `src/index.ts`. Add a README section showing a caller-provided ED25519 public key and an async signer callback, and state that secp256k1 works through the same existing DTO enums. Document that private-key custody stays with the application and that the callback signs topology transactions plus the multihash.

- [ ] **Step 4: Run focused checks**

  Run:

  ```bash
  rtk npm test -- tests/unit/services/parties-client.test.ts
  rtk npm run build
  rtk git diff --check
  ```

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  rtk git add src/index.ts README.md tests/unit/services/parties-client.test.ts
  rtk git commit -m "docs: describe external party lifecycle"
  ```

### Task 4: Final validation

**Files:** Verify only.

- [ ] **Step 1: Run relevant unit suites and scoped lint**

  Run:

  ```bash
  rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/json/json-parties-client.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/unit/grpc/grpc-external-party-management-mapper.test.ts tests/unit/client/service-registry-endpoints.test.ts
  rtk npm run build
  rtk npx eslint src/core/types/requests/create-external-party-request.ts src/services/party-management/party-management-service-client.ts src/index.ts tests/unit/services/parties-client.test.ts
  rtk git diff --check
  ```

  Expected: PASS.

- [ ] **Step 2: Request a code review**

  Have a reviewer verify callback ordering, generated-fingerprint binding, no allocation after signing failures, public export/documentation completeness, and compatibility with the existing low-level APIs.

- [ ] **Step 3: Store the completed lifecycle decision in Graphiti memory**

  Record that the SDK’s external-party convenience method composes existing gRPC topology/allocation APIs and accepts caller-owned signing keys through a callback; it does not generate or store private keys.
