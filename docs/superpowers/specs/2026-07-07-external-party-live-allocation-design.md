# External Party Live Allocation Design

## Summary

The SDK should add the ledger-admin external-party allocation APIs to the public `partyManagementService` and add a real live gRPC integration test that proves a fresh ED25519 external party becomes valid and visible on a running local Canton node.

This design extends the existing raw topology write work with the usable single-host happy path:

- generate external-party topology through the real ledger-admin gRPC API
- externally sign the returned multi-hash using a fresh ED25519 keypair generated in the live test
- allocate the external party through the real ledger-admin gRPC API
- verify the new party is visible through the normal party read APIs

## Goals

- Expose Canton ledger-admin external-party APIs through the public SDK.
- Keep the public SDK DTO surface SDK-owned rather than forwarding generated protobuf classes.
- Preserve the existing raw participant-admin topology write APIs for advanced callers.
- Add a real live integration test against the already-running local node.
- Prove the single-host happy path for a fresh ED25519 external party.
- Verify the resulting party is visible through standard party reads, not only topology reads.

## Non-Goals

- Multi-host external-party onboarding.
- Negative-case coverage in this phase.
- JSON support for external-party allocation.
- High-level SDK-side key generation helpers outside tests.
- A convenience abstraction that hides the literal Canton gRPC service boundaries.
- Cleanup of created external parties after each live run.

## Scope

This design covers:

- public ledger-admin `partyManagementService` support for:
  - `generateExternalPartyTopologyAsync(...)`
  - `allocateExternalPartyAsync(...)`
- SDK-owned request, response, and supporting DTOs for those two RPCs
- gRPC transport and mapper support for those RPCs
- JSON rejection behavior for those RPCs
- a live gRPC happy-path test using a fresh ED25519 keypair and a fresh external party per run
- verification that the new party is visible through `listKnownPartiesAsync(...)` and `getPartiesAsync(...)`

This design does not cover:

- exposing new raw topology-write methods beyond the ones already added
- implementing the participant-admin raw topology live path as the primary proof
- external-party helper APIs that merge multiple RPCs into one SDK-only abstraction
- authentication matrix expansion for the live suite

## Decision Summary

- add the external-party RPCs to the existing ledger-admin `partyManagementService`
- keep `topologyManagerWriteService` on the participant-admin surface as the raw lower layer
- use SDK-owned DTOs everywhere on the public surface
- support `gRPC only` for the new external-party APIs
- reject JSON calls with `NotSupportedError`
- use the ledger-admin `GenerateExternalPartyTopology` plus `AllocateExternalParty` flow as the primary public happy path
- use the returned `multiHash` signature path in the live test instead of signing each topology transaction individually
- create a fresh ED25519 keypair and a fresh external party in every live run
- derive the party from `partyHint = "ed25519_party"` and verify the returned party id is in the expected `ed25519_party::fingerprint` family

## Current-State Findings

The generated ledger-admin `PartyManagementService` already exposes the required external-party RPCs:

- `AllocateExternalParty`
- `GenerateExternalPartyTopology`

The generated request and response shapes show:

- `GenerateExternalPartyTopology` returns:
  - `partyId`
  - `publicKeyFingerprint`
  - `topologyTransactions`
  - `multiHash`
- `AllocateExternalParty` accepts:
  - `synchronizer`
  - `onboardingTransactions`
  - `multiHashSignatures`
  - `identityProviderId`
  - `waitForAllocation`
  - `userId`

The generated service documentation also indicates:

- this is the dedicated ledger-admin flow for onboarding external parties
- single-host non-decentralized parties can wait until allocation is complete before returning
- the common external topology may be generated directly through the ledger-admin API instead of hand-constructing raw topology payloads

This means the SDK already has the correct upstream public foundation for a user-facing external-party happy path. The missing piece is surfacing it cleanly through the SDK and proving it against a real node.

## Public Service Boundary

These methods should be added to the existing `partyManagementService` public client.

### New Public Methods

- `generateExternalPartyTopologyAsync(request, options?)`
- `allocateExternalPartyAsync(request, options?)`

Why this placement:

- they belong to `com.daml.ledger.api.v2.admin.PartyManagementService`
- they are ledger-admin APIs, not participant-admin topology-manager APIs
- they represent the user-facing orchestration flow for external-party creation
- the existing `partyManagementService` already owns adjacent party lifecycle methods such as `allocatePartyAsync(...)`, `listKnownPartiesAsync(...)`, and `getPartiesAsync(...)`

