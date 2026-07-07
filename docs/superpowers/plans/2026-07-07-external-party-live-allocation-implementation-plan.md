# External Party Live Allocation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the ledger-admin external-party gRPC APIs through `partyManagementService` and prove a fresh ED25519 external party becomes visible on a live local Canton node.

**Architecture:** Extend the existing ledger-admin `partyManagementService` with SDK-owned external-party DTOs and gRPC-only transport support, while keeping raw participant-admin topology write APIs as the lower layer. Validate the public happy path through a live gRPC spec that generates a fresh keypair, signs Canton’s returned multi-hash, allocates the external party, and verifies visibility through normal party reads.

**Tech Stack:** TypeScript, Vitest, existing `CantonClient`, protobuf-ts generated gRPC clients, Node `crypto`, `@distrohelena/linter`

---

## File Structure

### New files

- `src/core/types/external-party/external-party-crypto-key-format.ts`
  Responsibility: SDK-owned enum mirroring ledger-admin `CryptoKeyFormat`.
- `src/core/types/external-party/external-party-signing-key-spec.ts`
  Responsibility: SDK-owned enum mirroring ledger-admin `SigningKeySpec`.
- `src/core/types/external-party/external-party-signature-format.ts`
  Responsibility: SDK-owned enum mirroring ledger-admin `SignatureFormat`.
- `src/core/types/external-party/external-party-signing-algorithm-spec.ts`
  Responsibility: SDK-owned enum mirroring ledger-admin `SigningAlgorithmSpec`.
- `src/core/types/external-party/external-party-signing-public-key.ts`
  Responsibility: SDK-owned ledger-admin public-key DTO.
- `src/core/types/external-party/external-party-signature.ts`
  Responsibility: SDK-owned ledger-admin signature DTO.
- `src/core/types/external-party/external-party-onboarding-transaction.ts`
  Responsibility: SDK-owned onboarding-transaction DTO for allocation.
- `src/core/types/requests/generate-external-party-topology-request.ts`
  Responsibility: public request DTO for `GenerateExternalPartyTopology`.
- `src/core/types/requests/allocate-external-party-request.ts`
  Responsibility: public request DTO for `AllocateExternalParty`.
- `src/core/types/responses/generate-external-party-topology-response.ts`
  Responsibility: public response DTO for `GenerateExternalPartyTopology`.
- `src/core/types/responses/allocate-external-party-response.ts`
  Responsibility: public response DTO for `AllocateExternalParty`.
- `src/transports/grpc/mappers/external-party-management-mapper.ts`
  Responsibility: map SDK-owned external-party DTOs to and from ledger-admin protobuf-ts types.
- `tests/unit/core/external-party-dto.test.ts`
  Responsibility: DTO construction and defaults coverage.
- `tests/unit/grpc/grpc-external-party-management-mapper.test.ts`
  Responsibility: mapper coverage for the new ledger-admin RPCs.
- `tests/live/specs/live-external-party-management.test.ts`
  Responsibility: end-to-end external-party live happy-path proof.
- `tests/live/scenarios/create-live-external-party.ts`
  Responsibility: shared live helper for synchronizer discovery, key generation, signing, and allocation.

### Modified files

- `src/index.ts`
  Responsibility: public exports for the new external-party DTO family.
- `src/services/party-management/party-management-service-client.ts`
  Responsibility: add literal ledger-admin external-party public methods.
- `src/core/transports/transport.interface.ts`
  Responsibility: extend transport contract with external-party ledger-admin methods.
- `src/client/service-registry.ts`
  Responsibility: wire the new methods through the existing ledger-admin surface and endpoint gating.
- `src/transports/grpc/grpc-channel-factory.ts`
  Responsibility: bind generated ledger-admin client calls for the new RPCs.
- `src/transports/grpc/grpc-transport.ts`
  Responsibility: gRPC implementation of the new public external-party methods.
- `src/transports/json/json-transport.ts`
  Responsibility: reject the new methods with `NotSupportedError`.
- `tests/unit/services/parties-client.test.ts`
  Responsibility: service forwarding coverage.
- `tests/unit/grpc/grpc-parties-client.test.ts`
  Responsibility: gRPC service/client behavior coverage.
- `tests/unit/json/json-parties-client.test.ts`
  Responsibility: JSON rejection coverage.
- `tests/unit/client/service-registry-endpoints.test.ts`
  Responsibility: endpoint routing and missing-ledger-admin behavior coverage.
