# External Party Topology Write Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public participant-admin topology write surface to the SDK, backed by gRPC, with SDK-owned DTOs for all raw write RPCs and a usable detached-signature round trip for ED25519 external-party onboarding through `PartyToParticipant.partySigningKeys`.

**Architecture:** Follow the same shape as the existing topology read surface: introduce SDK-owned request, response, enum, and value DTOs first, then add a literal `topologyManagerWriteService`, explicit transport methods, lazy participant-admin endpoint gating, gRPC mappers, and JSON rejection. Keep external signing in a small SDK-owned assembler so callers can generate transactions, sign hashes outside the SDK, and submit signed topology transactions without touching protobuf classes.

**Tech Stack:** TypeScript, Vitest, protobuf-ts generated Canton participant-admin topology clients, existing SDK service registry and transport layers, `@distrohelena/linter`

---

## File Structure

### Topology write DTOs, shared value models, and exports

- Create: `src/core/types/topology/topology-signature-format.ts`
- Create: `src/core/types/topology/topology-transaction-signature.ts`
- Create: `src/core/types/topology/multi-topology-transaction-signature.ts`
- Create: `src/core/types/topology/signed-topology-transaction.ts`
- Create: `src/core/types/topology/generated-topology-transaction.ts`
- Create: `src/core/types/topology/prepared-topology-transaction.ts`
- Create: `src/core/types/topology/external-topology-signature.ts`
- Create: `src/core/types/requests/generate-topology-transactions-request.ts`
- Create: `src/core/types/requests/authorize-topology-transactions-request.ts`
- Create: `src/core/types/requests/add-topology-transactions-request.ts`
- Create: `src/core/types/requests/sign-topology-transactions-request.ts`
- Create: `src/core/types/requests/create-temporary-topology-store-request.ts`
- Create: `src/core/types/requests/drop-temporary-topology-store-request.ts`
- Create: `src/core/types/requests/import-topology-snapshot-request.ts`
- Create: `src/core/types/requests/import-topology-snapshot-v2-request.ts`
- Create: `src/core/types/requests/assemble-signed-topology-transactions-request.ts`
- Create: `src/core/types/responses/generate-topology-transactions-response.ts`
- Create: `src/core/types/responses/authorize-topology-transactions-response.ts`
- Create: `src/core/types/responses/add-topology-transactions-response.ts`
- Create: `src/core/types/responses/sign-topology-transactions-response.ts`
- Create: `src/core/types/responses/create-temporary-topology-store-response.ts`
- Create: `src/core/types/responses/drop-temporary-topology-store-response.ts`
- Create: `src/core/types/responses/import-topology-snapshot-response.ts`
- Create: `src/core/types/responses/import-topology-snapshot-v2-response.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/core/topology-write-dto.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

### Public service client, assembler, and client wiring

- Create: `src/services/topology-manager-write/topology-manager-write-service-client.ts`
- Create: `src/services/topology-manager-write/topology-signed-transaction-assembler.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Create: `tests/unit/services/topology-manager-write-service-client.test.ts`
- Create: `tests/unit/services/topology-signed-transaction-assembler.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

### gRPC mapping and transport execution

- Create: `src/transports/grpc/mappers/topology-manager-write-mapper.ts`
- Modify: `src/transports/grpc/mappers/topology-common-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Create: `tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-topology-manager-write-services.test.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`

### JSON unsupported behavior, docs, and shared verification