## Service Layering

The intended layering after this change is:

- `partyManagementService`
  - ledger-admin orchestration and visibility APIs
  - includes the external-party happy path
- `topologyManagerWriteService`
  - participant-admin raw topology authoring and submission APIs
  - remains available for advanced callers
- `topologyManagerReadService`
  - participant-admin raw topology verification APIs

This keeps the SDK aligned with literal Canton service boundaries while still giving users a practical external-party creation path.

## Endpoint And Transport Behavior

These new APIs belong to the ledger-admin endpoint surface.

Routing rules:

- use `ledgerAdminEndpoint`
- lazy endpoint behavior remains the same as the rest of the SDK
- client construction should still succeed if `ledgerAdminEndpoint` is absent
- calls fail only when the external-party methods are actually used

Transport behavior:

- gRPC: supported
- JSON: reject with `NotSupportedError`

Reason:

- these external-party ledger-admin RPCs are gRPC APIs
- the SDK should not pretend JSON parity where no such API exists

## Public DTO Model

The SDK should expose small, literal, SDK-owned DTOs.

### Requests And Responses

- `GenerateExternalPartyTopologyRequest`
- `GenerateExternalPartyTopologyResponse`
- `AllocateExternalPartyRequest`
- `AllocateExternalPartyResponse`

### Supporting Value Types

- `ExternalPartySigningPublicKey`
- `ExternalPartyOnboardingTransaction`
- `ExternalPartySignature`
- `ExternalPartyCryptoKeyFormat`
- `ExternalPartySigningKeySpec`
- `ExternalPartySignatureFormat`
- `ExternalPartySigningAlgorithmSpec`

## DTO Shape

### `GenerateExternalPartyTopologyRequest`

Fields:

- `synchronizer: string`
- `partyHint: string`
- `publicKey: ExternalPartySigningPublicKey`
- `localParticipantObservationOnly?: boolean`
- `otherConfirmingParticipantUids?: string[]`
- `confirmationThreshold?: number`
- `observingParticipantUids?: string[]`

### `GenerateExternalPartyTopologyResponse`

Fields:

- `partyId: string`
- `publicKeyFingerprint: string`
- `topologyTransactions: Uint8Array[]`
- `multiHash: Uint8Array`

### `ExternalPartySigningPublicKey`

Fields:

- `format: ExternalPartyCryptoKeyFormat`
- `keyData: Uint8Array`
- `keySpec`

The exact enum values should mirror the upstream ledger-admin crypto API.

This should be a dedicated DTO family rather than reusing `TopologySigningPublicKey`, because the ledger-admin external-party crypto shape is not identical to the participant-admin topology crypto shape.

### `AllocateExternalPartyRequest`

Fields:

- `synchronizer: string`
- `onboardingTransactions: ExternalPartyOnboardingTransaction[]`
- `multiHashSignatures?: ExternalPartySignature[]`
- `identityProviderId?: string`
- `waitForAllocation?: boolean`
- `userId?: string`

### `ExternalPartyOnboardingTransaction`

Fields:

- `transaction: Uint8Array`
- `signatures?: ExternalPartySignature[]`

This should use the same dedicated external-party signature DTO as `multiHashSignatures`.

### `ExternalPartySignature`

Fields:

- `format: ExternalPartySignatureFormat`
- `signature: Uint8Array`
- `signedByFingerprint: string`
- `signingAlgorithmSpec: ExternalPartySigningAlgorithmSpec`

This should be a dedicated DTO rather than reusing `TopologyTransactionSignature`, because the ledger-admin external-party signature shape is a different public crypto surface and does not carry topology-specific delegation fields.

### `AllocateExternalPartyResponse`

Fields:

- `partyId: string`

## Live Happy Path

The live test should use the dedicated ledger-admin external-party flow rather than raw participant-admin topology authoring.

### Test Steps

1. Connect to the already-running local node with a gRPC `CantonClient`.
2. Read the synchronizer id needed for external-party onboarding.
3. Generate a fresh ED25519 keypair in the test process.
4. Build a public-key DTO from the fresh keypair.
5. Call `partyManagementService.generateExternalPartyTopologyAsync(...)` with:
   - `partyHint = "ed25519_party"`
   - the discovered synchronizer id
   - the generated public key
   - single-host defaults