- `tests/unit/client/canton-client-construction.test.ts`
  Responsibility: package-shape sanity for the expanded party management service.
- `tests/unit/smoke/package-shape.test.ts`
  Responsibility: root export smoke coverage for the new DTOs.
- `tests/live/runtime/live-connectivity-preflight.ts`
  Responsibility: fail-fast validation for the new ledger-admin gRPC surface when the external-party spec is in scope.
- `tests/live/coverage/canton-client-live-coverage.ts`
  Responsibility: mark the new surface covered or explicitly scoped.
- `README.md`
  Responsibility: public service map and live test guidance.
- `DOCUMENTATION.md`
  Responsibility: describe each new public function and its gRPC-only behavior.

## Task 1: Add SDK-Owned External-Party DTOs And Exports

**Files:**
- Create: `src/core/types/external-party/external-party-crypto-key-format.ts`
- Create: `src/core/types/external-party/external-party-signing-key-spec.ts`
- Create: `src/core/types/external-party/external-party-signature-format.ts`
- Create: `src/core/types/external-party/external-party-signing-algorithm-spec.ts`
- Create: `src/core/types/external-party/external-party-signing-public-key.ts`
- Create: `src/core/types/external-party/external-party-signature.ts`
- Create: `src/core/types/external-party/external-party-onboarding-transaction.ts`
- Create: `src/core/types/requests/generate-external-party-topology-request.ts`
- Create: `src/core/types/requests/allocate-external-party-request.ts`
- Create: `src/core/types/responses/generate-external-party-topology-response.ts`
- Create: `src/core/types/responses/allocate-external-party-response.ts`
- Modify: `src/index.ts`
- Test: `tests/unit/core/external-party-dto.test.ts`
- Test: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing DTO tests**

```ts
it("keeps external-party request bytes and defaults stable", () => {
    const request = new GenerateExternalPartyTopologyRequest({
        synchronizer: "sync::1",
        partyHint: "ed25519_party",
        publicKey: new ExternalPartySigningPublicKey({
            format: ExternalPartyCryptoKeyFormat.raw,
            keyData: new Uint8Array([1, 2, 3]),
            keySpec: ExternalPartySigningKeySpec.ecCurve25519,
        }),
    });

    expect(request.partyHint).toBe("ed25519_party");
    expect(request.publicKey.keyData).toEqual(new Uint8Array([1, 2, 3]));
});
```

- [ ] **Step 2: Run DTO tests to verify they fail**

Run: `rtk npm test -- tests/unit/core/external-party-dto.test.ts tests/unit/smoke/package-shape.test.ts`
Expected: FAIL with missing DTO classes or exports.

- [ ] **Step 3: Add the DTOs and root exports**

Implementation notes:
- mirror ledger-admin crypto field names where they differ from topology DTOs, for example `keyData`
- keep constructors C#-style and SDK-owned
- use `Uint8Array` for raw bytes
- export everything from `src/index.ts`

- [ ] **Step 4: Re-run DTO tests**

Run: `rtk npm test -- tests/unit/core/external-party-dto.test.ts tests/unit/smoke/package-shape.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/core/types/external-party src/core/types/requests/generate-external-party-topology-request.ts src/core/types/requests/allocate-external-party-request.ts src/core/types/responses/generate-external-party-topology-response.ts src/core/types/responses/allocate-external-party-response.ts src/index.ts tests/unit/core/external-party-dto.test.ts tests/unit/smoke/package-shape.test.ts
rtk git commit -m "Add external party DTOs"
```

## Task 2: Extend Party Management And Transport Contracts

**Files:**
- Modify: `src/services/party-management/party-management-service-client.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Modify: `src/client/service-registry.ts`
- Test: `tests/unit/services/parties-client.test.ts`
- Test: `tests/unit/client/service-registry-endpoints.test.ts`
- Test: `tests/unit/client/canton-client-construction.test.ts`

- [ ] **Step 1: Write the failing service-forwarding and endpoint tests**

```ts
await expect(
    client.partyManagementService.generateExternalPartyTopologyAsync(request, options),
).resolves.toBeInstanceOf(GenerateExternalPartyTopologyResponse);

