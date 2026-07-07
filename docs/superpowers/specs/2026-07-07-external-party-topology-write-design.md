# External Party Topology Write Design

## Goal

Expose participant-admin topology write APIs through the public TypeScript SDK using SDK-owned DTOs, while supporting a full external-signing round trip for onboarding ED25519-backed external parties.

This change should:

- add a public `topologyManagerWriteService` that mirrors the real Canton gRPC write boundary
- expose all raw participant-admin topology write RPCs on that service
- preserve the SDK rule that public APIs use SDK-owned DTOs, not generated protobuf classes
- support a full detached-signature flow so callers can externally sign topology transactions without constructing Canton protobuf types
- use `PartyToParticipant.partySigningKeys` as the primary modern path for external-party onboarding

## Scope

This design covers the first topology write slice:

- public `topologyManagerWriteService`
- SDK-owned request, response, enum, and value DTOs for the participant-admin topology write RPCs
- gRPC mapping for the covered topology write methods
- detached-signature assembly support in the public SDK
- an end-to-end ED25519 external-party onboarding flow for a single participant using raw topology transactions
- docs and tests for the new public surface

This design does not cover:

- JSON implementations for topology admin write operations
- SDK-side key generation
- multi-participant external-party hosting flows
- ACS replication or add-party-with-ACS helper flows
- higher-level onboarding convenience services beyond the minimum detached-signature assembly needed for a usable round trip
- broader topology authoring helpers for other mapping families

## Decision Summary

- add a new public participant-admin service:
  - `topologyManagerWriteService`
- mirror the real Canton write service boundary literally
- expose all raw write RPCs now
- support `gRPC only` for this slice
- reject JSON calls with `NotSupportedError`
- keep all public inputs and outputs SDK-owned
- add a detached-signature assembly path so callers do not need to construct `SignedTopologyTransaction` protobuf payloads manually
- treat `PartyToParticipant.partySigningKeys` as the preferred external-party key binding model
- keep `PartyToKeyMapping` available as part of the raw surface, but not as the primary onboarding path

## Current-State Findings

The generated participant-admin topology write service already exists internally and exposes these RPCs:

- `authorize`
- `addTransactions`
- `importTopologySnapshot`
- `importTopologySnapshotV2`
- `signTransactions`
- `generateTransactions`
- `createTemporaryTopologyStore`
- `dropTemporaryTopologyStore`

The generated topology protocol types show:

- `GenerateTransactionsResponse` returns serialized transactions and transaction hashes
- `AddTransactionsRequest` consumes `SignedTopologyTransaction[]`
- `SignTransactionsRequest` also consumes `SignedTopologyTransaction[]`
- `SignedTopologyTransaction` contains the serialized transaction bytes, detached signatures, proposal state, and optional multi-transaction signatures

The generated `PartyToParticipant` mapping includes `partySigningKeys`. Its upstream documentation states that these keys can be used for external-party setup and take precedence over `PartyToKeyMapping` for the same party. That makes `PartyToParticipant` the correct primary write path for ED25519 external-party onboarding in this SDK slice.

## Public Service Boundary

Add to `CantonClient`:

- `topologyManagerWriteService`

### `topologyManagerWriteService`

Public methods:

- `authorizeAsync(request, options?)`
- `addTransactionsAsync(request, options?)`
- `importTopologySnapshotAsync(request, options?)`
- `importTopologySnapshotV2Async(request, options?)`
- `signTransactionsAsync(request, options?)`
- `generateTransactionsAsync(request, options?)`
- `createTemporaryTopologyStoreAsync(request, options?)`
- `dropTemporaryTopologyStoreAsync(request, options?)`
- `assembleSignedTransactions(request)`

Why this shape:

- it mirrors the real Canton gRPC service boundary
- it keeps raw topology authoring available for advanced callers
- it gives external-account callers a practical SDK round trip without leaking protobuf internals into application code

## API Surface Ownership

This service belongs to the participant-admin surface.

Routing rules:

- use `participantAdminEndpoint`
- if `participantAdminEndpoint` is absent, client construction still succeeds
- calls fail only when `topologyManagerWriteService` is used
- the failure should be `EndpointNotConfiguredError`

This stays aligned with the SDK’s current lazy endpoint model.

## Transport Behavior

All methods in this slice are `gRPC only`.

Behavior by transport:

- gRPC: supported
- JSON: reject with `NotSupportedError`

Reason:

- no verified JSON participant-admin topology write surface is in scope here
- the public SDK should not imply transport-neutral support where none exists
- the service boundary still belongs on `CantonClient`, while runtime transport support remains explicit

## Public DTO Strategy

The public SDK must not expose generated protobuf request or response classes.

Instead, add SDK-owned topology write DTO families under the public topology type area.

The DTO shape should stay close to Canton semantics while preserving the SDK’s C#-style public model.

## Raw Write DTO Families

Add SDK-owned request and response types for the raw RPCs.

### Transaction Generation

Requests:

- `GenerateTopologyTransactionsRequest`
- `GenerateTopologyTransactionsProposal`

Responses and value models:

- `GenerateTopologyTransactionsResponse`
- `GeneratedTopologyTransaction`

`GenerateTopologyTransactionsProposal` should mirror the core upstream inputs:

- `operation`
- `serial`
- `mapping`
- `store`

`GeneratedTopologyTransaction` should expose:

- `serializedTransaction`
- `transactionHash`

These byte fields should stay as `Uint8Array` in the public DTOs.

### Add, Sign, and Authorize

Requests:

- `AddTopologyTransactionsRequest`
- `SignTopologyTransactionsRequest`
- `AuthorizeTopologyTransactionsRequest`

