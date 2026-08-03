# Contract Cache Real-Protobuf Design

## Goal

Make `GrpcContractCache` consume the actual Ledger API active-contract protobuf shape while preserving its adversarial-input boundary, stable pagination, and cache-only `ContractRow` snapshots.

## Architecture

The cache continues to own traversal, cache keys, expiry, in-flight deduplication, hostile-input materialization, and persistence. Each page is captured once into detached generated-shaped `GetActiveContractsResponse` values. The cache accumulates those responses across all pages and invokes `mapGrpcQueryRelationFragment([], responses).contracts` exactly once after traversal succeeds.

The existing relation mapper remains the sole source of CreatedEvent-to-ContractRow semantics. It maps `createdEvent.contractId`, `templateId`, `createArguments`, witnesses, creation offset, and creation timestamp through the existing gRPC value mapper. It also reconciles multi-synchronizer activations: matching creation facts coalesce with witness union and a deterministic representative, same-synchronizer duplicates reject, and conflicting creation facts reject.

## Data Flow

1. Normalize the requested party scope and select the cache key.
2. Fetch each `GetActiveContractsPageResponse` at one stable `activeAtOffset`.
3. Capture `activeAtOffset`, the response array, every nested response graph, and `nextPageToken` into detached values before later getters can mutate earlier values.
4. Reject offset changes or repeated tokens without writing.
5. After the final page, map the complete detached response set through `mapGrpcQueryRelationFragment` once.
6. Capture result metadata, build a ContractRow-only snapshot, and call the custom store once.

## Error Semantics

- Hostile or malformed ACS data rejects the prewarm and performs no write.
- Same-synchronizer duplicate activations and conflicting duplicate creation facts use the relation mapper's existing `ValidationError` behavior.
- Matching cross-synchronizer activations produce one logical active contract.
- Custom-store corruption remains a cache miss.
- The cache never persists partial traversal or pre-reconciliation rows.

## Testing

Cache tests use generated `GetActiveContractsPageResponse`, `GetActiveContractsResponse`, `ActiveContract`, `CreatedEvent`, and `Value` creators. Tests cover:

- real CreatedEvent field and create-argument mapping;
- multi-page, multi-synchronizer deterministic deduplication and witness union;
- conflicting duplicate rejection with no write;
- same-synchronizer duplicate rejection with no write;
- stateful nested getters captured once;
- stable offsets, repeated-token rejection, hostile inputs, and custom-store behavior from the existing Task 7 suite;
- a direct built-output probe using real protobuf creators.

Flattened active-contract fixtures are removed unless a shipped transport is proven to emit that shape.