await expect(
    services.partyManagementService.allocateExternalPartyAsync(request),
).rejects.toThrow("ledger admin endpoint");
```

- [ ] **Step 2: Run the focused service tests to verify they fail**

Run: `rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/client/canton-client-construction.test.ts`
Expected: FAIL with missing methods on `partyManagementService` or missing transport contract.

- [ ] **Step 3: Add the new public methods and service wiring**

Implementation notes:
- add `generateExternalPartyTopologyAsync(...)`
- add `allocateExternalPartyAsync(...)`
- keep them on the existing ledger-admin `partyManagementService`
- add lazy missing-endpoint behavior through the existing ledger-admin service registry path

- [ ] **Step 4: Re-run the focused service tests**

Run: `rtk npm test -- tests/unit/services/parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/client/canton-client-construction.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/services/party-management/party-management-service-client.ts src/core/transports/transport.interface.ts src/client/service-registry.ts tests/unit/services/parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/client/canton-client-construction.test.ts
rtk git commit -m "Add external party party-management surface"
```

## Task 3: Implement gRPC Ledger-Admin Mapping And Transport

**Files:**
- Create: `src/transports/grpc/mappers/external-party-management-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Test: `tests/unit/grpc/grpc-external-party-management-mapper.test.ts`
- Test: `tests/unit/grpc/grpc-parties-client.test.ts`

- [ ] **Step 1: Write the failing mapper and gRPC transport tests**

```ts
expect(
    mapGrpcGenerateExternalPartyTopologyRequest(
        new GenerateExternalPartyTopologyRequest({
            synchronizer: "sync::1",
            partyHint: "ed25519_party",
            publicKey: new ExternalPartySigningPublicKey({
                format: ExternalPartyCryptoKeyFormat.raw,
                keyData: new Uint8Array([1, 2, 3]),
                keySpec: ExternalPartySigningKeySpec.ecCurve25519,
            }),
        }),
    ).partyHint,
).toBe("ed25519_party");
```

- [ ] **Step 2: Run mapper and gRPC tests to verify they fail**

Run: `rtk npm test -- tests/unit/grpc/grpc-external-party-management-mapper.test.ts tests/unit/grpc/grpc-parties-client.test.ts`
Expected: FAIL with missing mapper or missing gRPC transport methods.

- [ ] **Step 3: Implement minimal gRPC support**

Implementation notes:
- use the generated ledger-admin client in `grpc-channel-factory.ts`
- map SDK-owned enums to `com.daml.ledger.api.v2` crypto enums, not the participant-admin topology enums
- keep response mapping literal:
  - `partyId`
  - `publicKeyFingerprint`
  - `topologyTransactions`
  - `multiHash`

- [ ] **Step 4: Re-run the mapper and gRPC tests**

Run: `rtk npm test -- tests/unit/grpc/grpc-external-party-management-mapper.test.ts tests/unit/grpc/grpc-parties-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/transports/grpc/mappers/external-party-management-mapper.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts tests/unit/grpc/grpc-external-party-management-mapper.test.ts tests/unit/grpc/grpc-parties-client.test.ts
rtk git commit -m "Implement gRPC external party management"
```

## Task 4: Add JSON Rejection Coverage And Public Docs

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Modify: `tests/unit/json/json-parties-client.test.ts`
- Modify: `README.md`
- Modify: `DOCUMENTATION.md`

- [ ] **Step 1: Write the failing JSON rejection test**

```ts
await expect(
    client.partyManagementService.generateExternalPartyTopologyAsync(request),
).rejects.toThrow("not supported by json transport");
```

- [ ] **Step 2: Run the JSON party-management test to verify it fails**

Run: `rtk npm test -- tests/unit/json/json-parties-client.test.ts`
Expected: FAIL because JSON transport does not yet reject these new methods explicitly.

- [ ] **Step 3: Add JSON rejection and update public docs**

Implementation notes:
- throw `NotSupportedError` with literal ledger-admin RPC names
- update the README service map
- add concise function docs explaining `gRPC only`

- [ ] **Step 4: Re-run the JSON test**

Run: `rtk npm test -- tests/unit/json/json-parties-client.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
rtk git add src/transports/json/json-transport.ts tests/unit/json/json-parties-client.test.ts README.md DOCUMENTATION.md
rtk git commit -m "Document external party transport support"
```

## Task 5: Add Live External-Party Happy-Path Coverage

**Files:**
- Create: `tests/live/scenarios/create-live-external-party.ts`
- Create: `tests/live/specs/live-external-party-management.test.ts`
- Modify: `tests/live/runtime/live-connectivity-preflight.ts`
- Modify: `tests/live/coverage/canton-client-live-coverage.ts`
- Modify: `tests/live/coverage/canton-client-live-coverage.test.ts`