- Modify: `src/transports/json/json-transport.ts`
- Create: `tests/unit/json/json-topology-manager-write-services.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `README.md`

## Task 1: Add Topology Write DTOs And Root Exports

**Files:**
- Create: `src/core/types/topology/topology-signature-format.ts`
- Create: `src/core/types/topology/topology-transaction-signature.ts`
- Create: `src/core/types/topology/multi-topology-transaction-signature.ts`
- Create: `src/core/types/topology/signed-topology-transaction.ts`
- Create: `src/core/types/topology/generated-topology-transaction.ts`
- Create: `src/core/types/topology/prepared-topology-transaction.ts`
- Create: `src/core/types/topology/external-topology-signature.ts`
- Create: `src/core/types/requests/generate-topology-transactions-request.ts`
- Create: `src/core/types/requests/authorize-topology-transactions-request.ts`
- Create: `src/core/types/requests/add-topology-transactions-request.ts`
- Create: `src/core/types/requests/sign-topology-transactions-request.ts`
- Create: `src/core/types/requests/create-temporary-topology-store-request.ts`
- Create: `src/core/types/requests/drop-temporary-topology-store-request.ts`
- Create: `src/core/types/requests/import-topology-snapshot-request.ts`
- Create: `src/core/types/requests/import-topology-snapshot-v2-request.ts`
- Create: `src/core/types/requests/assemble-signed-topology-transactions-request.ts`
- Create: `src/core/types/responses/generate-topology-transactions-response.ts`
- Create: `src/core/types/responses/authorize-topology-transactions-response.ts`
- Create: `src/core/types/responses/add-topology-transactions-response.ts`
- Create: `src/core/types/responses/sign-topology-transactions-response.ts`
- Create: `src/core/types/responses/create-temporary-topology-store-response.ts`
- Create: `src/core/types/responses/drop-temporary-topology-store-response.ts`
- Create: `src/core/types/responses/import-topology-snapshot-response.ts`
- Create: `src/core/types/responses/import-topology-snapshot-v2-response.ts`
- Modify: `src/index.ts`
- Create: `tests/unit/core/topology-write-dto.test.ts`
- Modify: `tests/unit/smoke/package-shape.test.ts`

- [ ] **Step 1: Write the failing DTO and export tests**

Create `tests/unit/core/topology-write-dto.test.ts` with assertions like:

```ts
const request = new GenerateTopologyTransactionsRequest({
    proposals: [
        {
            operation: TopologyMappingOperation.addReplace,
            serial: 1,
            mapping: new PartyToParticipant({
                party: "ExternalParty::default",
                threshold: 1,
                participants: [],
                partySigningKeys: new TopologySigningKeysWithThreshold({
                    threshold: 1,
                    keys: [],
                }),
            }),
        },
    ],
});

const signature = new ExternalTopologySignature({
    transactionHash: new Uint8Array([1, 2, 3]),
    signature: new Uint8Array([4, 5, 6]),
    signedByFingerprint: "fingerprint::1",
    signatureFormat: TopologySignatureFormat.ed25519,
});

expect(request.proposals[0].mapping).toBeInstanceOf(PartyToParticipant);
expect(signature.signatureFormat).toBe(TopologySignatureFormat.ed25519);
```

Extend `tests/unit/smoke/package-shape.test.ts` to verify root exports for:

- `TopologySignatureFormat`
- `TopologyTransactionSignature`
- `MultiTopologyTransactionSignature`
- `SignedTopologyTransaction`
- `GeneratedTopologyTransaction`
- `PreparedTopologyTransaction`
- `ExternalTopologySignature`
- `GenerateTopologyTransactionsRequest`
- `GenerateTopologyTransactionsResponse`
- `AssembleSignedTopologyTransactionsRequest`

- [ ] **Step 2: Run the focused DTO tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/core/topology-write-dto.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `FAIL`
- missing topology write DTO files
- missing root exports

- [ ] **Step 3: Add the SDK-owned topology write DTO family**

Implement the DTOs as C#-style classes with constructor defaults and defensive array and byte copying.

Required shapes:

- `GenerateTopologyTransactionsRequest` with `proposals`
- `AuthorizeTopologyTransactionsRequest` supporting both:
  - generated proposal input
  - transaction-hash authorization input
- `AddTopologyTransactionsRequest`
- `SignTopologyTransactionsRequest`
- `CreateTemporaryTopologyStoreRequest`
- `DropTemporaryTopologyStoreRequest`
- `ImportTopologySnapshotRequest`
- `ImportTopologySnapshotV2Request`
- `AssembleSignedTopologyTransactionsRequest`
- `GenerateTopologyTransactionsResponse`
- `AuthorizeTopologyTransactionsResponse`
- `AddTopologyTransactionsResponse`
- `SignTopologyTransactionsResponse`
- `CreateTemporaryTopologyStoreResponse`
- `DropTemporaryTopologyStoreResponse`
- `ImportTopologySnapshotResponse`
- `ImportTopologySnapshotV2Response`
- topology write value models:
  - `GeneratedTopologyTransaction`
  - `PreparedTopologyTransaction`
  - `ExternalTopologySignature`
  - `SignedTopologyTransaction`
  - `TopologyTransactionSignature`
  - `MultiTopologyTransactionSignature`
- enum:
  - `TopologySignatureFormat` with at least `ed25519`

Keep `Uint8Array` fields as raw bytes and reuse `PartyToParticipant`, `TopologySigningPublicKey`, and `TopologySigningKeysWithThreshold` instead of creating duplicate key or mapping models.

- [ ] **Step 4: Run the focused DTO tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/core/topology-write-dto.test.ts tests/unit/smoke/package-shape.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/core/types/topology src/core/types/requests src/core/types/responses src/index.ts tests/unit/core/topology-write-dto.test.ts tests/unit/smoke/package-shape.test.ts
git commit -m "Add topology write DTOs"
```