6. Verify:
   - `partyId` is non-empty
   - `publicKeyFingerprint` is non-empty
   - `topologyTransactions.length > 0`
   - `multiHash.length > 0`
   - `partyId` begins with `ed25519_party::`
7. Externally sign the returned `multiHash` using the fresh private key.
8. Call `partyManagementService.allocateExternalPartyAsync(...)` with:
   - the same synchronizer id
   - the returned topology transactions wrapped as onboarding transactions
   - a single multi-hash signature
   - `waitForAllocation = true`
9. Verify:
   - the allocate response `partyId` matches the generated `partyId`
10. Verify standard visibility through:
    - `partyManagementService.listKnownPartiesAsync(...)`
    - `partyManagementService.getPartiesAsync(...)`
11. Optionally verify the topology side through:
    - `topologyManagerReadService.listPartyToParticipantAsync(...)`

## Live Verification Rules

The success condition is not merely that allocation RPCs return without error.

The primary proof is:

- the external party becomes visible through the normal ledger-admin party APIs

Secondary proof may include:

- the raw `PartyToParticipant` topology is readable through participant-admin topology reads

This distinction matters because the user goal is to see a valid party, not just stored topology transactions.

## Single-Host Constraints

This phase intentionally covers only the single-host happy path.

That means:

- one participant
- no decentralized namespaces
- no extra confirming participants
- no extra observing participants
- no negative-case handling
- no cleanup requirement

This keeps the first live proof minimal and user-meaningful.

## Test Data Strategy

Use one fresh external party per live run.

Inputs:

- fresh ED25519 keypair every run
- `partyHint = "ed25519_party"`

Expected result:

- a unique party id derived by Canton from the hint and the public-key fingerprint

No cleanup is required in this phase. The localnet may retain prior test parties.

## Error Handling

The live flow should fail fast when foundational requirements are missing.

Fail immediately when:

- ledger-admin gRPC is unreachable
- participant-admin gRPC is unreachable when synchronizer discovery depends on it
- the synchronizer id cannot be discovered
- the external-party RPCs are unavailable on the running Canton version
- the generate call returns empty topology transactions or an empty multi-hash
- the allocate call succeeds but the party is not visible through standard party reads

This keeps the live suite honest and prevents false-positive coverage.

## Implementation Notes

### Synchronizer Discovery

The implementation should discover the synchronizer id through the existing public SDK surface:

- call `synchronizerConnectivityService.listConnectedSynchronizersAsync(...)`
- select the single healthy connected synchronizer in the local quickstart environment
- use its `synchronizerId` for both external-party RPCs

Fail fast if:

- there are no healthy connected synchronizers
- there is more than one candidate in a context where the test cannot unambiguously choose one

The design does not require a hard-coded synchronizer id in the test.

### Signing In Tests

The live test may use Node crypto directly to generate the ED25519 keypair and to sign the returned `multiHash`.

This is acceptable because:

- the SDK itself is not taking on key generation responsibility
- the test is acting as the external account owner
- the point of the test is to prove the SDK accepts externally produced signatures against a real Canton node

## Unit-Test Coverage

Add unit coverage for:

- request and response DTO construction
- service client forwarding on `partyManagementService`
- gRPC mapper correctness for:
  - `GenerateExternalPartyTopology`
  - `AllocateExternalParty`
- JSON rejection for the new party-management methods

## Live-Test Coverage

Add a dedicated live gRPC spec that:

- generates a fresh external party
- allocates it
- verifies it through normal party reads

This should become part of the existing `tests/live` suite and coverage matrix.

## Risks

- the exact signing input format for `multiHash` must match Canton expectations exactly
- the running local Canton version must support these external-party ledger-admin RPCs
- synchronizer discovery may require careful choice of existing SDK surface
- external-party visibility timing must be covered by `waitForAllocation = true`, but the test should still assert visibility explicitly

## Recommended Implementation Sequence

1. Add SDK-owned DTOs for the two ledger-admin external-party RPCs.
2. Add `partyManagementService` public methods.
3. Extend transport interfaces and service registry wiring.
4. Add gRPC mappers and gRPC transport support.
5. Add JSON rejection behavior.
6. Add unit coverage.
7. Add the live gRPC happy-path spec.
8. Update README, `DOCUMENTATION.md`, and live coverage metadata.