- [ ] **Step 1: Write the live spec first**

```ts
it("allocates a fresh ed25519 external party and reads it back", async () => {
    const result = await createLiveExternalPartyAsync(grpcClient);

    expect(result.partyId.startsWith("ed25519_party::")).toBe(true);

    const known = await grpcClient.partyManagementService.listKnownPartiesAsync(
        new ListKnownPartiesRequest({
            filterParty: result.partyId,
            pageSize: 10,
        }),
    );

    expect(known.partyDetails.some((item) => item.party === result.partyId)).toBe(true);
});
```

- [ ] **Step 2: Run the new live spec to verify it fails for the right reason**

Run: `rtk npm test -- tests/live/specs/live-external-party-management.test.ts`
Expected: FAIL with missing helper/methods, or fail fast on unsupported ledger-admin gRPC if the environment cannot serve the new surface.

- [ ] **Step 3: Add the live helper and preflight logic**

Implementation notes:
- discover synchronizer through `synchronizerConnectivityService.listConnectedSynchronizersAsync(...)`
- require exactly one healthy synchronizer candidate for the quickstart happy path
- use Node `crypto` to generate an ED25519 keypair and sign the returned `multiHash`
- build a public `ExternalPartySigningPublicKey` DTO from the generated public key bytes
- call `generateExternalPartyTopologyAsync(...)`
- call `allocateExternalPartyAsync(...)` with `waitForAllocation = true`
- verify visibility through:
  - `listKnownPartiesAsync(...)`
  - `getPartiesAsync(...)`

- [ ] **Step 4: Run the live spec**

Run: `rtk npm test -- tests/live/specs/live-external-party-management.test.ts`
Expected: PASS against a running local node, or fail with a concrete connectivity/API-availability error.

- [ ] **Step 5: Update the live coverage matrix**

Mark these members `covered` for `grpc`:
- `partyManagementService.getParticipantIdAsync` if the helper or preflight now proves it
- `partyManagementService.getPartiesAsync`
- `partyManagementService.generateExternalPartyTopologyAsync`
- `partyManagementService.allocateExternalPartyAsync`

- [ ] **Step 6: Commit**

```bash
rtk git add tests/live/scenarios/create-live-external-party.ts tests/live/specs/live-external-party-management.test.ts tests/live/runtime/live-connectivity-preflight.ts tests/live/coverage/canton-client-live-coverage.ts tests/live/coverage/canton-client-live-coverage.test.ts
rtk git commit -m "Add live external party allocation coverage"
```

## Task 6: Full Verification And Close-Out

**Files:**
- Modify: any files needed to resolve final type, lint, or doc drift found by verification

- [ ] **Step 1: Run the focused new unit tests**

Run:

```bash
rtk npm test -- tests/unit/core/external-party-dto.test.ts tests/unit/services/parties-client.test.ts tests/unit/grpc/grpc-external-party-management-mapper.test.ts tests/unit/grpc/grpc-parties-client.test.ts tests/unit/json/json-parties-client.test.ts tests/unit/client/service-registry-endpoints.test.ts
```

Expected: PASS

- [ ] **Step 2: Run the live external-party spec**

Run:

```bash
rtk npm test -- tests/live/specs/live-external-party-management.test.ts
```

Expected: PASS against a running local node

- [ ] **Step 3: Run the repo build**

Run: `rtk npm run build`
Expected: PASS

- [ ] **Step 4: Run lint with the configured Helena linter-backed ESLint setup**

Run: `rtk npm run lint`
Expected: PASS

- [ ] **Step 5: Inspect repo state**

Run: `rtk git status --short`
Expected: only intended tracked changes, plus any explicitly untracked plan/spec artifacts

- [ ] **Step 6: Commit any final verification fixes**

```bash
rtk git add .
rtk git commit -m "Finalize external party live allocation support"
```

Only include files actually changed by verification. Do not stage unrelated user changes.

## Notes For The Implementer

- Follow `superpowers:test-driven-development` strictly: write each test first, confirm it fails, then add the minimum implementation.
- Keep the external-party crypto DTOs separate from the participant-admin topology crypto DTOs. The upstream protobuf surfaces are similar but not identical.
- Do not invent a new service. These APIs belong on `partyManagementService`.
- Keep JSON behavior explicit and negative.
- The live proof is only successful if the new party is readable back through normal party APIs.
