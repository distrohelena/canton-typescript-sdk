# Stream API Split Design

## Goal

Correct the SDK streaming surface so it no longer treats JSON query streaming and gRPC ledger-update streaming as equivalent capabilities.

## Problem

The current SDK exposes:

- `ContractsClient.queryAsync(...)`
- `EventsClient.streamTransactionsAsync(...)`

But the transport behavior underneath is inconsistent:

- gRPC `streamTransactionsAsync(...)` is backed by ledger update streaming semantics
- JSON `streamTransactionsAsync(...)` is backed by `/v1/stream/query`, which is query-stream semantics

That is an API design bug, not just a documentation problem. A query stream should not be embedded behind a method that claims to stream ledger transactions.

## Agreed Direction

Keep the two concepts separate.

### Query Streaming

Add:

- `ContractsClient.streamQueryAsync(...)`

This method represents contract query streaming semantics.

In v1:

- JSON supports it
- gRPC does not support it unless we later define an explicit gRPC query-stream contract

### Ledger Update Streaming

Keep:

- `EventsClient.streamTransactionsAsync(...)`

This method represents ledger-update streaming semantics only.

In v1:

- gRPC supports it
- JSON does not support equivalent behavior and must not pretend to

## Recommended Public API

### Contracts Client

`ContractsClient` should expose:

- `queryAsync(request: QueryContractsRequest)`
- `streamQueryAsync(request: StreamQueryRequest, observer: ContractObserver)`

This keeps request/response and query-stream behavior together under the contracts boundary.

### Events Client

`EventsClient` should continue to expose:

- `streamTransactionsAsync(request: StreamTransactionsRequest, observer: TransactionObserver)`

But this method should now be documented and enforced as gRPC-only.

## Request Model Split

Do not reuse `StreamTransactionsRequest` for JSON query streaming.

Introduce a dedicated request type for query streams, for example:

- `StreamQueryRequest`

Recommended minimum shape:

- `party`
- optional `templateId`

This mirrors the JSON `/v1/stream/query` semantics and avoids leaking ledger-update concepts like offsets into the query-stream API.

`StreamTransactionsRequest` should remain focused on ledger-update streaming and continue to carry:

- `party`
- `beginOffset`
- optional `endOffset`
- optional update filter details needed for gRPC update streams

## Transport Behavior

### JSON Transport

`JsonTransport` should:

- continue to support `queryContractsAsync(...)`
- move `/v1/stream/query` handling to a new `streamQueryAsync(...)`
- throw `NotSupportedError` from `streamTransactionsAsync(...)`

This makes the JSON transport honest about what it can and cannot do.

### gRPC Transport

`GrpcTransport` should:

- continue to support `queryContractsAsync(...)`
- continue to support `streamTransactionsAsync(...)` via ledger update streaming
- throw `NotSupportedError` from `streamQueryAsync(...)` for now

The recommended v1 behavior is to leave gRPC query streaming unsupported until we define exactly what “query stream” should mean on the gRPC side. That avoids inventing parity that the public API has not committed to yet.

## Service Registry Impact

The shared `CantonClient` should still expose both:

- `client.contracts`
- `client.events`

But capability expectations become:

- `client.contracts.streamQueryAsync(...)`
  - JSON: supported
  - gRPC: not supported in v1
- `client.events.streamTransactionsAsync(...)`
  - gRPC: supported
  - JSON: not supported

This is acceptable because the root client already exposes multiple services with different behavioral scope. The important requirement is that each method name honestly describes its semantics.

## Error Handling

Unsupported method and transport combinations should throw `NotSupportedError`.

Required cases:

- JSON `streamTransactionsAsync(...)`
- gRPC `streamQueryAsync(...)` in v1

Do not silently map one concept to the other.

## Testing

Add or update tests to prove the new boundary.

### Contracts Tests

Add coverage for:

- `ContractsClient.streamQueryAsync(...)`
- JSON transport calling `/v1/stream/query`
- gRPC transport rejecting `streamQueryAsync(...)`

### Events Tests

Add coverage for:

- gRPC `streamTransactionsAsync(...)` still streaming ledger updates
- JSON `streamTransactionsAsync(...)` throwing `NotSupportedError`

### Contract Tests

Shared contract tests should stop asserting stream parity between JSON and gRPC.

Instead:

- query parity remains under `ContractsClient`
- ledger-update streaming is tested as gRPC-only

## Migration

This change is small but breaking at the semantic level.

The intended migration path is:

1. move JSON uses of `events.streamTransactionsAsync(...)` to `contracts.streamQueryAsync(...)`
2. keep gRPC uses of `events.streamTransactionsAsync(...)` unchanged
3. update README examples and inline comments to reflect the split

## Rationale

This design is preferred because it fixes the conceptual bug with the smallest honest API change.

It preserves:

- the existing `EventsClient` role for ledger updates
- the existing `ContractsClient` role for contract queries
- the C#-style SDK surface with explicit methods and clear ownership

It avoids:

- hiding transport differences behind misleading names
- adding a whole new client for one JSON-only method
- forcing fake “shared stream” parity where none exists

## External Reference

Digital Asset’s JSON Ledger API reference explicitly distinguishes OpenAPI and AsyncAPI websocket access, which supports treating JSON query streaming as its own API shape instead of conflating it with gRPC ledger update streaming:

- https://docs.digitalasset.com/build/3.4/reference/json-api/openapi.html