## Task 2: Add The Public Service, Assembler, And Lazy Endpoint Wiring

**Files:**
- Create: `src/services/topology-manager-write/topology-manager-write-service-client.ts`
- Create: `src/services/topology-manager-write/topology-signed-transaction-assembler.ts`
- Modify: `src/client/canton-client.ts`
- Modify: `src/client/service-registry.ts`
- Modify: `src/core/transports/transport.interface.ts`
- Create: `tests/unit/services/topology-manager-write-service-client.test.ts`
- Create: `tests/unit/services/topology-signed-transaction-assembler.test.ts`
- Modify: `tests/unit/client/canton-client-construction.test.ts`
- Modify: `tests/unit/client/service-registry-endpoints.test.ts`
- Modify: `tests/unit/core/transport-surface.test.ts`

- [ ] **Step 1: Write failing service-forwarding and endpoint tests**

Create `tests/unit/services/topology-manager-write-service-client.test.ts` with forwarding checks like:

```ts
const transport = {
    generateTopologyTransactionsAsync: vi.fn(),
    addTopologyTransactionsAsync: vi.fn(),
} as unknown as ITransport;

const client = new TopologyManagerWriteServiceClient(transport);

await client.generateTransactionsAsync(new GenerateTopologyTransactionsRequest());

expect(transport.generateTopologyTransactionsAsync).toHaveBeenCalledTimes(1);
```

Create `tests/unit/services/topology-signed-transaction-assembler.test.ts` with initial validation expectations like:

```ts
expect(() =>
    assembleSignedTopologyTransactions(
        new AssembleSignedTopologyTransactionsRequest({
            preparedTransactions: [],
            signatures: [],
        }),
    ),
).not.toThrow();
```

Extend `tests/unit/client/canton-client-construction.test.ts` and `tests/unit/client/service-registry-endpoints.test.ts` to verify:

- `client.topologyManagerWriteService` exists
- missing `participantAdminEndpoint` fails only when a write method is called
- the error message names `topologyManagerWriteService`

- [ ] **Step 2: Run the focused public-surface tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/topology-manager-write-service-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `FAIL`
- missing service client
- missing transport methods
- missing endpoint gating

- [ ] **Step 3: Add the public service boundary and transport contract**

Implement:

- `TopologyManagerWriteServiceClient` with methods:
  - `authorizeAsync`
  - `addTransactionsAsync`
  - `importTopologySnapshotAsync`
  - `importTopologySnapshotV2Async`
  - `signTransactionsAsync`
  - `generateTransactionsAsync`
  - `createTemporaryTopologyStoreAsync`
  - `dropTemporaryTopologyStoreAsync`
  - `assembleSignedTransactions`
- `topology-signed-transaction-assembler.ts` as a small SDK-owned helper
- `ITransport` entries for all raw topology write operations
- `CantonClient` and `ServiceRegistry` wiring for `topologyManagerWriteService`
- placeholder transport behavior with lazy `participantAdminEndpoint` failure

Keep the service comments concise and explicit about support:

- gRPC supported
- JSON rejected
- `assembleSignedTransactions` is SDK-local and transport-independent

- [ ] **Step 4: Run the focused public-surface tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/topology-manager-write-service-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/services/topology-manager-write src/client/canton-client.ts src/client/service-registry.ts src/core/transports/transport.interface.ts tests/unit/services/topology-manager-write-service-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/unit/core/transport-surface.test.ts
git commit -m "Add topology manager write service"
```

## Task 3: Implement gRPC Raw Topology Write RPCs

**Files:**
- Create: `src/transports/grpc/mappers/topology-manager-write-mapper.ts`
- Modify: `src/transports/grpc/mappers/topology-common-mapper.ts`
- Modify: `src/transports/grpc/grpc-channel-factory.ts`
- Modify: `src/transports/grpc/grpc-transport.ts`
- Create: `tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts`
- Create: `tests/unit/grpc/grpc-topology-manager-write-services.test.ts`
- Modify: `tests/unit/grpc/grpc-channel-factory.test.ts`

- [ ] **Step 1: Write failing gRPC mapper and service tests**

Create `tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts` with cases like:

```ts
const request = new GenerateTopologyTransactionsRequest({
    proposals: [
        {
            operation: TopologyMappingOperation.addReplace,
            serial: 1,
            mapping: new PartyToParticipant({
                party: "ExternalParty::default",
                threshold: 1,
                participants: [
                    new PartyToParticipantParticipant({
                        participantUid: "participant1::example",
                        permission: ParticipantPermission.submission,
                        onboarding: new PartyToParticipantOnboarding(),
                    }),
                ],
                partySigningKeys: new TopologySigningKeysWithThreshold({
                    threshold: 1,
                    keys: [
                        new TopologySigningPublicKey({
                            format: "raw",
                            scheme: "ed25519",
                            publicKey: new Uint8Array([1, 2, 3]),
                        }),
                    ],
                }),
            }),
        },
    ],
});