Responses:

- `AddTopologyTransactionsResponse`
- `SignTopologyTransactionsResponse`
- `AuthorizeTopologyTransactionsResponse`

Shared value models:

- `SignedTopologyTransaction`
- `TopologyTransactionSignature`
- `MultiTopologyTransactionSignature`

`SignedTopologyTransaction` should expose the full raw shape needed by the RPCs without forwarding generated Canton classes.

### Temporary Stores

Requests:

- `CreateTemporaryTopologyStoreRequest`
- `DropTemporaryTopologyStoreRequest`

Responses:

- `CreateTemporaryTopologyStoreResponse`
- `DropTemporaryTopologyStoreResponse`

### Snapshot Import

Requests:

- `ImportTopologySnapshotRequest`
- `ImportTopologySnapshotV2Request`

Responses:

- `ImportTopologySnapshotResponse`
- `ImportTopologySnapshotV2Response`

The exact response payloads should mirror the generated protobuf semantics during implementation, but remain SDK-owned.

## Detached-Signature DTOs

The raw RPC surface alone is not sufficient for usable external signing, because callers would otherwise need to understand Canton’s signed-topology protobuf envelope in detail.

Add a minimal SDK-owned detached-signature assembly model:

- `AssembleSignedTopologyTransactionsRequest`
- `PreparedTopologyTransaction`
- `ExternalTopologySignature`

### `PreparedTopologyTransaction`

This should represent one generated topology transaction returned by `generateTransactionsAsync`, including:

- `serializedTransaction`
- `transactionHash`
- `proposal`

### `ExternalTopologySignature`

This should represent one externally produced signature, including:

- `transactionHash`
- `signature`
- `signedByFingerprint`
- `signatureFormat`

Use a public SDK enum for `signatureFormat`.

### `TopologySignatureFormat`

Phase 1 should at least include:

- `ed25519`

The enum can expand later when more external signing flows are added.

## Reused Topology Models

This slice should reuse existing SDK-owned topology value models where they already exist, instead of inventing write-only duplicates.

Most importantly, external-party onboarding should reuse:

- `PartyToParticipant`
- `PartyToParticipantParticipant`
- `TopologySigningPublicKey`
- `SigningKeysWithThreshold`

That keeps the public model consistent between topology reads and writes.

## Primary External-Party Flow

The first supported full round trip should be:

1. build a `PartyToParticipant` mapping for one party hosted on one participant
2. populate `partySigningKeys` with ED25519 public-key material and an explicit threshold
3. call `generateTransactionsAsync`
4. externally sign each returned `transactionHash`
5. call `assembleSignedTransactions(...)` with the generated transaction data and detached signatures
6. call `addTransactionsAsync(...)` with the assembled signed transactions

This is the primary phase-1 onboarding path.

## Why `PartyToParticipant` Is Primary

`PartyToParticipant` and `PartyToKeyMapping` are not the same mapping and must not be treated as equivalent public concepts.

However, for modern external-party onboarding, the current Canton protocol places party signing keys directly on `PartyToParticipant`. The upstream generated documentation explicitly states that these keys take precedence over `PartyToKeyMapping` for the same party.

That means:

- the SDK should expose raw `PartyToKeyMapping` operations because the raw topology write surface should be complete
- the SDK should not force external-party onboarding through `PartyToKeyMapping`
- the SDK’s first end-to-end ED25519 onboarding flow should use `PartyToParticipant.partySigningKeys`

## Helper Scope

This phase intentionally stops short of a broad convenience onboarding service.

The only helper added beyond raw RPCs should be the detached-signature assembly path:

- enough to let users perform a real external-signing round trip cleanly
- not so much that the SDK invents a second abstraction layer before the raw topology surface has stabilized

This keeps the phase small, literal, and usable.

## Error Handling

Behavior should follow current SDK conventions:

- missing participant-admin endpoint throws `EndpointNotConfiguredError` when the service is used
- JSON calls throw `NotSupportedError`
- transport failures continue through the normal SDK error hierarchy
- invalid detached-signature assembly inputs should fail fast with SDK validation errors before transport calls are made

Validation should include:

- every external signature must match a prepared transaction by `transactionHash`
- no duplicate detached signatures for the same transaction and signer unless upstream semantics require explicit support later
- required signature metadata such as fingerprint and format must be present

## Testing Strategy

Add focused tests for:

- root exports for new topology write DTOs and service client types
- `CantonClient` exposing `topologyManagerWriteService`
- service-client forwarding for all raw write methods
- gRPC mapper coverage for all covered write requests and responses
- detached-signature assembly from SDK DTOs into the internal signed-topology transport shape
- validation behavior for mismatched transaction hashes, missing fingerprints, and duplicate signatures
- `NotSupportedError` behavior on JSON transport
- lazy missing-endpoint behavior when `participantAdminEndpoint` is not configured

Integration tests for the full external-party onboarding flow can follow once the raw write surface is implemented and a stable local topology-write test setup is in place.

## Backward Compatibility

This is an additive change at the public surface level.

There should be no compatibility aliasing to generated protobuf types or transport-internal helpers.

If existing internal naming is awkward, prefer correcting it while introducing this service rather than preserving a misleading abstraction.

## Implementation Notes

Implementation should derive exact field lists from the generated Canton protobufs already vendored in the repo.

The important design constraints are:

- public SDK DTOs only
- literal gRPC service boundary
- `gRPC only` runtime support in this slice
- detached-signature assembly owned by the SDK
- `PartyToParticipant.partySigningKeys` as the primary external-party onboarding model