const grpcRequest = mapGrpcGenerateTopologyTransactionsRequest(request);

expect(grpcRequest.proposals).toHaveLength(1);
expect(grpcRequest.proposals[0].mapping?.mapping.oneofKind).toBeDefined();
```

Create `tests/unit/grpc/grpc-topology-manager-write-services.test.ts` to verify:

- each public write method reaches the generated topology write client
- request options flow through unchanged
- response mappers return SDK DTOs

- [ ] **Step 2: Run the focused gRPC tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts tests/unit/grpc/grpc-topology-manager-write-services.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
```

Expected:

- `FAIL`
- missing mapper functions
- missing channel-factory client wiring
- missing transport methods

- [ ] **Step 3: Add the raw gRPC write path**

Implement:

- request and response mapping in `topology-manager-write-mapper.ts`
- reverse topology mapping helpers in `topology-common-mapper.ts` for:
  - `PartyToParticipant`
  - `PartyToParticipantParticipant`
  - `TopologySigningPublicKey`
  - `TopologySigningKeysWithThreshold`
  - signed-transaction signature envelopes
- `grpc-channel-factory.ts` wiring for:
  - generated `TopologyManagerWriteServiceClient`
  - all eight raw write RPCs
- `grpc-transport.ts` public method implementations that:
  - call the generated client
  - map responses back to SDK DTOs
  - keep method names literal to the public service boundary

Map all raw write RPCs from `com.digitalasset.canton.topology.admin.v30.TopologyManagerWriteService`:

- `Authorize`
- `AddTransactions`
- `ImportTopologySnapshot`
- `ImportTopologySnapshotV2`
- `SignTransactions`
- `GenerateTransactions`
- `CreateTemporaryTopologyStore`
- `DropTemporaryTopologyStore`

- [ ] **Step 4: Run the focused gRPC tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts tests/unit/grpc/grpc-topology-manager-write-services.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/transports/grpc/mappers/topology-manager-write-mapper.ts src/transports/grpc/mappers/topology-common-mapper.ts src/transports/grpc/grpc-channel-factory.ts src/transports/grpc/grpc-transport.ts tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts tests/unit/grpc/grpc-topology-manager-write-services.test.ts tests/unit/grpc/grpc-channel-factory.test.ts
git commit -m "Implement gRPC topology write transport"
```

## Task 4: Implement Detached-Signature Assembly For External Parties

**Files:**
- Modify: `src/services/topology-manager-write/topology-signed-transaction-assembler.ts`
- Modify: `src/services/topology-manager-write/topology-manager-write-service-client.ts`
- Modify: `src/core/types/topology/signed-topology-transaction.ts`
- Modify: `tests/unit/services/topology-signed-transaction-assembler.test.ts`
- Modify: `tests/unit/services/topology-manager-write-service-client.test.ts`

- [ ] **Step 1: Write failing detached-signature assembly tests**

Expand `tests/unit/services/topology-signed-transaction-assembler.test.ts` with cases for:

- assembling one prepared transaction with one ED25519 signature
- preserving the `proposal` flag
- throwing when a signature hash does not match any prepared transaction
- throwing when the same signer signs the same transaction twice

Example:

```ts
const result = assembleSignedTopologyTransactions(
    new AssembleSignedTopologyTransactionsRequest({
        preparedTransactions: [
            new PreparedTopologyTransaction({
                serializedTransaction: new Uint8Array([1, 2]),
                transactionHash: new Uint8Array([3, 4]),
                proposal: false,
            }),
        ],
        signatures: [
            new ExternalTopologySignature({
                transactionHash: new Uint8Array([3, 4]),
                signature: new Uint8Array([9, 9]),
                signedByFingerprint: "fingerprint::1",
                signatureFormat: TopologySignatureFormat.ed25519,
            }),
        ],
    }),
);

expect(result.signedTransactions[0].signatures).toHaveLength(1);
```

- [ ] **Step 2: Run the focused assembler tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/services/topology-manager-write-service-client.test.ts
```

Expected:

- `FAIL`
- assembler missing validation
- service not delegating `assembleSignedTransactions`

- [ ] **Step 3: Implement the assembler with fail-fast validation**

Implement the helper so it:

- groups external signatures by transaction hash
- validates that every signature maps to a prepared transaction
- validates required metadata:
  - `signedByFingerprint`
  - `signatureFormat`
  - `signature`
- rejects duplicate signer and transaction pairs
- produces SDK-owned `SignedTopologyTransaction` instances with:
  - `transaction`
  - `signatures`
  - `proposal`
  - `multiTransactionSignatures`

Keep the first version intentionally narrow:

- support `TopologySignatureFormat.ed25519`
- no SDK-side hashing or key generation
- no implicit `PartyToKeyMapping` convenience flow

- [ ] **Step 4: Run the focused assembler tests to verify they pass**

Run:

```bash
rtk npm test -- tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/services/topology-manager-write-service-client.test.ts
```

Expected:

- `PASS`

- [ ] **Step 5: Commit**

```bash
git add src/services/topology-manager-write/topology-signed-transaction-assembler.ts src/services/topology-manager-write/topology-manager-write-service-client.ts src/core/types/topology/signed-topology-transaction.ts tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/services/topology-manager-write-service-client.test.ts
git commit -m "Add detached topology signature assembly"
```

## Task 5: Reject JSON, Update Docs, And Run Full Verification

**Files:**
- Modify: `src/transports/json/json-transport.ts`
- Create: `tests/unit/json/json-topology-manager-write-services.test.ts`
- Modify: `tests/contract/shared/operational-services.grpc.contract.test.ts`
- Modify: `tests/contract/shared/operational-services.json.contract.test.ts`
- Modify: `DOCUMENTATION.md`
- Modify: `README.md`

- [ ] **Step 1: Write failing JSON and docs-adjacent tests**

Create `tests/unit/json/json-topology-manager-write-services.test.ts` with assertions like:

```ts
await expect(
    client.topologyManagerWriteService.generateTransactionsAsync(
        new GenerateTopologyTransactionsRequest(),
    ),
).rejects.toThrow(/not supported by json transport/i);
```

Extend the shared transport contract tests to assert:

- gRPC transport exposes all topology write methods
- JSON transport exposes the same method names but rejects the raw RPC calls
- `assembleSignedTransactions` remains service-local, not a transport method

- [ ] **Step 2: Run the focused JSON and contract tests to verify they fail**

Run:

```bash
rtk npm test -- tests/unit/json/json-topology-manager-write-services.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
```

Expected:

- `FAIL`
- JSON transport missing write rejections
- contract tests missing the new public surface

- [ ] **Step 3: Implement JSON rejection and document the final public surface**

Implement:

- `JsonTransport` methods for every raw topology write call that throw `NotSupportedError`
- concise service and transport comments naming gRPC and JSON support
- `DOCUMENTATION.md` entries for every `topologyManagerWriteService` method
- `README.md` examples for:
  - generating a `PartyToParticipant` topology transaction with `partySigningKeys`
  - signing the returned `transactionHash` externally
  - assembling and submitting signed transactions

The documentation must explicitly state:

- topology writes are participant-admin gRPC only
- JSON does not support this slice
- external onboarding in this phase uses `PartyToParticipant.partySigningKeys`
- `PartyToKeyMapping` remains available only through the raw topology write surface

- [ ] **Step 4: Run lint, targeted tests, and full build verification**

Run:

```bash
rtk npm test -- tests/unit/core/topology-write-dto.test.ts tests/unit/services/topology-manager-write-service-client.test.ts tests/unit/services/topology-signed-transaction-assembler.test.ts tests/unit/grpc/grpc-topology-manager-write-mapper.test.ts tests/unit/grpc/grpc-topology-manager-write-services.test.ts tests/unit/json/json-topology-manager-write-services.test.ts tests/unit/client/canton-client-construction.test.ts tests/unit/client/service-registry-endpoints.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts
rtk npm run build
rtk npm exec @distrohelena/linter
```

Expected:

- all targeted tests `PASS`
- build completes successfully
- linter completes successfully

- [ ] **Step 5: Commit**

```bash
git add src/transports/json/json-transport.ts tests/unit/json/json-topology-manager-write-services.test.ts tests/contract/shared/operational-services.grpc.contract.test.ts tests/contract/shared/operational-services.json.contract.test.ts DOCUMENTATION.md README.md
git commit -m "Document topology write surface"
```
